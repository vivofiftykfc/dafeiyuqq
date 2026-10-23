import type { ImProtoTransport } from './transport.js';
import type { MessageListOptions, MessageListResponse, ThreadListOptions, ThreadListResponse, ConversationListOptions, ConversationListResponse } from './types.js';
export declare class ImInboxApi {
    private readonly transport;
    private readonly platformUid;
    private readonly deviceId;
    constructor(transport: ImProtoTransport, platformUid?: string, deviceId?: string);
    private cookieOptions;
    listConversations(options?: ConversationListOptions): Promise<ConversationListResponse>;
    listThreads(options?: ThreadListOptions): Promise<ThreadListResponse>;
    getMessages(options: MessageListOptions): Promise<MessageListResponse>;
    private mapMessageListResponse;
}
//# sourceMappingURL=inbox.d.ts.map