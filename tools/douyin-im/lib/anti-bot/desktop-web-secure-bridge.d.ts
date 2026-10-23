export interface DesktopWebSecureBridgeMessage {
    data: unknown;
}
export interface DesktopWebSecureBridgeClient {
    window: Promise<unknown> | undefined;
    isConnection?: boolean | undefined;
    config: {
        debug?: boolean | undefined;
    };
    preCheck(): Promise<unknown>;
    postIframeMessage(message: {
        id: string;
        message: {
            callObj: string;
            callName: string;
            callArgs: unknown;
        };
    }): Promise<unknown>;
    getIframeState(): unknown;
    reStartConection(reason: string): void;
    on(name: 'message', listener: (message: DesktopWebSecureBridgeMessage) => void): unknown;
    off(name: 'message', listener: (message: DesktopWebSecureBridgeMessage) => void): unknown;
    emit(name: 'debug', event: {
        name: string;
        content?: string;
    }): unknown;
}
export interface DesktopWebSecureBridgeContext {
    readonly origin: string;
    readonly performance: {
        now?: () => number;
    };
    readonly Date: {
        now(): number;
    };
    setTimeout(callback: () => void, delay: number): unknown;
    clearTimeout(handle: unknown): void;
    addMessageListener(listener: (event: {
        data: unknown;
    }) => void): void;
}
export declare class DesktopWebSecureBridgeHost {
    private readonly context;
    private nextId;
    private retryBeforeId;
    private retry;
    private messageLogEnabled;
    private readonly entries;
    constructor(context: DesktopWebSecureBridgeContext);
    createBridge(client: DesktopWebSecureBridgeClient, retryTimeout?: boolean, timeout?: number): (callObj: string, callName: string, callArgs?: unknown) => Promise<unknown>;
    private enableMessageLog;
    private now;
    private error;
}
export interface DesktopWebSecureSocketEvent {
    origin: string;
    data: unknown;
    source: {
        postMessage(message: unknown, targetOrigin: string): void;
    } | null;
}
export interface DesktopWebSecureSocketConfig {
    url?: string | undefined;
    protocol?: string | undefined;
    allowOrigin?: string[] | undefined;
}
export interface DesktopWebSecureSocketDispatcher {
    originSuffix: string;
    emit(name: 'debug' | 'message', event: unknown): unknown;
}
export declare function dispatchDesktopWebSecureSocketMessage(config: DesktopWebSecureSocketConfig, event: DesktopWebSecureSocketEvent, dispatcher: DesktopWebSecureSocketDispatcher): void;
//# sourceMappingURL=desktop-web-secure-bridge.d.ts.map