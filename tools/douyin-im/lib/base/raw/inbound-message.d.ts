import type { ImPushMessage } from '../../services/im/ws-client.js';
import type { MessageReferenceInfo, MessagePropertyItem, PrivateMessage, PrivateThread } from '../../services/im/types.js';
export interface RawInboundMessage {
    readonly inboxType?: number;
    readonly threadId: string;
    readonly conversationShortId: string;
    readonly conversationType: number;
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
    readonly ext?: Readonly<Record<string, string>>;
    readonly referenceInfo?: MessageReferenceInfo;
    readonly propertyList?: Readonly<Record<string, readonly MessagePropertyItem[]>>;
    readonly text: string;
    readonly rawContent: string;
    readonly messageType: number;
    readonly raw: Record<string, unknown>;
}
export declare function inboundFromPush(push: ImPushMessage): RawInboundMessage | null;
export declare function inboundFromThread(thread: PrivateThread, message: PrivateMessage, inboxType?: number): RawInboundMessage | null;
export declare function inboundFromMessage(message: PrivateMessage): RawInboundMessage | null;
//# sourceMappingURL=inbound-message.d.ts.map