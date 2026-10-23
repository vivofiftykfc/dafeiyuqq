import { getLogger } from '../../logger.js';
const logger = getLogger('Runtime:Connection');
import { inboundFromThread } from '../raw/inbound-message.js';
import { ImWebSocketReceiver } from './adapters/frontier-websocket.js';
const DEFAULT_RECEIVER_FACTORY = (options) => new ImWebSocketReceiver(options);
export class ConnectionManager {
    options;
    createReceiver;
    receiver;
    generation = 0;
    startTask;
    stopTask;
    running = false;
    hasOpened = false;
    needsCatchUp = false;
    recoveryEpoch = 0;
    checkpoints = new Map();
    get logger() {
        return this.options.logger ?? logger;
    }
    constructor(options, createReceiver = DEFAULT_RECEIVER_FACTORY) {
        this.options = options;
        this.createReceiver = createReceiver;
    }
    get connected() {
        return this.receiver?.isConnected ?? false;
    }
    start() {
        if (this.running)
            return Promise.resolve();
        if (this.startTask)
            return this.startTask;
        const generation = ++this.generation;
        const task = this.performStart(generation);
        this.startTask = task;
        void task.finally(() => {
            if (this.startTask === task)
                delete this.startTask;
        }).catch(() => undefined);
        return task;
    }
    stop() {
        if (this.stopTask)
            return this.stopTask;
        const task = this.performStop();
        this.stopTask = task;
        void task.finally(() => {
            if (this.stopTask === task)
                delete this.stopTask;
        }).catch(() => undefined);
        return task;
    }
    async performStart(generation) {
        await this.activate(this.createDesktopReceiver(generation), generation);
    }
    async performStop() {
        this.generation += 1;
        this.running = false;
        const receiver = this.detachReceiver();
        await receiver?.stop();
        const startTask = this.startTask;
        if (startTask)
            await startTask.catch(() => undefined);
        const lateReceiver = this.detachReceiver();
        if (lateReceiver && lateReceiver !== receiver)
            await lateReceiver.stop();
        this.hasOpened = false;
        this.needsCatchUp = false;
        this.recoveryEpoch++;
        this.checkpoints.clear();
    }
    createDesktopReceiver(generation) {
        return this.createReceiver({
            deviceId: this.options.deviceId,
            cookies: this.options.sessionCookies,
            ...(this.options.cursorStore ? { cursorStore: this.options.cursorStore } : {}),
            ...(this.options.installId ? { installId: this.options.installId } : {}),
            userAgent: this.options.deviceUserAgent,
            onInbound: (message) => { if (generation === this.generation)
                this.receiveInbound(message); },
            onNotice: (notice) => { if (generation === this.generation)
                this.options.onNotice?.(notice); },
            onRaw: (cmd, response) => { if (generation === this.generation)
                this.options.onRaw?.(cmd, response); },
            onOpen: () => { if (generation === this.generation)
                this.handleOpen(); },
            onClose: (code, reason) => { if (generation === this.generation)
                this.options.onClose?.(code, reason); },
            onReconnecting: (payload) => { if (generation === this.generation)
                this.handleReconnecting(payload); },
        });
    }
    async activate(receiver, generation) {
        this.receiver = receiver;
        await receiver.start();
        try {
            this.assertCurrent(generation);
        }
        catch (error) {
            await receiver.stop();
            if (this.receiver === receiver)
                delete this.receiver;
            throw error;
        }
        this.running = true;
    }
    assertCurrent(generation) {
        if (generation !== this.generation)
            throw new Error('connection start cancelled');
    }
    detachReceiver() {
        const receiver = this.receiver;
        delete this.receiver;
        return receiver;
    }
    receiveInbound(message) {
        this.advanceCheckpoint(message.threadId, this.messageIndex(message));
        this.options.onInbound(message);
    }
    handleReconnecting(payload) {
        this.needsCatchUp = true;
        this.recoveryEpoch++;
        this.options.onReconnecting?.(payload);
    }
    handleOpen() {
        const generation = this.generation;
        const reconnect = this.hasOpened && this.needsCatchUp;
        this.hasOpened = true;
        this.options.onOpen?.();
        if (generation !== this.generation)
            return;
        if (reconnect) {
            this.needsCatchUp = false;
            void this.recoverMissedMessages().catch((error) => {
                this.logger.warn('断线消息补拉失败: %s', error instanceof Error ? error.message : error);
            });
        }
        else if (this.checkpoints.size === 0) {
            void this.seedCheckpoints().catch((error) => {
                this.logger.warn('会话游标初始化失败: %s', error instanceof Error ? error.message : error);
            });
        }
    }
    async recoverMissedMessages() {
        const generation = this.generation;
        const epoch = ++this.recoveryEpoch;
        const current = () => generation === this.generation && epoch === this.recoveryEpoch;
        const listed = await this.options.imService.listThreads({ count: 50 });
        if (!current())
            return;
        if (listed.statusCode !== 0)
            throw new Error(`${listed.statusCode} ${listed.statusMsg}`.trim());
        this.options.onHistoryBatch([], listed.conversations);
        for (const thread of listed.threads) {
            if (!current())
                return;
            const latest = thread.lastMessage;
            if (!latest)
                continue;
            const known = this.checkpoints.get(thread.threadId);
            const latestIndex = latest.indexInConversationV2 || latest.indexInConversation;
            const isNewConversation = known == null;
            if (!isNewConversation && latestIndex && compareDecimal(latestIndex, known) <= 0)
                continue;
            const history = await this.options.imService.getMessages({
                threadId: thread.threadId,
                ...(thread.conversationShortId ? { conversationShortId: thread.conversationShortId } : {}),
                ...(thread.conversationType != null ? { conversationType: thread.conversationType } : {}),
                ...(thread.inboxType != null ? { inboxType: thread.inboxType } : {}),
                count: 50,
            });
            if (!current())
                return;
            if (history.statusCode !== 0)
                continue;
            const incoming = [];
            for (const message of history.messages) {
                const inbound = inboundFromThread(thread, message, message.inboxType ?? thread.inboxType);
                if (inbound)
                    incoming.push(inbound);
            }
            this.options.onHistoryBatch(incoming, []);
            if (!current())
                return;
            for (const message of incoming)
                this.advanceCheckpoint(message.threadId, this.messageIndex(message));
            this.advanceCheckpoint(thread.threadId, latestIndex);
        }
    }
    async seedCheckpoints() {
        const generation = this.generation;
        const epoch = this.recoveryEpoch;
        const listed = await this.options.imService.listThreads({ count: 50 });
        if (generation !== this.generation || epoch !== this.recoveryEpoch)
            return;
        if (listed.statusCode !== 0)
            return;
        for (const thread of listed.threads) {
            const latest = thread.lastMessage;
            this.advanceCheckpoint(thread.threadId, latest?.indexInConversationV2 || latest?.indexInConversation);
        }
    }
    messageIndex(message) {
        return message.indexInConversationV2 || message.indexInConversation;
    }
    advanceCheckpoint(threadId, index) {
        if (!index)
            return;
        const current = this.checkpoints.get(threadId);
        if (!current || compareDecimal(index, current) > 0)
            this.checkpoints.set(threadId, index);
    }
}
function compareDecimal(left, right) {
    const normalizedLeft = left.replace(/^0+(?=\d)/, '');
    const normalizedRight = right.replace(/^0+(?=\d)/, '');
    if (normalizedLeft.length !== normalizedRight.length) {
        return normalizedLeft.length > normalizedRight.length ? 1 : -1;
    }
    return normalizedLeft === normalizedRight ? 0 : normalizedLeft > normalizedRight ? 1 : -1;
}
//# sourceMappingURL=connection-manager.js.map