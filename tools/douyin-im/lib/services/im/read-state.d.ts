import type { ImProtoTransport } from './transport.js';
import type { ConversationAddressOptions, GroupMemberData, ImActionResponse, PrivateMessage } from './types.js';
export interface ConversationReadSummary {
    conversationId: string;
    conversationShortId: string;
    conversationType: number;
    clientMessageId: string;
    serverMessageId: string;
    createTime: string;
    readUsers: {
        uid: string;
        secUid: string;
        readIndex: string;
        minIndex: string;
    }[];
    isAllRead: boolean;
}
export declare function equalConversationReadSummaries(left: ConversationReadSummary, right: ConversationReadSummary): boolean;
export declare function selectLastSentMessage(messages: readonly PrivateMessage[], conversationId: string, selfUid: string): PrivateMessage | undefined;
export declare function calculateConversationReadSummary(conversationId: string, message: PrivateMessage, selfUid: string, participants: readonly GroupMemberData[], cursors: readonly StoredReadCursor[]): ConversationReadSummary;
export interface ParticipantReadCursor {
    uid: string;
    secUid?: string;
    index?: string;
    indexV2?: string;
    minIndex?: string;
}
export interface ParticipantMinCursor {
    uid: string;
    secUid?: string;
    index?: string;
    indexV2?: string;
}
export interface StoredReadCursor {
    uid: string;
    readIndex: string;
    minIndex: string;
}
export declare function validateStoredReadCursors(rows: readonly StoredReadCursor[]): void;
export declare function mergeReadCursorState(current: readonly StoredReadCursor[], response: ConversationReadStateResponse): StoredReadCursor[];
export declare function readIndexFromP2PContent(content: string): {
    uid: string;
    index: string;
} | undefined;
export interface ReadCursorsResponse extends ImActionResponse {
    indexes: ParticipantReadCursor[];
}
export interface MinCursorsResponse extends ImActionResponse {
    indexes: ParticipantMinCursor[];
}
export interface ConversationReadStateResponse extends ImActionResponse {
    readIndexes: ParticipantReadCursor[];
    minIndexes: ParticipantMinCursor[];
}
export interface BatchReadCursorsResponse extends ImActionResponse {
    conversations: {
        conversationId: string;
        conversationShortId: string;
        indexes: ParticipantReadCursor[];
    }[];
    missingConversationIds: string[];
}
export declare class ImReadStateApi {
    private readonly transport;
    private readonly deviceId;
    constructor(transport: ImProtoTransport, deviceId: string);
    getReadIndexes(options: ConversationAddressOptions): Promise<ReadCursorsResponse>;
    getMinIndexes(options: ConversationAddressOptions): Promise<MinCursorsResponse>;
    getState(options: ConversationAddressOptions): Promise<ConversationReadStateResponse>;
    getBatchReadIndexes(options: readonly ConversationAddressOptions[]): Promise<BatchReadCursorsResponse>;
    private query;
}
//# sourceMappingURL=read-state.d.ts.map