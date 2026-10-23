export interface DesktopWebSecureCacheContext {
    readonly document: {
        cookie: string;
        readonly location: {
            readonly hostname: string;
        };
    };
    readonly Math: {
        random(): number;
    };
    readonly onBackgroundError?: (error: unknown) => void;
}
export interface DesktopWebSecureCacheSummary {
    total: number;
    hit: number;
    pending: number;
    miss: number;
    missKeys: string[];
}
interface GetterOptions<A extends unknown[], R, P> {
    extractKeysFromArgs?: (args: A) => string | string[];
    extractDataFromResponse?: (response: Awaited<R>, args: A) => Record<string, unknown>;
    packData?: (data: Record<string, unknown>, args: A, summary: DesktopWebSecureCacheSummary, responses?: unknown[]) => P;
}
export declare class DesktopWebSecureMemoryCache {
    private readonly context;
    private readonly agId;
    private readonly store;
    private readonly queue;
    private disabled;
    constructor(context: DesktopWebSecureCacheContext, agId: string | number | undefined);
    setDisabled: (disabled: boolean) => void;
    isEnabled: () => boolean;
    clear: () => void;
    wrapGetter: <A extends unknown[], R, P = Record<string, unknown>>(read: (...args: A) => R, options: GetterOptions<A, R, P>) => ((...args: A) => R | Promise<P>);
    wrapSetter: <A extends unknown[], R>(write: (...args: A) => R, options: {
        extractDataFromArgs: (args: A) => Record<string, unknown>;
    }) => ((...args: A) => R);
    wrapUpdater: <A extends unknown[], R>(update: (...args: A) => R, extractKeys?: (args: A) => string | string[], mode?: string) => ((...args: A) => R);
    private get;
    private needUpdate;
    private cookieKey;
    private readVersion;
    private updateVersion;
    private clearVersion;
    private domain;
    private equal;
    private observe;
}
export {};
//# sourceMappingURL=desktop-web-secure-cache.d.ts.map