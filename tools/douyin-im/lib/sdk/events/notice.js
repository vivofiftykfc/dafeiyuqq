import { BaseEvent } from '../../base/event.js';
import { MemberRole } from '../contacts/member.js';
export class NoticeEvent extends BaseEvent {
    postType = 'notice';
}
export class ConversationReadSummaryNoticeEvent extends NoticeEvent {
    type = 'conversation.read-summary';
    summaries;
    constructor(account, summaries) {
        super(account, {});
        this.summaries = Object.freeze(structuredClone(summaries).map(summary => Object.freeze({
            ...summary, readUsers: Object.freeze(summary.readUsers.map(row => Object.freeze(row))),
        })));
    }
}
export class MessageListUpdateNoticeEvent extends NoticeEvent {
    type = 'message.list-update';
    messages;
    constructor(account, messages, raw = {}) {
        super(account, raw, eventTime(raw));
        this.messages = Object.freeze(messages.map(message => Object.freeze(structuredClone(message))));
    }
}
export class MessageBatchUpdateNoticeEvent extends NoticeEvent {
    type = 'message.batch-update';
    updates;
    deletedClientMessageIds;
    constructor(account, updates, deletedClientMessageIds, raw) {
        super(account, raw, eventTime(raw));
        this.updates = Object.freeze(structuredClone(updates).map(update => Object.freeze({
            conversation: Object.freeze(update.conversation), messages: Object.freeze(update.messages.map(message => Object.freeze(message))),
        })));
        this.deletedClientMessageIds = Object.freeze([...deletedClientMessageIds]);
    }
}
export class ConversationNoticeEvent extends NoticeEvent {
    conversationId;
    conversationType;
    constructor(account, conversationId, conversationType, raw) {
        super(account, raw, eventTime(raw));
        this.conversationId = conversationId;
        this.conversationType = conversationType;
    }
}
export class ConversationUpdateNoticeEvent extends ConversationNoticeEvent {
    type = 'conversation.update';
    conversation;
    constructor(notice, account) {
        super(account, notice.conversationId, notice.conversationType, notice.raw);
        const conversation = account.cachedConversation(notice.conversationId);
        this.conversation = conversation && Object.freeze(structuredClone(conversation));
    }
}
export class ConversationMinIndexNoticeEvent extends ConversationNoticeEvent {
    type = 'conversation.min-index';
    minIndex;
    constructor(notice, account) {
        super(account, notice.conversationId, notice.conversationType, notice.raw);
        this.minIndex = notice.minIndex;
    }
}
export class ConversationDeleteNoticeEvent extends ConversationNoticeEvent {
    type = 'conversation.delete';
    constructor(notice, account) {
        super(account, notice.conversationId, notice.conversationType, notice.raw);
    }
}
export class ConversationMembersRemovedNoticeEvent extends ConversationNoticeEvent {
    type = 'conversation.members-remove';
    memberUids;
    constructor(notice, account) {
        super(account, notice.conversationId, notice.conversationType, notice.raw);
        this.memberUids = Object.freeze([...notice.memberUids]);
    }
}
export class MarkedReadNoticeEvent extends ConversationNoticeEvent {
    readMessageIndex;
    readMessageIndexV2;
    readerUid;
    constructor(notice, account) {
        super(account, notice.conversationId, notice.conversationType, notice.raw);
        this.readMessageIndex = notice.readMessageIndex;
        this.readMessageIndexV2 = notice.readMessageIndexV2;
        this.readerUid = notice.readerUid;
    }
}
export class FriendMarkedReadNoticeEvent extends MarkedReadNoticeEvent {
    type = 'friend.marked-read';
    friend;
    constructor(notice, account, friend) {
        super(notice, account);
        this.friend = friend;
    }
}
export class GroupMarkedReadNoticeEvent extends MarkedReadNoticeEvent {
    type = 'group.marked-read';
    group;
    constructor(notice, account, group) {
        super(notice, account);
        this.group = group;
    }
}
export class MessageNoticeEvent extends ConversationNoticeEvent {
    serverMessageId;
    constructor(account, conversationId, conversationType, serverMessageId, raw) {
        super(account, conversationId, conversationType, raw);
        this.serverMessageId = serverMessageId;
    }
}
export class MessageUpdateNoticeEvent extends MessageNoticeEvent {
    type = 'message.update';
    message;
    clientMessageId;
    constructor(account, conversationType, message, raw) {
        super(account, message.threadId, conversationType, message.msgId || undefined, raw);
        this.message = Object.freeze(structuredClone(message));
        this.clientMessageId = message.clientMessageId;
    }
}
export class MessageDeleteNoticeEvent extends MessageNoticeEvent {
    type = 'message.delete';
    message;
    clientMessageId;
    constructor(account, conversationType, message, raw) {
        super(account, message.threadId, conversationType, message.msgId || undefined, raw);
        this.message = Object.freeze(structuredClone(message));
        this.clientMessageId = message.clientMessageId;
    }
}
export class MessageRecallNoticeEvent extends MessageNoticeEvent {
    type = 'message.recall';
    clientMessageId;
    constructor(notice, account) {
        super(account, notice.conversationId, notice.conversationType, notice.serverMessageId, notice.raw);
        this.clientMessageId = notice.clientMessageId;
    }
}
export class MessageReactionNoticeEvent extends MessageNoticeEvent {
    type = 'message.reaction';
    operatorUid;
    emoji;
    enabled;
    clientMessageId;
    constructor(notice, account) {
        super(account, notice.conversationId, notice.conversationType, notice.serverMessageId, notice.raw);
        this.operatorUid = notice.operatorUid;
        this.emoji = notice.emoji;
        this.enabled = notice.enabled;
        this.clientMessageId = notice.clientMessageId;
    }
}
export class GroupNoticeEvent extends ConversationNoticeEvent {
    group;
    constructor(account, group, raw) {
        super(account, group.threadId, 2, raw);
        this.group = group;
    }
}
export class GroupMemberChangeNoticeEvent extends GroupNoticeEvent {
    member;
    operator;
    operators;
    constructor(account, group, member, operators, raw) {
        super(account, group, raw);
        this.member = member;
        this.operators = Object.freeze([...operators]);
        this.operator = operators[0];
    }
}
export class GroupMemberIncreaseNoticeEvent extends GroupMemberChangeNoticeEvent {
    type = 'group.member-increase';
    source;
    constructor(notice, account, group, member, operators) {
        super(account, group, member, operators, notice.raw);
        this.source = notice.source;
    }
}
export class GroupInviteNoticeEvent extends GroupMemberIncreaseNoticeEvent {
    type = 'group.invite';
    constructor(notice, account, group, member, operators) {
        super(notice, account, group, member, operators);
    }
}
export class GroupMemberDecreaseNoticeEvent extends GroupMemberChangeNoticeEvent {
    type = 'group.member-decrease';
    source;
    isSelf;
    constructor(notice, account, group, member, operators) {
        super(account, group, member, operators, notice.raw);
        this.source = notice.source;
        this.isSelf = member.uid === account.imUid || member.uid === account.uid;
    }
}
export class GroupAdminNoticeEvent extends GroupMemberChangeNoticeEvent {
    type = 'group.admin';
    enabled = true;
    constructor(notice, account, group, member, operators) {
        super(account, group, member, operators, notice.raw);
    }
}
export class GroupMetadataChangeNoticeEvent extends GroupNoticeEvent {
    operator;
    operators;
    constructor(account, group, operators, raw) {
        super(account, group, raw);
        this.operators = Object.freeze([...operators]);
        this.operator = operators[0];
    }
}
export class GroupNameChangeNoticeEvent extends GroupMetadataChangeNoticeEvent {
    type = 'group.name-change';
    name;
    constructor(notice, account, group, operators) {
        super(account, group, operators, notice.raw);
        this.name = notice.name;
    }
}
export class GroupAvatarChangeNoticeEvent extends GroupMetadataChangeNoticeEvent {
    type = 'group.avatar-change';
    avatar;
    constructor(notice, account, group, operators) {
        super(account, group, operators, notice.raw);
        this.avatar = notice.avatar;
    }
}
export class FriendRelationshipNoticeEvent extends NoticeEvent {
    peerUid;
    fromUid;
    toUid;
    content;
    ext;
    constructor(notice, account) {
        super(account, notice.raw, eventTime(notice.raw));
        this.peerUid = notice.peerUid;
        this.fromUid = notice.fromUid;
        this.toUid = notice.toUid;
        this.content = notice.content;
        this.ext = notice.ext ?? {};
    }
}
export class FriendAddRequestNoticeEvent extends NoticeEvent {
    type = 'friend.add-request';
    applicantUid;
    fromUid;
    toUid;
    content;
    ext;
    constructor(notice, account) {
        super(account, notice.raw, eventTime(notice.raw));
        this.applicantUid = notice.applicantUid;
        this.fromUid = notice.fromUid;
        this.toUid = notice.toUid;
        this.content = notice.content;
        this.ext = notice.ext ?? {};
    }
}
export class FriendIncreaseNoticeEvent extends FriendRelationshipNoticeEvent {
    type = 'friend.increase';
    constructor(notice, account) {
        super(notice, account);
    }
}
export class FriendDecreaseNoticeEvent extends FriendRelationshipNoticeEvent {
    type = 'friend.decrease';
    constructor(notice, account) {
        super(notice, account);
    }
}
export class ImCommandNoticeEvent extends ConversationNoticeEvent {
    type = 'im.command';
    messageType;
    content;
    constructor(notice, account) {
        super(account, notice.conversationId, notice.conversationType, notice.raw);
        this.messageType = notice.messageType;
        this.content = notice.content;
    }
}
export function bindNoticeAccount(notice, account) {
    switch (notice.type) {
        case 'friend.add-request': return new FriendAddRequestNoticeEvent(notice, account);
        case 'friend.increase': return new FriendIncreaseNoticeEvent(notice, account);
        case 'friend.decrease': return new FriendDecreaseNoticeEvent(notice, account);
        case 'conversation.update': return new ConversationUpdateNoticeEvent(notice, account);
        case 'conversation.min-index': return new ConversationMinIndexNoticeEvent(notice, account);
        case 'conversation.members-remove': return new ConversationMembersRemovedNoticeEvent(notice, account);
        case 'conversation.delete': return new ConversationDeleteNoticeEvent(notice, account);
        case 'message.recall': return new MessageRecallNoticeEvent(notice, account);
        case 'message.reaction': return new MessageReactionNoticeEvent(notice, account);
        case 'im.command': return new ImCommandNoticeEvent(notice, account);
    }
}
export function bindGroupMemberIncreaseNotices(notice, account, group) {
    const operators = notice.operators.map((data) => group.ensureMember({
        ...data,
        role: noticeRole(group, data.uid),
    }));
    return notice.members.map((data) => {
        const member = group.ensureMember({
            ...data,
            role: noticeRole(group, data.uid),
        });
        return notice.source === 'invite'
            ? new GroupInviteNoticeEvent({ ...notice, source: 'invite' }, account, group, member, operators)
            : new GroupMemberIncreaseNoticeEvent(notice, account, group, member, operators);
    });
}
export function bindGroupMemberDecreaseNotices(notice, account, group) {
    const protocolOperators = notice.operators.map((data) => group.ensureMember({
        ...data,
        role: noticeRole(group, data.uid),
    }));
    return notice.members.map((data) => {
        const member = group.detachMember(data);
        const operators = notice.source === 'leave' ? [member] : protocolOperators;
        return new GroupMemberDecreaseNoticeEvent(notice, account, group, member, operators);
    });
}
function bindOperators(operators, group) {
    return operators.map((data) => group.ensureMember({
        ...data,
        role: noticeRole(group, data.uid),
    }));
}
function noticeRole(group, uid) {
    return group.pickMember(uid)?.role ??
        (group.ownerUid === uid ? MemberRole.OWNER : MemberRole.MEMBER);
}
export function bindGroupAdminNotices(notice, account, group) {
    const operators = bindOperators(notice.operators, group);
    return notice.members.map((data) => new GroupAdminNoticeEvent(notice, account, group, group.ensureMember({ ...data, role: MemberRole.ADMIN }), operators));
}
export function bindGroupNameChangeNotice(notice, account, group) {
    if (notice.name !== undefined)
        group.updateMetadata({ name: notice.name });
    return new GroupNameChangeNoticeEvent(notice, account, group, bindOperators(notice.operators, group));
}
export function bindGroupAvatarChangeNotice(notice, account, group) {
    if (notice.avatar !== undefined)
        group.updateMetadata({ avatar: notice.avatar });
    return new GroupAvatarChangeNoticeEvent(notice, account, group, bindOperators(notice.operators, group));
}
export function bindFriendMarkedReadNotice(notice, account, friend) {
    return new FriendMarkedReadNoticeEvent(notice, account, friend);
}
export function bindGroupMarkedReadNotice(notice, account, group) {
    return new GroupMarkedReadNoticeEvent(notice, account, group);
}
function eventTime(raw) {
    const value = raw['createTime'] ?? raw['create_time'] ?? raw['timestamp'];
    return typeof value === 'number' || typeof value === 'string' ? value : undefined;
}
//# sourceMappingURL=notice.js.map