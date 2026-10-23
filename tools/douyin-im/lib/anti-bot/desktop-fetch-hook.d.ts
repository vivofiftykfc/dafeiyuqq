import type { DesktopTokenState, DesktopXhrUrlContext } from './desktop-token.js';
export interface DesktopFetchHookContext extends DesktopXhrUrlContext {
    readonly window: {
        fetch?(...args: unknown[]): unknown;
    };
    readonly Request: typeof Request;
}
export interface DesktopFetchHookCallbacks {
    matchesSigning(pathname: string): boolean;
    matchesBehavior(pathname: string): boolean;
    sign(query: string, body: unknown, contentType?: string): string;
    reportBehavior(): void;
}
export declare function installDesktopFetchHook(context: DesktopFetchHookContext, tokens: Pick<DesktopTokenState, 'token'>, callbacks: DesktopFetchHookCallbacks): void;
//# sourceMappingURL=desktop-fetch-hook.d.ts.map