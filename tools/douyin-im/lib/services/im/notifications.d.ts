import type { ImNotice } from './types.js';
import type { ImPushMessage } from './ws-client.js';
export declare function messageDeletionCommand(messageType: number, content: string): {
    conversationId: string;
    serverMessageId: string;
} | undefined;
export declare function noticeFromPush(push: ImPushMessage): ImNotice | undefined;
export declare function extractProtoNotices(response: Record<string, unknown>): ImNotice[];
//# sourceMappingURL=notifications.d.ts.map