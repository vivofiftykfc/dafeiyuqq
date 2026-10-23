import { EventEmitter } from 'events';
import type { MessageReferenceInfo, MessagePropertyItem } from './types.js';
import { FrontierCursors } from './frontier-cursors.js';
export interface FrontierWsOptions {
    deviceId: string;
    installId?: string;
    cookies: string;
    userAgent?: string;
    verbose?: boolean;
    cursors?: FrontierCursors;
}
export interface ImPushMessage {
    cmd: number;
    inboxType?: number;
    conversationId: string;
    conversationShortId: string;
    conversationType: number;
    senderUid: string;
    senderSecUid?: string;
    content: string;
    contentBytes?: Uint8Array;
    messageType: number;
    serverMessageId?: string;
    clientMessageId?: string;
    createTime?: string;
    status?: number;
    version?: string;
    orderInConversation?: string;
    indexInConversation?: string;
    indexInConversationV2?: string;
    ext?: Readonly<Record<string, string>>;
    referenceInfo?: MessageReferenceInfo;
    propertyList?: Readonly<Record<string, readonly MessagePropertyItem[]>>;
    raw: Record<string, unknown>;
}
export declare function pushFromResponse(cmd: number, resp: Record<string, unknown>): ImPushMessage | null;
export declare class FrontierImWs extends EventEmitter {
    private readonly opts;
    private readonly cursors;
    private ws;
    private heartbeatTimer;
    constructor(opts: FrontierWsOptions);
    get connected(): boolean;
    connect(): Promise<void>;
    close(): void;
    private log;
    private onMessage;
    private startHeartbeat;
    private stopHeartbeat;
}
//# sourceMappingURL=ws-client.d.ts.map