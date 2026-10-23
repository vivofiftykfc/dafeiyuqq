import { DesktopWebSecureEvents } from './desktop-web-secure-events.js';
import { type DesktopWebSecureBridgeClient, type DesktopWebSecureBridgeMessage, type DesktopWebSecureSocketConfig, type DesktopWebSecureSocketEvent } from './desktop-web-secure-bridge.js';
import { DesktopWebSecureIframeHost, type DesktopWebSecureIframeConnection, type DesktopStorageConnectedFrame, type DesktopStorageFrameTarget } from './desktop-web-secure-iframe.js';
export interface DesktopWebSecureSocketOptions extends DesktopWebSecureSocketConfig {
    ackTimeout?: number;
    debug?: boolean | undefined;
    enableFallback?: boolean;
    downgradeCSPURL?: string | boolean;
    disablePreCheckConnection?: boolean;
}
export interface DesktopWebSecureSocketContext {
    window: DesktopStorageFrameTarget & {
        parent: DesktopStorageFrameTarget;
    };
    writeLocalStorage(key: string, value: string): void;
    onBackgroundError?: (error: unknown) => void;
}
export interface DesktopWebSecureSocketConnection {
    target: DesktopStorageConnectedFrame;
    startTime: number;
    endTime: number;
}
interface SocketEvents extends Record<string, unknown> {
    message: DesktopWebSecureBridgeMessage;
    connection: DesktopWebSecureSocketConnection;
    connectionFail: Error;
    error: Error;
    config: undefined;
}
export declare class DesktopWebSecureSocket extends DesktopWebSecureEvents<SocketEvents> implements DesktopWebSecureBridgeClient {
    private readonly host;
    private readonly context;
    config: DesktopWebSecureSocketOptions;
    readonly iframeConnection: DesktopWebSecureIframeConnection;
    window: Promise<DesktopWebSecureSocketConnection> | undefined;
    isStart: boolean | undefined;
    isConnection: boolean | undefined;
    loadTime: number;
    startTime: number;
    endTime: number;
    private parentCallIndex;
    private readonly originSuffix;
    constructor(host: DesktopWebSecureIframeHost, context: DesktopWebSecureSocketContext, config?: DesktopWebSecureSocketOptions);
    listen: () => void;
    getIframeState: () => {
        isConnection: number;
        retryCount: number;
        startTime: number;
        endTime: number;
        loadTime: number;
        origin: string;
    };
    postIframeMessage: (message: unknown) => Promise<void>;
    postWindowMessage: (target: DesktopStorageFrameTarget, type: unknown, data: unknown, targetOrigin?: string) => Promise<void>;
    postParentMessage: (type: unknown, data: unknown, targetOrigin?: string) => Promise<void>;
    dispatchParentEvent: (eventName: unknown, eventData: unknown) => Promise<void>;
    callParentBridge: (callObj: unknown, callName: unknown, callArgs?: unknown) => Promise<unknown>;
    startConnection: (reason: string) => void;
    reStartConection: (reason: string) => void;
    start: (config?: DesktopWebSecureSocketOptions) => Promise<void>;
    reConnection: () => Promise<DesktopWebSecureSocketConnection>;
    preCheck: () => Promise<void>;
    onMessage: (event: DesktopWebSecureSocketEvent) => void;
    initMessageEvent: () => void;
    removeMessageEvent: () => void;
    createConnection(url?: string): Promise<DesktopWebSecureSocketConnection>;
}
export {};
//# sourceMappingURL=desktop-web-secure-socket.d.ts.map