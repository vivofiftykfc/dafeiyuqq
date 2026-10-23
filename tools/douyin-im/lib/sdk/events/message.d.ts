import type { ImActionResponse, MessageReferenceInfo, RecallMessageResponse, SendMessageResponse } from '../../services/im/types.js';
import { type ParsedMessageContent, type TextMention } from '../../services/im/content.js';
import { BaseEvent } from '../../base/event.js';
import type { Account } from '../account.js';
import type { ChatContact } from '../contacts/chat-contact.js';
import type { Friend } from '../contacts/friend.js';
import type { Group } from '../contacts/group.js';
import type { Stranger } from '../contacts/stranger.js';
import type { Member } from '../contacts/member.js';
import type { SendableMessage } from '../messaging/message.js';
import type { RawInboundMessage } from '../../base/raw/inbound-message.js';
import { SharedComment, SharedWork } from '../content/shared-content.js';
export declare abstract class MessageEvent extends BaseEvent<Account> {
    private readonly contact;
    readonly postType: "message";
    abstract readonly type: 'message.private' | 'message.group' | 'message.stranger';
    abstract readonly chatType: 'private' | 'group' | 'stranger';
    readonly threadId: string;
    readonly conversationShortId: string;
    readonly conversationType: 1 | 2;
    readonly inboxType: number;
    readonly senderUid: string;
    readonly senderSecUid?: string;
    readonly serverMessageId?: string;
    readonly clientMessageId?: string;
    readonly indexInConversation?: string;
    readonly indexInConversationV2?: string;
    readonly createTime?: string;
    readonly status?: number;
    readonly version?: string;
    readonly orderInConversation?: string;
    readonly ext: Readonly<Record<string, string>>;
    readonly referenceInfo?: MessageReferenceInfo;
    readonly text: string;
    readonly content: ParsedMessageContent;
    readonly rawContent: string;
    readonly messageType: number;
    readonly mentions: readonly TextMention[];
    readonly isMentionMe: boolean;
    readonly work: SharedWork | undefined;
    readonly comment: SharedComment | undefined;
    protected constructor(inbound: RawInboundMessage, account: Account, contact: ChatContact);
    get isGroup(): boolean;
    static fromInbound(inbound: RawInboundMessage, account: Account): MessageEvent;
    reply(message: SendableMessage): Promise<SendMessageResponse>;
    getReadPrivacy(refresh?: boolean): Promise<import("../index.js").MessageReadPrivacyResponse>;
    forwardTo(target: ChatContact): Promise<SendMessageResponse>;
    quote(text: string): Promise<SendMessageResponse>;
    recall(): Promise<RecallMessageResponse>;
    delete(): Promise<ImActionResponse>;
    deleteLocal(): boolean;
    react(emoji: string, enabled?: boolean): Promise<ImActionResponse>;
    markRead(): Promise<ImActionResponse>;
}
export declare class PrivateMessageEvent extends MessageEvent {
    readonly type: "message.private";
    readonly chatType: "private";
    readonly friend: Friend;
    private constructor();
    static fromInbound(inbound: RawInboundMessage, account: Account): PrivateMessageEvent;
}
export declare class GroupMessageEvent extends MessageEvent {
    readonly type: "message.group";
    readonly chatType: "group";
    readonly group: Group;
    readonly member: Member;
    private constructor();
    static fromInbound(inbound: RawInboundMessage, account: Account): GroupMessageEvent;
}
export declare class StrangerMessageEvent extends MessageEvent {
    readonly type: "message.stranger";
    readonly chatType: "stranger";
    readonly stranger: Stranger;
    private constructor();
    static fromInbound(inbound: RawInboundMessage, account: Account): StrangerMessageEvent;
}
//# sourceMappingURL=message.d.ts.map