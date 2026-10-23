import { BaseEvent } from '../../base/event.js';
import type { ConversationReadSummary } from '../../services/im/read-state.js';
import type { ImNotice, ImConversation, PrivateMessage } from '../../services/im/types.js';
import type { Account } from '../account.js';
import type { Friend } from '../contacts/friend.js';
import type { Group } from '../contacts/group.js';
import { type Member } from '../contacts/member.js';
type ProtocolOnlyNotice = Exclude<ImNotice, {
    type: 'group.join-request';
} | {
    type: 'group.member-increase';
} | {
    type: 'group.member-decrease';
} | {
    type: 'group.admin';
} | {
    type: 'group.name-change';
} | {
    type: 'group.avatar-change';
} | {
    type: 'conversation.read';
} | {
    type: 'message.delete';
}>;
export declare abstract class NoticeEvent extends BaseEvent<Account> {
    readonly postType: "notice";
    abstract readonly type: string;
}
export declare class ConversationReadSummaryNoticeEvent extends NoticeEvent {
    readonly type: "conversation.read-summary";
    readonly summaries: readonly (Readonly<Omit<ConversationReadSummary, 'readUsers'>> & {
        readonly readUsers: readonly Readonly<ConversationReadSummary['readUsers'][number]>[];
    })[];
    constructor(account: Account, summaries: readonly ConversationReadSummary[]);
}
export interface ConversationMessageUpdate {
    readonly conversation: Readonly<ImConversation>;
    readonly messages: readonly Readonly<PrivateMessage>[];
}
export declare class MessageListUpdateNoticeEvent extends NoticeEvent {
    readonly type: "message.list-update";
    readonly messages: readonly Readonly<PrivateMessage>[];
    constructor(account: Account, messages: readonly PrivateMessage[], raw?: Record<string, unknown>);
}
export declare class MessageBatchUpdateNoticeEvent extends NoticeEvent {
    readonly type: "message.batch-update";
    readonly updates: readonly ConversationMessageUpdate[];
    readonly deletedClientMessageIds: readonly string[];
    constructor(account: Account, updates: readonly ConversationMessageUpdate[], deletedClientMessageIds: readonly string[], raw: Record<string, unknown>);
}
export declare abstract class ConversationNoticeEvent extends NoticeEvent {
    readonly conversationId: string;
    readonly conversationType: number;
    protected constructor(account: Account, conversationId: string, conversationType: number, raw: Record<string, unknown>);
}
export declare class ConversationUpdateNoticeEvent extends ConversationNoticeEvent {
    readonly type: "conversation.update";
    readonly conversation: Readonly<ImConversation> | undefined;
    constructor(notice: Extract<ImNotice, {
        type: 'conversation.update';
    }>, account: Account);
}
export declare class ConversationMinIndexNoticeEvent extends ConversationNoticeEvent {
    readonly type: "conversation.min-index";
    readonly minIndex: string;
    constructor(notice: Extract<ImNotice, {
        type: 'conversation.min-index';
    }>, account: Account);
}
export declare class ConversationDeleteNoticeEvent extends ConversationNoticeEvent {
    readonly type: "conversation.delete";
    constructor(notice: Extract<ImNotice, {
        type: 'conversation.delete';
    }>, account: Account);
}
export declare class ConversationMembersRemovedNoticeEvent extends ConversationNoticeEvent {
    readonly type: "conversation.members-remove";
    readonly memberUids: readonly string[];
    constructor(notice: Extract<ImNotice, {
        type: 'conversation.members-remove';
    }>, account: Account);
}
export declare abstract class MarkedReadNoticeEvent extends ConversationNoticeEvent {
    readonly readMessageIndex: string;
    readonly readMessageIndexV2: string | undefined;
    readonly readerUid: string | undefined;
    protected constructor(notice: Extract<ImNotice, {
        type: 'conversation.read';
    }>, account: Account);
}
export declare class FriendMarkedReadNoticeEvent extends MarkedReadNoticeEvent {
    readonly type: "friend.marked-read";
    readonly friend: Friend;
    constructor(notice: Extract<ImNotice, {
        type: 'conversation.read';
    }>, account: Account, friend: Friend);
}
export declare class GroupMarkedReadNoticeEvent extends MarkedReadNoticeEvent {
    readonly type: "group.marked-read";
    readonly group: Group;
    constructor(notice: Extract<ImNotice, {
        type: 'conversation.read';
    }>, account: Account, group: Group);
}
export declare abstract class MessageNoticeEvent extends ConversationNoticeEvent {
    readonly serverMessageId: string | undefined;
    protected constructor(account: Account, conversationId: string, conversationType: number, serverMessageId: string | undefined, raw: Record<string, unknown>);
}
export declare class MessageUpdateNoticeEvent extends MessageNoticeEvent {
    readonly type: "message.update";
    readonly message: Readonly<PrivateMessage>;
    readonly clientMessageId: string | undefined;
    constructor(account: Account, conversationType: number, message: PrivateMessage, raw: Record<string, unknown>);
}
export declare class MessageDeleteNoticeEvent extends MessageNoticeEvent {
    readonly type: "message.delete";
    readonly message: Readonly<PrivateMessage>;
    readonly clientMessageId: string | undefined;
    constructor(account: Account, conversationType: number, message: PrivateMessage, raw: Record<string, unknown>);
}
export declare class MessageRecallNoticeEvent extends MessageNoticeEvent {
    readonly type: "message.recall";
    readonly clientMessageId: string | undefined;
    constructor(notice: Extract<ImNotice, {
        type: 'message.recall';
    }>, account: Account);
}
export declare class MessageReactionNoticeEvent extends MessageNoticeEvent {
    readonly type: "message.reaction";
    readonly operatorUid: string;
    readonly emoji: string;
    readonly enabled: boolean;
    readonly clientMessageId: string | undefined;
    constructor(notice: Extract<ImNotice, {
        type: 'message.reaction';
    }>, account: Account);
}
export declare abstract class GroupNoticeEvent extends ConversationNoticeEvent {
    readonly group: Group;
    protected constructor(account: Account, group: Group, raw: Record<string, unknown>);
}
export declare abstract class GroupMemberChangeNoticeEvent extends GroupNoticeEvent {
    readonly member: Member;
    readonly operator: Member | undefined;
    readonly operators: readonly Member[];
    protected constructor(account: Account, group: Group, member: Member, operators: readonly Member[], raw: Record<string, unknown>);
}
export declare class GroupMemberIncreaseNoticeEvent extends GroupMemberChangeNoticeEvent {
    readonly type: 'group.member-increase' | 'group.invite';
    readonly source: Extract<ImNotice, {
        type: 'group.member-increase';
    }>['source'];
    constructor(notice: Extract<ImNotice, {
        type: 'group.member-increase';
    }>, account: Account, group: Group, member: Member, operators: readonly Member[]);
}
export declare class GroupInviteNoticeEvent extends GroupMemberIncreaseNoticeEvent {
    readonly type: "group.invite";
    readonly source: 'invite';
    constructor(notice: Extract<ImNotice, {
        type: 'group.member-increase';
    }> & {
        source: 'invite';
    }, account: Account, group: Group, member: Member, operators: readonly Member[]);
}
export declare class GroupMemberDecreaseNoticeEvent extends GroupMemberChangeNoticeEvent {
    readonly type: "group.member-decrease";
    readonly source: Extract<ImNotice, {
        type: 'group.member-decrease';
    }>['source'];
    readonly isSelf: boolean;
    constructor(notice: Extract<ImNotice, {
        type: 'group.member-decrease';
    }>, account: Account, group: Group, member: Member, operators: readonly Member[]);
}
export declare class GroupAdminNoticeEvent extends GroupMemberChangeNoticeEvent {
    readonly type: "group.admin";
    readonly enabled: true;
    constructor(notice: Extract<ImNotice, {
        type: 'group.admin';
    }>, account: Account, group: Group, member: Member, operators: readonly Member[]);
}
export declare abstract class GroupMetadataChangeNoticeEvent extends GroupNoticeEvent {
    readonly operator: Member | undefined;
    readonly operators: readonly Member[];
    protected constructor(account: Account, group: Group, operators: readonly Member[], raw: Record<string, unknown>);
}
export declare class GroupNameChangeNoticeEvent extends GroupMetadataChangeNoticeEvent {
    readonly type: "group.name-change";
    readonly name: string | undefined;
    constructor(notice: Extract<ImNotice, {
        type: 'group.name-change';
    }>, account: Account, group: Group, operators: readonly Member[]);
}
export declare class GroupAvatarChangeNoticeEvent extends GroupMetadataChangeNoticeEvent {
    readonly type: "group.avatar-change";
    readonly avatar: string | undefined;
    constructor(notice: Extract<ImNotice, {
        type: 'group.avatar-change';
    }>, account: Account, group: Group, operators: readonly Member[]);
}
export declare abstract class FriendRelationshipNoticeEvent extends NoticeEvent {
    readonly peerUid: string;
    readonly fromUid: string | undefined;
    readonly toUid: string | undefined;
    readonly content: string | undefined;
    readonly ext: Readonly<Record<string, string>>;
    protected constructor(notice: Extract<ImNotice, {
        type: 'friend.increase' | 'friend.decrease';
    }>, account: Account);
}
export declare class FriendAddRequestNoticeEvent extends NoticeEvent {
    readonly type: "friend.add-request";
    readonly applicantUid: string;
    readonly fromUid: string | undefined;
    readonly toUid: string | undefined;
    readonly content: string | undefined;
    readonly ext: Readonly<Record<string, string>>;
    constructor(notice: Extract<ImNotice, {
        type: 'friend.add-request';
    }>, account: Account);
}
export declare class FriendIncreaseNoticeEvent extends FriendRelationshipNoticeEvent {
    readonly type: "friend.increase";
    constructor(notice: Extract<ImNotice, {
        type: 'friend.increase';
    }>, account: Account);
}
export declare class FriendDecreaseNoticeEvent extends FriendRelationshipNoticeEvent {
    readonly type: "friend.decrease";
    constructor(notice: Extract<ImNotice, {
        type: 'friend.decrease';
    }>, account: Account);
}
export type FriendNoticeEvent = FriendMarkedReadNoticeEvent | FriendAddRequestNoticeEvent | FriendIncreaseNoticeEvent | FriendDecreaseNoticeEvent;
export declare class ImCommandNoticeEvent extends ConversationNoticeEvent {
    readonly type: "im.command";
    readonly messageType: number;
    readonly content: string;
    constructor(notice: Extract<ImNotice, {
        type: 'im.command';
    }>, account: Account);
}
export type AnyNoticeEvent = ConversationReadSummaryNoticeEvent | MessageDeleteNoticeEvent | MessageBatchUpdateNoticeEvent | MessageListUpdateNoticeEvent | ConversationUpdateNoticeEvent | ConversationMinIndexNoticeEvent | ConversationMembersRemovedNoticeEvent | ConversationDeleteNoticeEvent | FriendMarkedReadNoticeEvent | FriendAddRequestNoticeEvent | GroupMarkedReadNoticeEvent | MessageRecallNoticeEvent | MessageUpdateNoticeEvent | MessageReactionNoticeEvent | GroupMemberIncreaseNoticeEvent | GroupMemberDecreaseNoticeEvent | GroupAdminNoticeEvent | GroupNameChangeNoticeEvent | GroupAvatarChangeNoticeEvent | FriendIncreaseNoticeEvent | FriendDecreaseNoticeEvent | ImCommandNoticeEvent;
export declare function bindNoticeAccount(notice: ProtocolOnlyNotice, account: Account): AnyNoticeEvent;
export declare function bindGroupAdminNotices(notice: Extract<ImNotice, {
    type: 'group.admin';
}>, account: Account, group: Group): GroupAdminNoticeEvent[];
export declare function bindGroupNameChangeNotice(notice: Extract<ImNotice, {
    type: 'group.name-change';
}>, account: Account, group: Group): GroupNameChangeNoticeEvent;
export declare function bindGroupAvatarChangeNotice(notice: Extract<ImNotice, {
    type: 'group.avatar-change';
}>, account: Account, group: Group): GroupAvatarChangeNoticeEvent;
export declare function bindFriendMarkedReadNotice(notice: Extract<ImNotice, {
    type: 'conversation.read';
}>, account: Account, friend: Friend): FriendMarkedReadNoticeEvent;
export declare function bindGroupMarkedReadNotice(notice: Extract<ImNotice, {
    type: 'conversation.read';
}>, account: Account, group: Group): GroupMarkedReadNoticeEvent;
export {};
//# sourceMappingURL=notice.d.ts.map