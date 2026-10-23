import { DesktopWebSecureEvents } from './desktop-web-secure-events.js';
import { DesktopWebSecureIframeHost } from './desktop-web-secure-iframe.js';
import { DesktopWebSecureBridgeHost } from './desktop-web-secure-bridge.js';
import { DesktopWebSecureCrossStorage, type DesktopCrossStorageContext } from './desktop-web-secure-cross-storage.js';
import { type DesktopWebSecureLocalStorage } from './desktop-web-secure-local-storage.js';
export interface DesktopWebSecureStoreConfig {
    url?: string;
    namespace?: string;
    disableCrossStorage?: boolean;
    ztIframe?: boolean;
    agid?: unknown;
    fallbackCacheOriginURL?: unknown;
    sendEvent?: (event: {
        name: string;
        metrics: unknown;
        categories: unknown;
    }) => unknown;
}
export interface DesktopWebSecureStoreContext extends DesktopCrossStorageContext {
    readCookie(): string;
    queryIframes(): {
        length: number;
        forEach(callback: (frame: {
            src?: string;
        }) => void): void;
    } | undefined;
}
export interface DesktopWebSecureOriginValues {
    data: Record<string, {
        key: string;
        value: unknown;
        from: string;
        origin: string;
    }>;
    from?: string;
}
export declare class DesktopWebSecureStore extends DesktopWebSecureEvents {
    private readonly host;
    private readonly context;
    readonly config: DesktopWebSecureStoreConfig;
    readonly disableCrossStorage: boolean | undefined;
    readonly localStore: DesktopWebSecureLocalStorage;
    readonly storage: DesktopWebSecureCrossStorage | undefined;
    readonly loadIframePromise: Promise<void> | undefined;
    hasCheckIframeStatus: boolean | undefined;
    iframeStatus: boolean | undefined;
    crossStatus: boolean | undefined;
    constructor(host: DesktopWebSecureIframeHost, bridges: DesktopWebSecureBridgeHost, context: DesktopWebSecureStoreContext, config?: DesktopWebSecureStoreConfig);
    startStorageChecker: () => void;
    initLoadIframePromise: () => Promise<void>;
    getStorageStatus: () => ReturnType<DesktopWebSecureCrossStorage["client"]["getIframeState"]> | undefined;
    _createStorageKey: (key: string) => string;
    getItem: (key: string) => Promise<unknown>;
    getLocalItem: (key: string) => Promise<unknown>;
    setLocalItem: (key: string, value: unknown) => Promise<void>;
    getLocalItemsWithKeys: (keys: string[]) => Promise<Record<string, unknown>>;
    getItemWithKeys: (keys: string[]) => Promise<Record<string, unknown>>;
    getItemsWithOrigin: (keys: string[]) => Promise<DesktopWebSecureOriginValues>;
    setItemWithKeys: (keys: string[], values: unknown[], _ignored?: unknown) => Promise<{
        cross: string;
    }>;
    setItem: (key: string, value: unknown, sync?: unknown) => Promise<{
        cross: string;
    }>;
    deleteItem: (key: string) => Promise<void>;
    checkIframeStatus: (unload?: unknown) => void;
    getIframeStatus: () => boolean | undefined;
    verifySignMethod: (values: unknown[]) => boolean;
    private time;
    private project;
    private observe;
}
//# sourceMappingURL=desktop-web-secure-store.d.ts.map