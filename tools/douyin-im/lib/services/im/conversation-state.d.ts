import type { ImConversation, RecentStrangerConversation } from './types.js';
export declare function mergeConversationSnapshot(current: ImConversation | undefined, incoming: ImConversation, selfUid?: string): ImConversation;
export declare function strangerConversationMode(selfUid: string, id: string): number;
export declare function buildStrangerConversation(current: ImConversation | undefined, row: RecentStrangerConversation, selfUid: string, inboxType: number): ImConversation | undefined;
//# sourceMappingURL=conversation-state.d.ts.map