import type { ImHttpClient } from './service.js';
import type { ImActionResponse, UserBlockOptions } from './types.js';
export interface ImUserProfile {
    uid: string;
    secUid: string;
    nickname: string;
    avatarThumb?: string;
    followStatus?: number;
    followerStatus?: number;
    remark?: string;
    blocked?: boolean;
}
export interface UserSearchEntry extends ImUserProfile {
    uniqueId?: string;
}
export interface UserSearchResponse extends ImActionResponse {
    keyword: string;
    cursor: number;
    hasMore: boolean;
    nextCursor?: number;
    users: UserSearchEntry[];
}
export interface UserActiveStatus {
    secUid: string;
    lastActiveTime?: number;
}
export interface ConversationActiveStatus {
    conversationId: string;
    online?: boolean | number;
    toast?: Array<{
        lang: string;
        content: string;
    }>;
}
export interface ActiveStatusResponse extends ImActionResponse {
    users?: UserActiveStatus[];
    conversations?: ConversationActiveStatus[];
}
export declare class ImUserDirectory {
    private readonly client;
    private readonly deviceId;
    private readonly cache;
    constructor(client: ImHttpClient, deviceId: string);
    getActiveStatus(secUids: readonly string[], conversationIds?: readonly string[]): Promise<ActiveStatusResponse>;
    searchUsers(keyword: string, cursor?: number): Promise<UserSearchResponse>;
    resolve(secUids: string[]): Promise<ImUserProfile[]>;
    setBlocked(options: UserBlockOptions): Promise<ImActionResponse>;
    getProfile(secUid: string): Promise<ImUserProfile | undefined>;
    private commonParams;
}
//# sourceMappingURL=user-directory.d.ts.map