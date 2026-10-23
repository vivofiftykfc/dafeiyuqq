import type { ImService } from '../../services/im/service.js';
import type { FrontierCursorStore } from '../../services/im/frontier-cursors.js';
import type { ImNotice, ImConversation } from '../../services/im/types.js';
import type { RawInboundMessage } from '../raw/inbound-message.js';
import { type Logger } from '../../logger.js';
import { ImWebSocketReceiver } from './adapters/frontier-websocket.js';
export interface ReconnectingSignal {
    attempt: number;
    delayMs: number;
    code?: number;
    reason?: string;
}
export interface ConnectionManagerOptions {
    platformUid: string;
    deviceId: string;
    installId?: string;
    sessionCookies: string;
    cursorStore?: FrontierCursorStore;
    deviceUserAgent: string;
    imService: ImService;
    logger?: Logger;
    onInbound: (message: RawInboundMessage) => void;
    onHistoryBatch: (messages: readonly RawInboundMessage[], conversations: readonly ImConversation[]) => void;
    onNotice?: (notice: ImNotice) => void;
    onRaw?: (cmd: number, response: Record<string, unknown>) => void;
    onOpen?: () => void;
    onClose?: (code: number, reason: string) => void;
    onReconnecting?: (payload: ReconnectingSignal) => void;
}
export type ImWebSocketReceiverFactory = (options: ConstructorParameters<typeof ImWebSocketReceiver>[0]) => ImWebSocketReceiver;
export declare class ConnectionManager {
    private readonly options;
    private readonly createReceiver;
    private receiver?;
    private generation;
    private startTask?;
    private stopTask?;
    private running;
    private hasOpened;
    private needsCatchUp;
    private recoveryEpoch;
    private readonly checkpoints;
    private get logger();
    constructor(options: ConnectionManagerOptions, createReceiver?: ImWebSocketReceiverFactory);
    get connected(): boolean;
    start(): Promise<void>;
    stop(): Promise<void>;
    private performStart;
    private performStop;
    private createDesktopReceiver;
    private activate;
    private assertCurrent;
    private detachReceiver;
    private receiveInbound;
    private handleReconnecting;
    private handleOpen;
    private recoverMissedMessages;
    private seedCheckpoints;
    private messageIndex;
    private advanceCheckpoint;
}
//# sourceMappingURL=connection-manager.d.ts.map