export interface DesktopWebSecureTccXhr {
    readonly readyState: number;
    readonly status: number;
    readonly response: unknown;
    onreadystatechange: (() => void) | null;
    open(method: string, url: string, asynchronous: boolean): void;
    send(): void;
}
export interface DesktopWebSecureTccContext {
    readonly window: {
        readonly XMLHttpRequest?: unknown;
        readonly localStorage: {
            getItem(key: string): string | null;
            setItem(key: string, value: string): void;
        };
    };
    readonly XMLHttpRequest: new () => DesktopWebSecureTccXhr;
    readonly Date: new () => {
        getTime(): number;
    };
}
export interface DesktopWebSecureTccQuery {
    tccPsm: string;
    zone?: string;
    key?: string;
}
export declare class DesktopWebSecureTcc {
    private readonly context;
    private initialized;
    private readonly configs;
    constructor(context: DesktopWebSecureTccContext);
    getConfig({ tccPsm, zone, key }: DesktopWebSecureTccQuery): Promise<unknown>;
    private init;
    private readCache;
    private saveCache;
    private fetchConfig;
}
//# sourceMappingURL=desktop-web-secure-tcc.d.ts.map