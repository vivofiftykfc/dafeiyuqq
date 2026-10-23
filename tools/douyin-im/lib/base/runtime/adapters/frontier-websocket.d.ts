import type { ImNotice } from '../../../services/im/types.js';
import { FrontierImWs } from '../../../services/im/ws-client.js';
import { type ReconnectEvent } from '../reconnect.js';
import type { RawInboundMessage } from '../../raw/inbound-message.js';
import { type FrontierCursorStore } from '../../../services/im/frontier-cursors.js';
export interface ImWebSocketReceiverOptions {
    deviceId: string;
    installId?: string;
    cookies: string;
    cursorStore?: FrontierCursorStore;
    userAgent?: string;
    verbose?: boolean;
    onInbound: (message: RawInboundMessage) => void;
    onNotice?: (notice: ImNotice) => void;
    onRaw?: (cmd: number, response: Record<string, unknown>) => void;
    onOpen?: () => void;
    onClose?: (code: number, reason: string) => void;
    onReconnecting?: (payload: ReconnectEvent) => void;
}
export declare class ImWebSocketReceiver {
    private ws;
    private readonly opts;
    private reconnectTimer?;
    private reconnectAttempt;
    private stopped;
    private hasConnected;
    private readonly cursors;
    constructor(opts: ImWebSocketReceiverOptions);
    get frontierWs(): FrontierImWs | undefined;
    get isConnected(): boolean;
    start(): Promise<void>;
    private connect;
    stop(): Promise<void>;
    private scheduleReconnect;
}
//# sourceMappingURL=frontier-websocket.d.ts.map