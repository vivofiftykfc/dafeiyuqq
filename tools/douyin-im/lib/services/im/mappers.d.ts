import type { ImConversation, PrivateMessage, PrivateThread } from './types.js';
export declare function isGroupConversationId(conversationId: string): boolean;
export declare function mapProtoConversationListItem(raw: Record<string, unknown>): ImConversation;
export declare function parsePeerFromConversationId(conversationId: string, myUid: string): string;
export declare function mapProtoConversationMeta(conv: Record<string, unknown>, messages: Record<string, unknown>[], myUid: string): PrivateThread;
export declare function mapProtoConversation(raw: Record<string, unknown>, myUid: string): PrivateThread;
export declare function pickInboxUnread(raw: unknown): {
    unreadCount?: number;
};
export declare function dedupeThreads(threads: PrivateThread[]): PrivateThread[];
export declare function mapProtoMessage(raw: Record<string, unknown>): PrivateMessage;
//# sourceMappingURL=mappers.d.ts.map