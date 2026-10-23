import { DesktopWebSecureEvents } from './desktop-web-secure-events.js';
import { DesktopWebSecureBridgeHost } from './desktop-web-secure-bridge.js';
import { DesktopWebSecureIframeHost } from './desktop-web-secure-iframe.js';
import { DesktopWebSecureSocket, type DesktopWebSecureSocketContext, type DesktopWebSecureSocketOptions } from './desktop-web-secure-socket.js';
import { type DesktopWebSecureLocalStorage, type DesktopWebStorageValue } from './desktop-web-secure-local-storage.js';
import { type DesktopWebIdbConfig } from './desktop-web-secure-indexed-storage.js';
export interface DesktopCrossStorageOptions {
    async?: boolean | number | null;
    logger?: boolean;
}
export interface DesktopCrossStorageConfig {
    fallback?: unknown;
    url?: string;
    protocol?: string;
    allowOrigin?: string[];
    debug?: boolean;
    hostname?: string;
    scoket?: DesktopWebSecureSocketOptions;
    storage?: {
        dbStorage?: DesktopWebIdbConfig;
    };
    disableReportLogger?: boolean;
    verifySignMethod?: (values: unknown[]) => unknown;
    startStorageCheckerCallBack?: () => unknown;
}
export interface DesktopCrossStorageContext extends DesktopWebSecureSocketContext {
    readonly hostname: string;
    createLocalStorage(config?: DesktopCrossStorageConfig['storage']): DesktopWebSecureLocalStorage;
}
export interface DesktopCrossStorageValue extends Omit<DesktopWebStorageValue, 'from'> {
    from: number | string;
    code?: number;
}
type Values = DesktopCrossStorageValue[];
export declare class DesktopWebSecureCrossStorage extends DesktopWebSecureEvents {
    private readonly host;
    private readonly bridges;
    private readonly context;
    config: DesktopCrossStorageConfig;
    readonly client: DesktopWebSecureSocket;
    readonly storage: DesktopWebSecureLocalStorage;
    readonly storageX: DesktopWebSecureLocalStorage;
    sign?: {
        verify(values: unknown[]): Promise<unknown>;
    };
    readonly logger: {
        metrics(event: unknown): Promise<void>;
    };
    constructor(host: DesktopWebSecureIframeHost, bridges: DesktopWebSecureBridgeHost, context: DesktopCrossStorageContext, config?: DesktopCrossStorageConfig);
    listen: () => void;
    setConfig: (config: DesktopCrossStorageConfig) => Promise<void>;
    startStorageChecker: () => Promise<unknown>;
    startChecker: () => Promise<void>;
    setOriginStorageConfig: (config: unknown) => Promise<unknown>;
    setItem: (key: string, value: unknown, options?: DesktopCrossStorageOptions | null) => Promise<DesktopCrossStorageValue | undefined>;
    getItem: (key: string, options?: DesktopCrossStorageOptions | null) => Promise<DesktopCrossStorageValue | undefined>;
    getItemByKeys: (keys: string[], options?: DesktopCrossStorageOptions | null) => Promise<Values>;
    setItemByKeys: (entries: Array<[string, unknown]>, options?: DesktopCrossStorageOptions | null) => Promise<Values>;
    removeItem: (key: string) => Promise<unknown>;
    getLocalItemWithSignByKeys: (keys: string[]) => Promise<{
        values: Values;
        st: number;
        et: number;
    }>;
    initBirdgeEvent: () => void;
    private connected;
    private delay;
    private describe;
    private observe;
}
export {};
//# sourceMappingURL=desktop-web-secure-cross-storage.d.ts.map