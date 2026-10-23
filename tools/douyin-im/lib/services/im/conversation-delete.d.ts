import type { ImConversation, PrivateMessage } from './types.js';
export declare function conversationDeletionCommand(messageType: number, content: string): {
    conversationId: string;
    lastMessageIndex: string;
} | undefined;
export declare function signedMessageIndex(value: string): bigint;
export declare function maxStoredMessageIndex(messages: readonly PrivateMessage[]): string;
export declare function conversationDeletionPlan(conversation: ImConversation, boundary: string): {
    minIndex: string;
    deleteConversation: boolean;
    deleteAllMessages: boolean;
};
//# sourceMappingURL=conversation-delete.d.ts.map