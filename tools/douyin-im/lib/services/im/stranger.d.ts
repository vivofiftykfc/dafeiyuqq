import type { ImProtoTransport } from './transport.js';
import type { ImActionResponse, RecentStrangerMessagesOptions, RecentStrangerMessagesResponse, StrangerMessagesResponse, StrangerUnreadCountResponse } from './types.js';
export declare class ImStrangerApi {
    private readonly transport;
    private readonly deviceId;
    constructor(transport: ImProtoTransport, deviceId?: string);
    private cookieOptions;
    getRecentMessages(options: RecentStrangerMessagesOptions): Promise<RecentStrangerMessagesResponse>;
    getMessages(conversationShortId: string, resetUnreadCount?: boolean): Promise<StrangerMessagesResponse>;
    deleteMessage(conversationShortId: string, serverMessageId: string): Promise<ImActionResponse>;
    deleteAllConversations(): Promise<ImActionResponse>;
    markRead(conversationShortId: string): Promise<ImActionResponse>;
    markAllRead(): Promise<ImActionResponse>;
    getUnreadCount(resetUnreadCount?: boolean): Promise<StrangerUnreadCountResponse>;
    private emptyAction;
}
//# sourceMappingURL=stranger.d.ts.map