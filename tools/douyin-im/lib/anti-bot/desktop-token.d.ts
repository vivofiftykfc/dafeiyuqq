export interface DesktopTokenContext {
    readonly localStorage: {
        getItem(key: string): string | null;
        setItem(key: string, value: string): void;
    };
    requestAnimationFrame(callback: (time: number) => void): unknown;
}
export declare class DesktopTokenState {
    private readonly context;
    private inner;
    constructor(context: DesktopTokenContext);
    get token(): string;
    onReportLoad(xhr: {
        getResponseHeader(name: string): string | null;
    }, deviceReport: (time: number) => void): void;
}
export interface DesktopXhrUrlContext {
    readonly URL: typeof URL;
    readonly location: {
        readonly href: string;
    };
}
export declare function signDesktopXhrUrl(context: DesktopXhrUrlContext, input: string | URL, body: unknown, state: Pick<DesktopTokenState, 'token'>, signer: {
    sign(query: string, body: unknown): string;
}): string | URL;
export declare function prepareDesktopXhrUrl(context: DesktopXhrUrlContext, input: string | URL, body: unknown, state: Pick<DesktopTokenState, 'token'>, signer: {
    sign(query: string, body: unknown): string;
}): {
    url: URL;
    isUrl: boolean;
};
//# sourceMappingURL=desktop-token.d.ts.map