import type { ImHttpClient } from './service.js';
import type { ImActionResponse } from './types.js';
export interface UserSettingsResponse extends ImActionResponse {
    imReadStatusShow?: number;
    closeConsecutiveChat?: number;
    enableReadState?: boolean;
}
export interface ReadReceiptPrivacyResponse extends ImActionResponse {
    currentUserSwitch?: number;
    enableReadState?: boolean;
}
export interface MessageReadPrivacyQuery {
    serverMessageId: string;
    conversationId: string;
    conversationShortId: string;
    conversationType: 1 | 2;
    createTime: number;
}
export interface MessageReadPrivacy {
    serverMessageId: string;
    errorCode: number;
    on: readonly string[];
    off: readonly string[];
}
export interface MessageReadPrivacyResponse extends ReadReceiptPrivacyResponse {
    messages: MessageReadPrivacy[];
}
export declare function normalizeMessageReadPrivacyQueries(queries: readonly MessageReadPrivacyQuery[]): MessageReadPrivacyQuery[];
export declare function filterReadReceipt<T extends {
    uid: string;
}>(native: {
    serverMessageId: string;
    readUsers: readonly T[];
    isAllRead: boolean;
}, response: MessageReadPrivacyResponse): {
    readUsers: T[];
    isAllRead: boolean;
};
export declare class ImUserSettingsApi {
    private readonly client;
    private readonly deviceId;
    constructor(client: ImHttpClient, deviceId: string);
    getSettings(): Promise<UserSettingsResponse>;
    getReadReceiptPrivacy(): Promise<ReadReceiptPrivacyResponse>;
    getMessageReadPrivacy(queries: readonly MessageReadPrivacyQuery[]): Promise<MessageReadPrivacyResponse>;
    private params;
    private request;
    private result;
}
//# sourceMappingURL=user-settings.d.ts.map