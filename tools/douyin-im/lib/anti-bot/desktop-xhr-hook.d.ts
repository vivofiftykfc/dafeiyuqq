import { type DesktopTokenState, type DesktopXhrUrlContext } from './desktop-token.js';
type XhrMethod = DesktopHookXhr['open'];
interface DeferredInvocation {
    func: XhrMethod;
    args: unknown[];
}
export interface DesktopHookXhr {
    open(...args: unknown[]): unknown;
    setRequestHeader(...args: unknown[]): unknown;
    send(...args: unknown[]): unknown;
    bdmsInvokeList?: DeferredInvocation[];
}
export interface DesktopXhrHookContext extends DesktopXhrUrlContext {
    readonly XMLHttpRequest: {
        readonly prototype: DesktopHookXhr;
    };
    readonly Array: ArrayConstructor;
}
export interface DesktopXhrHookCallbacks {
    matchesSigning(pathname: string): boolean;
    matchesBehavior(pathname: string): boolean;
    sign(query: string, body: unknown): string;
    reportBehavior(): void;
}
export declare function installDesktopXhrHook(context: DesktopXhrHookContext, tokens: Pick<DesktopTokenState, 'token'>, callbacks: DesktopXhrHookCallbacks): void;
export {};
//# sourceMappingURL=desktop-xhr-hook.d.ts.map