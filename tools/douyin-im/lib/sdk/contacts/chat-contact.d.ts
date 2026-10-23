import type { ConversationReadMarker, ImActionResponse, RecallMessageResponse, SendMessageResponse, PrivateMessage } from '../../services/im/types.js';
import type { SharedCommentStatus, SharedWorkDetail } from '../../services/im/shared-content.js';
import type { ImService } from '../../services/im/service.js';
import type { ConversationReadStateResponse, ConversationReadSummary, StoredReadCursor } from '../../services/im/read-state.js';
import { type MessageReadPrivacyResponse } from '../../services/im/user-settings.js';
import { Contact, type ConversationAddress } from '../../base/contact.js';
import type { Account } from '../account.js';
import type { MessageEvent } from '../events/message.js';
import type { SendableMessage } from '../messaging/message.js';
export type ChatMessage = PrivateMessage;
export type ChatMessageIdentifier = string | {
    clientMessageId: string;
};
export interface ConversationReadReceipt {
    raw: ConversationReadSummary;
    privacy: MessageReadPrivacyResponse;
    readUsers: ConversationReadSummary['readUsers'];
    isAllRead: boolean;
}
export interface ChatHistory {
    statusCode: number;
    statusMsg: string;
    hasMore: boolean;
    messages: ChatMessage[];
    cursor: string;
    direction: 'older' | 'newer';
}
export interface ChatHistoryOptions {
    cursor?: string | number;
    count?: number;
    direction?: 'older' | 'newer';
    includeCurrent?: boolean;
}
export declare abstract class ChatContact extends Contact<Account> {
    protected abstract readonly logTarget: string;
    protected constructor(id: string, address: ConversationAddress, account: Account);
    sendMsg(message: SendableMessage): Promise<SendMessageResponse>;
    getHistory(options?: ChatHistoryOptions): Promise<ChatHistory>;
    getCachedHistory(count?: number): readonly ChatMessage[];
    getCachedMessage(serverMessageId: string): ChatMessage | undefined;
    getCachedMessageByClientId(clientMessageId: string): ChatMessage | undefined;
    modifyMessageLocalExt(clientMessageId: string, ext: Readonly<Record<string, string>>): void;
    forwardMsg(message: MessageEvent): Promise<SendMessageResponse>;
    getSharedWorkDetails(workIds: readonly string[]): Promise<SharedWorkDetail[]>;
    getSharedCommentStatuses(commentIds: readonly string[]): Promise<SharedCommentStatus[]>;
    recallMsg(serverMessageId: string): Promise<RecallMessageResponse>;
    deleteMsg(identifier: ChatMessageIdentifier): Promise<ImActionResponse>;
    deleteLocalMsg(identifier: ChatMessageIdentifier): boolean;
    private resolveDeleteTarget;
    markRead(marker: ConversationReadMarker): Promise<ImActionResponse>;
    getReadState(): Promise<ConversationReadStateResponse>;
    getCachedReadState(): readonly StoredReadCursor[];
    getCachedReadSummary(): ConversationReadSummary | undefined;
    getReadReceipt(refreshPrivacy?: boolean): Promise<ConversationReadReceipt | undefined>;
    refresh(): Promise<this>;
    deleteConversation(): Promise<ImActionResponse>;
    reactMsg(serverMessageId: string, emoji: string, enabled?: boolean): Promise<ImActionResponse>;
    enterConversation(): Promise<ImActionResponse>;
    setMute(mute?: boolean): Promise<ImActionResponse>;
    setPinned(pinned?: boolean): Promise<ImActionResponse>;
    protected prepareAddress(): Promise<Readonly<ConversationAddress>>;
    protected assertCurrentConnection(connection: ImService): void;
    protected resolveAddress(): Readonly<ConversationAddress>;
}
//# sourceMappingURL=chat-contact.d.ts.map