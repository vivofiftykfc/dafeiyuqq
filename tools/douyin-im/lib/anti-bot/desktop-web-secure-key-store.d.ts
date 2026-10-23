import { DesktopWebSecureEvents } from './desktop-web-secure-events.js';
import { DesktopWebSecureStore } from './desktop-web-secure-store.js';
import { DesktopWebSecureMemoryCache, type DesktopWebSecureCacheContext, type DesktopWebSecureCacheSummary } from './desktop-web-secure-cache.js';
import { DesktopWebSecureCookieOperator } from './desktop-web-secure-cookie.js';
export interface DesktopWebSecureCachedOriginValues {
    data: Record<string, {
        value: unknown;
        key: string;
    }>;
    from: string;
    summary: DesktopWebSecureCacheSummary;
}
export interface DesktopWebSecureKeyStoreOptions {
    agId?: string | number;
    enableCache?: boolean;
    getInitKeys?: () => string[];
}
export interface DesktopWebSecureKeyStoreContext extends DesktopWebSecureCacheContext {
    createStore(): DesktopWebSecureStore;
}
export declare const DESKTOP_WEB_SECURE_INIT_KEYS: readonly ["s_sdk_crypt_sdk", "s_sdk_cert_key", "s_sdk_sign_data_key/web_protect"];
export declare class DesktopWebSecureKeyStore extends DesktopWebSecureEvents {
    private readonly context;
    readonly cookieOperate: DesktopWebSecureCookieOperator;
    readonly store: DesktopWebSecureStore;
    readonly memoryCache: DesktopWebSecureMemoryCache;
    readonly loadIframePromise: Promise<void> | undefined;
    readonly get: (key: string) => Promise<unknown>;
    readonly set: (key: string, value: unknown, sync?: unknown) => Promise<{
        cross: string;
    } | undefined>;
    readonly delete: (key: string) => Promise<void>;
    readonly getItems: (keys: string[]) => Promise<Record<string, unknown> | undefined>;
    readonly setItems: (keys: string[], values: unknown[], ignored?: unknown) => Promise<{
        cross: string;
    } | undefined>;
    readonly getItemsWithOrigin: (keys: string[]) => Promise<Awaited<ReturnType<DesktopWebSecureStore['getItemsWithOrigin']>> | DesktopWebSecureCachedOriginValues | undefined>;
    readonly getLocalItem: (key: string) => Promise<unknown>;
    readonly setLocalItem: (key: string, value: unknown) => Promise<void>;
    readonly getLocalItems: (keys: string[]) => Promise<Record<string, unknown> | undefined>;
    readonly getIframeStatus: DesktopWebSecureStore['getIframeStatus'];
    readonly getStorageStatus: DesktopWebSecureStore['getStorageStatus'];
    readonly startStorageChecker: DesktopWebSecureStore['startStorageChecker'];
    constructor(context: DesktopWebSecureKeyStoreContext, options?: DesktopWebSecureKeyStoreOptions);
    reportError: (error: unknown, name: string, scope?: string, operation?: string, args?: unknown[]) => void;
    private guard;
    private observe;
}
//# sourceMappingURL=desktop-web-secure-key-store.d.ts.map