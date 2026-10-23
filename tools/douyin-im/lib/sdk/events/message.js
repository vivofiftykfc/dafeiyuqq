import { parseMessageContent } from '../../services/im/content.js';
import { BaseEvent } from '../../base/event.js';
import { SharedComment, SharedWork } from '../content/shared-content.js';
export class MessageEvent extends BaseEvent {
    contact;
    postType = 'message';
    threadId;
    conversationShortId;
    conversationType;
    inboxType;
    senderUid;
    senderSecUid;
    serverMessageId;
    clientMessageId;
    indexInConversation;
    indexInConversationV2;
    createTime;
    status;
    version;
    orderInConversation;
    ext;
    referenceInfo;
    text;
    content;
    rawContent;
    messageType;
    mentions;
    isMentionMe;
    work;
    comment;
    constructor(inbound, account, contact) {
        super(account, inbound.raw, eventTime(inbound));
        this.contact = contact;
        this.threadId = inbound.threadId;
        this.conversationShortId = inbound.conversationShortId;
        this.conversationType = inbound.conversationType === 2 ? 2 : 1;
        this.inboxType = inbound.inboxType ?? 0;
        this.senderUid = inbound.senderUid;
        if (inbound.senderSecUid)
            this.senderSecUid = inbound.senderSecUid;
        if (inbound.serverMessageId)
            this.serverMessageId = inbound.serverMessageId;
        if (inbound.clientMessageId)
            this.clientMessageId = inbound.clientMessageId;
        if (inbound.indexInConversation)
            this.indexInConversation = inbound.indexInConversation;
        if (inbound.indexInConversationV2)
            this.indexInConversationV2 = inbound.indexInConversationV2;
        if (inbound.createTime)
            this.createTime = inbound.createTime;
        if (inbound.status !== undefined)
            this.status = inbound.status;
        if (inbound.version)
            this.version = inbound.version;
        if (inbound.orderInConversation)
            this.orderInConversation = inbound.orderInConversation;
        this.ext = inbound.ext ?? Object.freeze({});
        if (inbound.referenceInfo)
            this.referenceInfo = inbound.referenceInfo;
        this.text = inbound.text;
        this.content = parseMessageContent(inbound.rawContent, inbound.messageType);
        this.rawContent = inbound.rawContent;
        this.messageType = inbound.messageType;
        this.mentions = Object.freeze(this.content.kind === 'text' ? [...(this.content.mentions ?? [])] : []);
        const ownUids = new Set([account.imUid, account.uid].filter((uid) => Boolean(uid)));
        this.isMentionMe = this.mentions.some((mention) => ownUids.has(mention.uid));
        if (this.content.kind === 'share') {
            this.work = SharedWork.bind(this.content.share.itemId, {
                title: this.content.share.title,
                authorUid: this.content.share.authorUid,
                authorSecUid: this.content.share.authorSecUid,
            }, (ids) => this.contact.getSharedWorkDetails(ids), account);
            this.comment = undefined;
        }
        else if (this.content.kind === 'comment') {
            this.work = SharedWork.bind(this.content.comment.workId, {}, (ids) => this.contact.getSharedWorkDetails(ids), account);
            this.comment = SharedComment.bind(this.content.comment.commentId, {
                text: this.content.text,
                authorName: this.content.comment.authorName,
                coverUrl: this.content.comment.coverUrl,
            }, (ids) => this.contact.getSharedCommentStatuses(ids), account);
        }
        else {
            this.work = undefined;
            this.comment = undefined;
        }
    }
    get isGroup() {
        return this.conversationType === 2;
    }
    static fromInbound(inbound, account) {
        if (inbound.conversationType === 2 || /^\d+$/.test(inbound.threadId)) {
            return GroupMessageEvent.fromInbound(inbound, account);
        }
        const conversation = account.cachedConversation(inbound.threadId);
        const isStranger = conversation?.isInStrangerBox
            ?? (!account.cachedFriend(inbound.senderUid)
                && account.cachedStranger(inbound.senderUid)?.threadId === inbound.threadId);
        if (isStranger)
            return StrangerMessageEvent.fromInbound(inbound, account);
        return PrivateMessageEvent.fromInbound(inbound, account);
    }
    reply(message) {
        return this.contact.sendMsg(message);
    }
    getReadPrivacy(refresh = false) {
        if (!this.serverMessageId || !this.createTime || !/^\d+$/.test(this.createTime)) {
            throw new Error('消息缺少 serverMessageId 或原始 createTime');
        }
        return this.account.getMessageReadPrivacy([{
                serverMessageId: this.serverMessageId,
                conversationId: this.threadId,
                conversationShortId: this.conversationShortId,
                conversationType: this.conversationType,
                createTime: Number(this.createTime),
            }], refresh);
    }
    forwardTo(target) {
        return target.forwardMsg(this);
    }
    quote(text) {
        if (!this.serverMessageId)
            throw new Error('MessageEvent: no server message id');
        return this.reply({
            type: 'reply', text,
            referencedMessageId: this.serverMessageId,
            referencedMessageType: this.messageType,
            referencedUid: this.senderUid,
            ...(this.senderSecUid ? { referencedSecUid: this.senderSecUid } : {}),
            referencedText: this.text,
        });
    }
    recall() {
        if (!this.serverMessageId)
            throw new Error('MessageEvent: no server message id');
        return this.contact.recallMsg(this.serverMessageId);
    }
    delete() {
        if (this.clientMessageId)
            return this.contact.deleteMsg({ clientMessageId: this.clientMessageId });
        if (!this.serverMessageId)
            throw new Error('MessageEvent: no server message id');
        return this.contact.deleteMsg(this.serverMessageId);
    }
    deleteLocal() {
        if (this.clientMessageId)
            return this.contact.deleteLocalMsg({ clientMessageId: this.clientMessageId });
        if (!this.serverMessageId)
            throw new Error('MessageEvent: no server message id');
        return this.contact.deleteLocalMsg(this.serverMessageId);
    }
    react(emoji, enabled = true) {
        if (!this.serverMessageId)
            throw new Error('MessageEvent: no server message id');
        return this.contact.reactMsg(this.serverMessageId, emoji, enabled);
    }
    markRead() {
        if (!this.serverMessageId)
            throw new Error('MessageEvent: no server message id');
        return this.contact.markRead({
            serverMessageId: this.serverMessageId,
            ...(this.indexInConversation ? { indexInConversation: this.indexInConversation } : {}),
            ...(this.indexInConversationV2 ? { indexInConversationV2: this.indexInConversationV2 } : {}),
            readBadgeCount: 1,
        });
    }
}
export class PrivateMessageEvent extends MessageEvent {
    type = 'message.private';
    chatType = 'private';
    friend;
    constructor(inbound, account, friend) {
        super(inbound, account, friend);
        this.friend = friend;
    }
    static fromInbound(inbound, account) {
        const friend = account.bindFriend(inbound.senderUid, inbound.threadId, inbound.conversationShortId, inbound.senderSecUid ? { secUid: inbound.senderSecUid } : {});
        return new PrivateMessageEvent(inbound, account, friend);
    }
}
export class GroupMessageEvent extends MessageEvent {
    type = 'message.group';
    chatType = 'group';
    group;
    member;
    constructor(inbound, account, group) {
        super(inbound, account, group);
        this.group = group;
        this.member = group.ensureMember({
            uid: inbound.senderUid,
            role: group.pickMember(inbound.senderUid)?.role ?? 0,
            ...(inbound.senderSecUid ? { secUid: inbound.senderSecUid } : {}),
        });
    }
    static fromInbound(inbound, account) {
        const group = account.bindGroup(inbound.threadId, inbound.conversationShortId || inbound.threadId, {
            inboxType: inbound.inboxType ?? 0,
        });
        return new GroupMessageEvent(inbound, account, group);
    }
}
export class StrangerMessageEvent extends MessageEvent {
    type = 'message.stranger';
    chatType = 'stranger';
    stranger;
    constructor(inbound, account, stranger) {
        super(inbound, account, stranger);
        this.stranger = stranger;
    }
    static fromInbound(inbound, account) {
        const stranger = account.bindStranger(inbound.senderUid, inbound.threadId, inbound.conversationShortId, inbound.senderSecUid ? { secUid: inbound.senderSecUid } : {});
        return new StrangerMessageEvent(inbound, account, stranger);
    }
}
function eventTime(inbound) {
    const value = inbound.createTime ??
        inbound.raw['createTime'] ?? inbound.raw['create_time'] ?? inbound.raw['timestamp'];
    return typeof value === 'number' || typeof value === 'string' ? value : undefined;
}
//# sourceMappingURL=message.js.map