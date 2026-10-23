import type { DesktopTokenState, DesktopXhrUrlContext } from './desktop-token.js';
import type { DesktopFetchHookCallbacks } from './desktop-fetch-hook.js';
export interface DesktopEventSourceHookContext extends DesktopXhrUrlContext {
    readonly window: {
        EventSource?: unknown;
    };
    readonly Object: Omit<ObjectConstructor, 'setPrototypeOf'> & {
        setPrototypeOf?: ObjectConstructor['setPrototypeOf'];
    };
    readonly Reflect: typeof Reflect | undefined;
    readonly Proxy: ProxyConstructor | undefined;
    readonly Boolean: BooleanConstructor;
    readonly TypeError: TypeErrorConstructor;
}
export interface DesktopEventSourceWrapper<T extends object = object> {
    new (input: string | URL, options?: unknown): T;
    (input: string | URL, options?: unknown): T;
    readonly prototype: object;
    handleUrl(input: string | URL): string | URL;
}
export declare function installDesktopEventSourceHook(context: DesktopEventSourceHookContext, tokens: Pick<DesktopTokenState, 'token'>, callbacks: DesktopFetchHookCallbacks): void;
//# sourceMappingURL=desktop-eventsource-hook.d.ts.map