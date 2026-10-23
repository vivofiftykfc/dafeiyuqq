import type { GroupMemberData, ImConversation, PrivateMessage, UserFollowStatus, UserFollowerStatus, StrangerSyncCursors } from './types.js';
import type { FrontierCursorStore } from './frontier-cursors.js';
import { type MessageReadPrivacy, type MessageReadPrivacyQuery } from './user-settings.js';
import { type ConversationReadSummary, type StoredReadCursor } from './read-state.js';
import { type MessageCacheSource, type MessageCacheUpdate } from './message-cache.js';
export interface CachedMessageReadPrivacy {
    query: MessageReadPrivacyQuery;
    policy: MessageReadPrivacy;
}
export type ImStateStoreBackend = 'sqlite' | 'json';
export interface MessageLocalExtUpdate {
    conversationId: string;
    clientMessageId: string;
    ext: Readonly<Record<string, string>>;
}
export declare function validateMessageLocalExt(ext: Readonly<Record<string, string>>): void;
export interface UserRelationState {
    followStatus?: UserFollowStatus;
    followerStatus?: UserFollowerStatus;
    blocked?: boolean;
    remark?: string;
}
export interface ImStateStoreOptions {
    accountDir: string;
    backend?: ImStateStoreBackend;
    maxMessagesPerConversation?: number;
}
export interface LocalImStateOptions {
    backend?: ImStateStoreBackend;
    maxMessagesPerConversation?: number;
}
export interface ImStateStore extends FrontierCursorStore {
    readonly backend: ImStateStoreBackend;
    getStrangerSyncCursors(): StrangerSyncCursors;
    setStrangerSyncCursors(cursors: StrangerSyncCursors): void;
    getUserRelation(uid: string): UserRelationState | undefined;
    setUserRelation(uid: string, relation: UserRelationState): void;
    getMessageReadPrivacy(conversationId: string, serverMessageId: string): CachedMessageReadPrivacy | undefined;
    upsertMessageReadPrivacy(entries: readonly CachedMessageReadPrivacy[]): void;
    deleteMessageReadPrivacy(conversationId: string, serverMessageId: string): void;
    listReadCursors(conversationId: string): StoredReadCursor[];
    saveReadCursors(conversationId: string, rows: readonly StoredReadCursor[]): void;
    getReadSummary(conversationId: string, selfUid: string): ConversationReadSummary | undefined;
    replaceGroups(groups: readonly ImConversation[]): void;
    upsertConversations(conversations: readonly ImConversation[], source?: 'server' | 'local'): void;
    getConversation(conversationId: string): ImConversation | undefined;
    patchConversation(conversationId: string, patch: Partial<Omit<ImConversation, 'conversationId'>>): void;
    listGroups(): ImConversation[] | undefined;
    queryStrangerConversations(): ImConversation[];
    getConversationDeletionBoundary(conversationId: string): string;
    applyConversationDeletion(conversationId: string, boundary: string): 'missing' | 'retained' | 'deleted';
    deleteConversation(conversationId: string): void;
    replaceGroupMembers(groupId: string, members: readonly GroupMemberData[]): void;
    upsertGroupMembers(groupId: string, members: readonly GroupMemberData[]): void;
    removeGroupMembers(groupId: string, uids: readonly string[]): void;
    removeConversationMembers(conversationId: string, uids: readonly string[]): boolean | undefined;
    listGroupMembers(groupId: string): GroupMemberData[] | undefined;
    upsertMessages(messages: readonly PrivateMessage[], source?: MessageCacheSource): MessageCacheUpdate[];
    modifyMessageLocalExt(update: MessageLocalExtUpdate): PrivateMessage | undefined;
    deleteMessage(conversationId: string, id: string, kind?: 'server' | 'client'): boolean;
    refreshRecalledSummary(conversationId: string, clientId: string): void;
    markPropertyRead(conversationId: string): boolean;
    listMessages(conversationId: string, count?: number): PrivateMessage[];
    getMessage(conversationId: string, id: string, kind: 'server' | 'client'): PrivateMessage | undefined;
    getReferencingMessages(conversationId: string, serverMessageId: string): PrivateMessage[];
    close(): void;
}
export declare function createImStateStore(options: ImStateStoreOptions): ImStateStore;
//# sourceMappingURL=state-store.d.ts.map