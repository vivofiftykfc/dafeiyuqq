import { DesktopWebSecureEvents } from './desktop-web-secure-events.js';
export interface DesktopStorageFrameTarget {
    postMessage(data: unknown, targetOrigin: string): void;
}
export interface DesktopStorageFrameNode {
    parentNode: DesktopStorageFrameParent | null;
}
export interface DesktopStorageFrameParent extends DesktopStorageFrameNode {
    appendChild(node: DesktopStorageFrameNode): unknown;
    removeChild(node: DesktopStorageFrameNode): unknown;
}
export interface DesktopStorageFrameContainer extends DesktopStorageFrameParent {
    style: {
        display: string;
    };
    id: string;
}
export interface DesktopStorageFrameElement extends DesktopStorageFrameNode {
    style: {
        display: string;
    };
    src: string;
    contentWindow: DesktopStorageFrameTarget | null;
    onload: (() => void) | null;
}
export interface DesktopStorageFrameEvent {
    data: unknown;
    origin: string;
    source: DesktopStorageFrameTarget | null;
}
export interface DesktopStorageIframeContext {
    origin: string;
    document: {
        body: DesktopStorageFrameParent | null;
        readyState: string;
        visibilityState: string;
        getElementById(id: string): DesktopStorageFrameParent | null;
        createElement(tag: 'iframe'): DesktopStorageFrameElement;
        createElement(tag: 'div'): DesktopStorageFrameContainer;
        addEventListener(name: 'DOMContentLoaded' | 'visibilitychange', listener: () => void): void;
        removeEventListener(name: 'DOMContentLoaded' | 'visibilitychange', listener: () => void): void;
    };
    navigator: {
        userAgent: string;
        userAgentData?: unknown;
        storage?: {
            getDirectory?: unknown;
        };
        canShare?: unknown;
    };
    window: {
        Promise?: {
            allSettled?: unknown;
        };
        visualViewport?: unknown;
    };
    performance: {
        now?: () => number;
    };
    Date: {
        now(): number;
    };
    Math: {
        random(): number;
    };
    readLocalStorage(key: string): string | null;
    setTimeout(callback: () => void, delay: number): unknown;
    clearTimeout(handle: unknown): void;
    addMessageListener(listener: (event: DesktopStorageFrameEvent) => void): void;
    removeMessageListener(listener: (event: DesktopStorageFrameEvent) => void): void;
}
export interface DesktopStorageIframeConfig {
    ackTimeout?: number | undefined;
    url?: string | undefined;
    debug?: boolean;
}
export interface DesktopStorageConnectedFrame {
    startTime: number;
    endTime: number;
    fallback?: boolean;
    postMessage(data: unknown, targetOrigin?: string): void;
    destory(): void;
    isValid(): boolean;
}
export declare class DesktopWebSecureIframeHost {
    readonly context: DesktopStorageIframeContext;
    readonly flightErrors: {
        current: number;
        max: number;
    };
    readonly boxId: string;
    readonly originSuffix: string;
    private readonly latest;
    constructor(context: DesktopStorageIframeContext);
    createConnection(config?: DesktopStorageIframeConfig): DesktopWebSecureIframeConnection;
    resourceURL(base: string, version?: string, flavor?: string): string;
    fallbackURL(): string | undefined;
    now(): number;
    error(name: string, message?: string): Error;
    container(): Promise<{
        appendChild(frame: DesktopStorageFrameNode): unknown;
    }>;
    private supportsLatest;
}
export declare function isDesktopWebSecureModernBrowser(context: Pick<DesktopStorageIframeContext, 'navigator' | 'window'>): boolean;
export declare class DesktopWebSecureIframeConnection extends DesktopWebSecureEvents {
    private readonly host;
    readonly autoLoadIframeConfig: {
        max: number;
        current: number;
        iframeLoadPromise: Promise<DesktopStorageConnectedFrame> | null;
    };
    config: DesktopStorageIframeConfig;
    constructor(host: DesktopWebSecureIframeHost, config: DesktopStorageIframeConfig);
    reset: () => void;
    setConfig(config: DesktopStorageIframeConfig): void;
    start(): Promise<DesktopStorageConnectedFrame>;
    loadWindow: () => Promise<DesktopStorageConnectedFrame>;
    createPostMessageFlight: (post: (data: string) => void, timeout?: number) => Promise<void>;
    createIframeElement(url: string, ackTimeout?: number): Promise<DesktopStorageConnectedFrame>;
}
//# sourceMappingURL=desktop-web-secure-iframe.d.ts.map