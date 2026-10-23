import { GroupJoinRequestStatus } from '../../services/im/types.js';
import { isDesktopMessageDisplayable, isDesktopMessageVisible } from '../../services/im/message-display.js';
import { messageClientId } from '../../services/im/message-cache.js';
import { GroupMessageEvent, MessageEvent, PrivateMessageEvent, StrangerMessageEvent, } from './message.js';
import { bindFriendMarkedReadNotice, bindGroupAdminNotices, bindGroupAvatarChangeNotice, bindGroupMarkedReadNotice, bindGroupMemberDecreaseNotices, bindGroupMemberIncreaseNotices, bindGroupNameChangeNotice, bindNoticeAccount, MessageUpdateNoticeEvent, MessageDeleteNoticeEvent, MessageBatchUpdateNoticeEvent, MessageListUpdateNoticeEvent, } from './notice.js';
import { getLogger } from '../../logger.js';
const logger = getLogger('Events:Assembler');
export class EventAssembler {
    account;
    hooks;
    platformUid;
    threadShortIds = new Map();
    emittedJoinRequestIds = new Set();
    joinRequestRefreshTask;
    generation = 0;
    cleared = false;
    constructor(account, hooks, platformUid) {
        this.account = account;
        this.hooks = hooks;
        this.platformUid = platformUid;
    }
    rememberConversation(threadId, conversationShortId) {
        if (threadId && conversationShortId)
            this.threadShortIds.set(threadId, conversationShortId);
    }
    resolveShortId(threadId, hint) {
        return hint || this.threadShortIds.get(threadId) || (/^\d+$/.test(threadId) ? threadId : undefined);
    }
    receiveMessage(inbound) {
        if (this.cleared)
            return;
        if (inbound.conversationType !== 1 && inbound.conversationType !== 2) {
            logger.warn('忽略未支持的会话类型: %s', inbound.conversationType);
            return;
        }
        this.rememberConversation(inbound.threadId, inbound.conversationShortId);
        if (this.hooks.acceptMessage?.(inbound) === false)
            return;
        const event = MessageEvent.fromInbound(inbound, this.account);
        if (event instanceof PrivateMessageEvent)
            this.account.rememberFriend(event.friend);
        else if (event instanceof StrangerMessageEvent)
            this.account.rememberStranger(event.stranger);
        else if (event instanceof GroupMessageEvent)
            this.account.rememberGroup(event.group);
        this.hooks.onMessage(event);
    }
    receiveNotice(notice) {
        if (this.cleared)
            return;
        if (notice.type === 'im.command') {
            if (!this.account.applyConversationCommand(notice.messageType, notice.content, notice.conversationId, notice.raw)) {
                this.account.applySettingCommand(notice.messageType, notice.content, notice.raw);
            }
        }
        if (notice.type === 'message.delete') {
            this.account.applyMessageDeletionCommand(notice.conversationId, notice.serverMessageId, notice.raw);
            return;
        }
        if (notice.type === 'message.recall') {
            const target = this.account.markCachedMessageRecalled(notice.conversationId, notice);
            if (target)
                notice = { ...notice, serverMessageId: target.msgId,
                    ...(target.clientMessageId ? { clientMessageId: target.clientMessageId } : {}) };
        }
        if (notice.type === 'friend.add-request') {
            const applicantUid = this.isSelfUid(notice.applicantUid)
                ? [notice.fromUid, notice.toUid].find((uid) => Boolean(uid && !this.isSelfUid(uid)))
                : notice.applicantUid;
            if (applicantUid)
                this.hooks.onNotice?.(bindNoticeAccount({ ...notice, applicantUid }, this.account));
            return;
        }
        if (notice.type === 'group.join-request') {
            this.scheduleJoinRequestRefresh(notice);
            return;
        }
        if (notice.type === 'group.member-increase') {
            const group = this.bindNoticeGroup(notice.conversationId, notice.conversationShortId);
            for (const event of bindGroupMemberIncreaseNotices(notice, this.account, group)) {
                this.hooks.onNotice?.(event);
            }
            return;
        }
        if (notice.type === 'group.member-decrease') {
            const group = this.bindNoticeGroup(notice.conversationId, notice.conversationShortId);
            for (const event of bindGroupMemberDecreaseNotices(notice, this.account, group)) {
                this.hooks.onNotice?.(event);
            }
            return;
        }
        if (notice.type === 'group.admin') {
            const group = this.bindNoticeGroup(notice.conversationId, notice.conversationShortId);
            for (const event of bindGroupAdminNotices(notice, this.account, group)) {
                this.hooks.onNotice?.(event);
            }
            return;
        }
        if (notice.type === 'group.name-change') {
            const group = this.bindNoticeGroup(notice.conversationId, notice.conversationShortId);
            this.hooks.onNotice?.(bindGroupNameChangeNotice(notice, this.account, group));
            return;
        }
        if (notice.type === 'group.avatar-change') {
            const group = this.bindNoticeGroup(notice.conversationId, notice.conversationShortId);
            this.hooks.onNotice?.(bindGroupAvatarChangeNotice(notice, this.account, group));
            return;
        }
        if (notice.type === 'conversation.read') {
            if (notice.readerUid && !this.account.applyParticipantReadIndex(notice.conversationId, notice.readerUid, notice.readMessageIndex))
                return;
            this.receiveMarkedReadNotice(notice);
            return;
        }
        if ((notice.type === 'friend.increase' || notice.type === 'friend.decrease') &&
            this.isSelfUid(notice.peerUid)) {
            const peerUid = [notice.fromUid, notice.toUid].find((uid) => Boolean(uid && !this.isSelfUid(uid)));
            if (peerUid)
                notice = { ...notice, peerUid };
        }
        const event = bindNoticeAccount(notice, this.account);
        if (event.type === 'friend.decrease')
            this.account.forgetFriend(event.peerUid);
        this.hooks.onNotice?.(event);
    }
    receiveMessageUpdate(inbound, message) {
        if (this.cleared || !isDesktopMessageDisplayable(message))
            return;
        this.hooks.onNotice?.(new MessageUpdateNoticeEvent(this.account, inbound.conversationType, message, inbound.raw));
    }
    receiveMessageListUpdate(messages) {
        if (this.cleared)
            return;
        const visible = messages.filter(message => isDesktopMessageVisible(message));
        if (!visible.length)
            return;
        this.hooks.onNotice?.(new MessageListUpdateNoticeEvent(this.account, visible.filter(message => !!message.content)));
    }
    receiveMessageDelete(message, raw) {
        if (this.cleared || !messageClientId(message) || !message.content)
            return;
        const conversationType = message.conversationType ?? this.account.cachedConversation(message.threadId)?.conversationType ?? 0;
        this.hooks.onNotice?.(new MessageDeleteNoticeEvent(this.account, conversationType, message, raw));
    }
    receiveMessageBatch(messages, deletedClientMessageIds = [], raw = {}, updatedConversationIds = []) {
        if (this.cleared || (!messages.length && !deletedClientMessageIds.length && !updatedConversationIds.length))
            return;
        const grouped = new Map();
        for (const id of updatedConversationIds)
            grouped.set(id, new Map());
        for (const message of messages) {
            let conversation = grouped.get(message.threadId);
            if (!conversation)
                grouped.set(message.threadId, conversation = new Map());
            conversation.set(messageClientId(message), message);
        }
        const updates = [];
        for (const [id, messagesByClient] of grouped) {
            const conversation = this.account.cachedConversation(id);
            if (!conversation)
                continue;
            updates.push({ conversation, messages: [...messagesByClient.values()].filter(message => isDesktopMessageDisplayable(message)) });
        }
        this.hooks.onNotice?.(new MessageBatchUpdateNoticeEvent(this.account, updates, deletedClientMessageIds, raw));
    }
    clear() {
        this.cleared = true;
        this.generation += 1;
        this.threadShortIds.clear();
        this.emittedJoinRequestIds.clear();
        delete this.joinRequestRefreshTask;
    }
    bindNoticeGroup(conversationId, conversationShortId) {
        const group = this.account.bindGroup(conversationId || conversationShortId, conversationShortId);
        this.account.rememberGroup(group);
        return group;
    }
    isSelfUid(uid) {
        return uid === this.platformUid || uid === this.account.uid || uid === this.account.imUid;
    }
    receiveMarkedReadNotice(notice) {
        if (notice.conversationType === 2) {
            const group = this.bindNoticeGroup(notice.conversationId, this.resolveShortId(notice.conversationId) ?? notice.conversationId);
            this.hooks.onNotice?.(bindGroupMarkedReadNotice(notice, this.account, group));
            return;
        }
        if (notice.conversationType !== 1) {
            this.hooks.onNotice?.(bindNoticeAccount({
                type: 'im.command',
                conversationId: notice.conversationId,
                conversationType: notice.conversationType,
                messageType: 0,
                content: 'unsupported mark-read conversation type',
                raw: notice.raw,
            }, this.account));
            return;
        }
        const cached = this.account.cachedFriendByThreadId(notice.conversationId);
        const peerUid = cached?.uid ?? this.privatePeerUid(notice.conversationId);
        if (!peerUid) {
            this.hooks.onNotice?.(bindNoticeAccount({
                type: 'im.command',
                conversationId: notice.conversationId,
                conversationType: notice.conversationType,
                messageType: 0,
                content: 'unable to resolve mark-read private peer',
                raw: notice.raw,
            }, this.account));
            return;
        }
        const friend = cached ?? this.account.bindFriend(peerUid, notice.conversationId, this.resolveShortId(notice.conversationId) ?? '');
        this.account.rememberFriend(friend);
        this.hooks.onNotice?.(bindFriendMarkedReadNotice(notice, this.account, friend));
    }
    privatePeerUid(threadId) {
        const participants = threadId.split(':').slice(2).filter(Boolean);
        if (participants.length === 0)
            return undefined;
        const ownIds = new Set([
            this.account.imUid,
            this.account.uid,
            this.platformUid,
        ].filter((value) => Boolean(value)));
        return participants.find((uid) => !ownIds.has(uid)) ?? participants.at(-1);
    }
    scheduleJoinRequestRefresh(signal) {
        const previous = this.joinRequestRefreshTask ?? Promise.resolve();
        const generation = this.generation;
        const task = previous.catch(() => undefined).then(() => this.refreshJoinRequests(signal, generation));
        this.joinRequestRefreshTask = task;
        void task.catch((error) => {
            logger.warn('刷新入群申请失败: %s', error instanceof Error ? error.message : error);
        }).finally(() => {
            if (this.joinRequestRefreshTask === task)
                delete this.joinRequestRefreshTask;
        });
    }
    async refreshJoinRequests(signal, generation) {
        const response = await this.account.getGroupJoinRequestData();
        if (generation !== this.generation)
            return;
        if (response.statusCode !== 0) {
            throw new Error(`status=${response.statusCode}${response.statusMsg ? ` ${response.statusMsg}` : ''}`);
        }
        for (const data of response.requests) {
            if (data.status !== GroupJoinRequestStatus.PENDING)
                continue;
            if (signal.requestId && data.requestId !== signal.requestId)
                continue;
            if (this.emittedJoinRequestIds.has(data.requestId))
                continue;
            const signalMatchesGroup = signal.conversationShortId === data.groupShortId && /^\d+$/.test(signal.conversationId);
            const group = this.account.bindGroup(signalMatchesGroup ? signal.conversationId : data.groupShortId, data.groupShortId);
            this.account.rememberGroup(group);
            const request = group.ensureJoinRequest(data);
            this.emittedJoinRequestIds.add(data.requestId);
            this.hooks.onRequest?.(request);
        }
    }
}
//# sourceMappingURL=assembler.js.map