import { isMessageDelivered } from '../../services/im/content.js';
import { equalConversationReadSummaries } from '../../services/im/read-state.js';
import { filterReadReceipt } from '../../services/im/user-settings.js';
import { Contact } from '../../base/contact.js';
import { SendMessageError } from '../errors.js';
import { logSendResult } from '../messaging/reply-log.js';
import { messageBrief } from '../messaging/message.js';
import { messageClientId } from '../../services/im/message-cache.js';
function compareHistoryMessage(left, right) {
    const leftIndex = left.indexInConversationV2 || left.indexInConversation;
    const rightIndex = right.indexInConversationV2 || right.indexInConversation;
    if (leftIndex && rightIndex) {
        try {
            const delta = BigInt(leftIndex) - BigInt(rightIndex);
            if (delta !== 0n)
                return delta < 0n ? -1 : 1;
        }
        catch {
        }
    }
    return left.createTime - right.createTime;
}
export class ChatContact extends Contact {
    constructor(id, address, account) {
        super(account, id, address);
    }
    async sendMsg(message) {
        const sender = this.account.outbound;
        const connection = this.account.im;
        this.assertCurrentConnection(connection);
        const address = await this.prepareAddress();
        this.assertCurrentConnection(connection);
        if (!address.conversationShortId) {
            throw new SendMessageError({ statusCode: -1, statusMsg: 'missing conversationShortId', clientMessageId: '' });
        }
        const response = logSendResult(await sender.sendMessage({ ...address, message }), this.logTarget, messageBrief(message), this.account.logger);
        if (!isMessageDelivered(response))
            throw new SendMessageError(response);
        return response;
    }
    async getHistory(options = {}) {
        const connection = this.account.im;
        const address = await this.prepareAddress();
        this.assertCurrentConnection(connection);
        const response = await connection.getMessages({
            threadId: address.threadId,
            conversationShortId: address.conversationShortId,
            conversationType: address.conversationType,
            inboxType: address.inboxType,
            ...(options.cursor != null ? { cursor: options.cursor } : {}),
            ...(options.count != null ? { count: options.count } : {}),
            ...(options.direction != null ? { direction: options.direction } : {}),
            ...(options.includeCurrent != null ? { includeCurrent: options.includeCurrent } : {}),
        });
        this.assertCurrentConnection(connection);
        const messages = [...response.messages].sort(compareHistoryMessage);
        if (response.statusCode === 0)
            this.account.cacheMessages(response.messages);
        return {
            ...response,
            messages,
        };
    }
    getCachedHistory(count = 50) {
        return this.account.cachedMessages(this.threadId, count);
    }
    getCachedMessage(serverMessageId) {
        return this.account.cachedMessage(this.threadId, serverMessageId, 'server');
    }
    getCachedMessageByClientId(clientMessageId) {
        return this.account.cachedMessage(this.threadId, clientMessageId, 'client');
    }
    modifyMessageLocalExt(clientMessageId, ext) {
        this.account.modifyCachedMessageLocalExt(this.threadId, clientMessageId, ext);
    }
    async forwardMsg(message) {
        if (message.account !== this.account) {
            throw new Error('不能跨账号转发消息；请使用来源事件的 account 选择联系人');
        }
        const serverMessageId = message.serverMessageId;
        if (!serverMessageId)
            throw new Error('MessageEvent: no server message id');
        const sender = this.account.outbound;
        const connection = this.account.im;
        this.assertCurrentConnection(connection);
        const address = await this.prepareAddress();
        this.assertCurrentConnection(connection);
        const response = logSendResult(await sender.forwardMessage({
            ...address,
            content: message.rawContent,
            messageType: message.messageType,
            serverMessageId,
        }), this.logTarget, `[转发消息] ${message.text}`, this.account.logger);
        if (!isMessageDelivered(response))
            throw new SendMessageError(response);
        return response;
    }
    async getSharedWorkDetails(workIds) {
        const address = await this.prepareAddress();
        return this.account.im.getSharedWorkDetails(address.conversationShortId, workIds);
    }
    async getSharedCommentStatuses(commentIds) {
        const address = await this.prepareAddress();
        return this.account.im.getSharedCommentStatuses(address.conversationShortId, commentIds);
    }
    async recallMsg(serverMessageId) {
        const sender = this.account.outbound;
        const connection = sender.imService;
        const clientMessageId = this.account.cachedMessage(this.threadId, serverMessageId, 'server')?.clientMessageId;
        const address = await this.prepareAddress();
        this.assertCurrentConnection(connection);
        const result = await sender.recall({
            ...address,
            serverMessageId,
        });
        this.assertCurrentConnection(connection);
        if ((result.statusCode === 0 || result.statusCode === 200) && clientMessageId) {
            this.account.markCachedMessageRecalled(this.threadId, { clientMessageId });
        }
        return result;
    }
    async deleteMsg(identifier) {
        const connection = this.account.im;
        const conversation = this.account.cachedConversation(this.threadId);
        if (!conversation)
            throw new Error('删除消息失败：本地会话不存在，请先同步会话');
        if (conversation.conversationType !== 1 && conversation.conversationType !== 2)
            throw new Error('删除消息失败：尚未支持该会话类型');
        const target = this.resolveDeleteTarget(identifier);
        if (!target)
            throw new Error('删除消息失败：本地消息不存在，请先同步历史');
        const clientMessageId = messageClientId(target);
        if (!target.msgId || target.msgId === '0') {
            this.account.deleteCachedMessageByClientId(this.threadId, clientMessageId, true);
            return { statusCode: 0, statusMsg: '' };
        }
        const result = await connection.deleteMessage({
            threadId: this.threadId,
            conversationShortId: conversation.conversationShortId,
            conversationType: conversation.conversationType,
            inboxType: conversation.inboxType ?? 0,
            serverMessageId: target.msgId,
        });
        this.assertCurrentConnection(connection);
        if (result.statusCode === 0)
            this.account.deleteCachedMessageByClientId(this.threadId, clientMessageId, true);
        return result;
    }
    deleteLocalMsg(identifier) {
        if (!this.account.cachedConversation(this.threadId))
            return false;
        const target = this.resolveDeleteTarget(identifier);
        return target ? this.account.deleteCachedMessageByClientId(this.threadId, messageClientId(target), false) : false;
    }
    resolveDeleteTarget(identifier) {
        if (typeof identifier !== 'string')
            return this.account.cachedMessage(this.threadId, identifier.clientMessageId, 'client');
        const target = this.account.cachedMessage(this.threadId, identifier, 'server');
        const clientId = target && messageClientId(target);
        return clientId ? this.account.cachedMessage(this.threadId, clientId, 'client') : undefined;
    }
    async markRead(marker) {
        return this.account.im.markConversationRead({ ...await this.prepareAddress(), ...marker });
    }
    async getReadState() {
        if (!this.account.online)
            throw new Error('账号未上线，请先完成登录');
        const address = this.resolveAddress();
        if (!address.conversationShortId)
            throw new Error('尚无可查询的会话，请先建立会话');
        return this.account.readConversationState(address);
    }
    getCachedReadState() {
        return this.account.cachedReadCursors(this.threadId);
    }
    getCachedReadSummary() {
        return this.account.cachedReadSummary(this.threadId);
    }
    async getReadReceipt(refreshPrivacy = false) {
        if (!this.account.online)
            throw new Error('账号未上线，请先完成登录');
        const raw = this.getCachedReadSummary();
        if (!raw)
            return undefined;
        const connection = this.account.im;
        if (raw.conversationType !== 1 && raw.conversationType !== 2)
            throw new Error('已读摘要缺少有效的会话类型');
        const privacy = await this.account.getMessageReadPrivacy([{
                serverMessageId: raw.serverMessageId, conversationId: raw.conversationId,
                conversationShortId: raw.conversationShortId, conversationType: raw.conversationType,
                createTime: Number(raw.createTime),
            }], refreshPrivacy);
        this.assertCurrentConnection(connection);
        const current = this.getCachedReadSummary();
        if (!current || !equalConversationReadSummaries(raw, current))
            throw new Error('本地已读摘要已变化，请重新查询');
        return { raw, privacy, ...filterReadReceipt(raw, privacy) };
    }
    async refresh() {
        const result = await this.account.refreshContactAddresses([await this.prepareAddress()]);
        if (result.statusCode !== 0) {
            throw new Error(`刷新会话失败: status=${result.statusCode} ${result.statusMsg}`.trim());
        }
        return this;
    }
    async deleteConversation() {
        const connection = this.account.im;
        this.assertCurrentConnection(connection);
        const conversation = this.account.cachedConversation(this.threadId);
        if (!conversation)
            throw new Error(`本地会话不存在: ${this.threadId}`);
        const conversationType = conversation.conversationType;
        if (conversationType !== 1 && conversationType !== 2)
            throw new Error(`不支持的会话类型: ${conversationType}`);
        const lastMessageIndex = this.account.getConversationDeletionBoundary(this.threadId);
        const result = await connection.deleteConversation({ threadId: conversation.conversationId,
            conversationShortId: conversation.conversationShortId, conversationType,
            inboxType: conversation.inboxType ?? 0, lastMessageIndex });
        this.assertCurrentConnection(connection);
        if (result.statusCode === 0)
            this.account.applyConversationDeletion(this.threadId, conversationType, lastMessageIndex);
        return result;
    }
    async reactMsg(serverMessageId, emoji, enabled = true) {
        const operatorUid = this.account.im.myUid || this.account.imUid || this.account.uid;
        if (!operatorUid)
            throw new Error('当前账号缺少可用的 IM uid');
        return this.account.im.modifyMessageReaction({
            ...await this.prepareAddress(),
            serverMessageId,
            emoji,
            enabled,
            operatorUid,
        });
    }
    async enterConversation() {
        return this.account.im.enterConversation(await this.prepareAddress());
    }
    async setMute(mute = true) {
        const connection = this.account.im;
        const address = await this.prepareAddress();
        this.assertCurrentConnection(connection);
        const result = await connection.setConversationSettings({ ...address, mute });
        this.assertCurrentConnection(connection);
        return result;
    }
    async setPinned(pinned = true) {
        const connection = this.account.im;
        const address = await this.prepareAddress();
        this.assertCurrentConnection(connection);
        const result = await connection.setConversationSettings({ ...address, pinned });
        this.assertCurrentConnection(connection);
        return result;
    }
    async prepareAddress() {
        return this.resolveAddress();
    }
    assertCurrentConnection(connection) {
        if (!this.account.online || this.account.im !== connection) {
            throw new Error('账号连接已变化，操作结果不再适用于当前登录；请先核对远端状态');
        }
    }
    resolveAddress() {
        return {
            ...this.address,
            conversationShortId: this.account.resolveShortId(this.address.threadId, this.address.conversationShortId) ?? '',
        };
    }
}
//# sourceMappingURL=chat-contact.js.map