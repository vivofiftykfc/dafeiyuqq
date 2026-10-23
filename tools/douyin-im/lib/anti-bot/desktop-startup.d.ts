interface RefererStorage {
    getItem(key: string): unknown;
    removeItem(key: string): void;
}
export interface DesktopStartupContext {
    readonly window: {
        sessionStorage?: RefererStorage | null;
        localStorage?: RefererStorage | null;
        __ac_referer?: unknown;
        _sdkGlueVersionMap?: unknown;
        bdms?: unknown;
    };
    readonly document: {
        cookie: unknown;
        readonly referrer: unknown;
    };
}
export declare function initializeDesktopReferer(context: DesktopStartupContext): void;
export declare function initializeDesktopVersion(context: DesktopStartupContext): void;
export {};
//# sourceMappingURL=desktop-startup.d.ts.map