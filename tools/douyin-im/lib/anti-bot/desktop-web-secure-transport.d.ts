import type { DesktopWebSecureManualHeaders, DesktopWebSecureManualSignData, DesktopWebSecureRequestPipeline } from './desktop-web-secure-request.js';
import { DesktopWebSecureEvents } from './desktop-web-secure-events.js';
export interface DesktopWebSecureXhr {
    secureOpenArgs?: IArguments;
    readyState?: number;
    onloadend?: unknown;
    onreadystatechange?: unknown;
    getAllResponseHeaders?: unknown;
}
export interface DesktopWebSecureXhrPrototype {
    open(this: DesktopWebSecureXhr, ...args: unknown[]): unknown;
    send(this: DesktopWebSecureXhr, ...args: unknown[]): unknown;
    setRequestHeader(this: DesktopWebSecureXhr, ...args: unknown[]): unknown;
}
interface HeaderMethods {
    set?(name: string, value: unknown): unknown;
    get?(name: string): unknown;
    forEach?(callback: (value: unknown, name: string) => void): unknown;
}
export interface DesktopWebSecureTransportWindow {
    readonly XMLHttpRequest: {
        prototype: DesktopWebSecureXhrPrototype;
    };
    fetch?(...args: unknown[]): unknown;
    Request?: unknown;
    Headers?: unknown;
}
export interface DesktopWebSecureTransportContext {
    readonly window: DesktopWebSecureTransportWindow;
    readonly XMLHttpRequest: {
        prototype: DesktopWebSecureXhrPrototype;
    };
    readonly URL: typeof URL;
    readonly location: {
        readonly href: string;
    };
    readonly Request: abstract new (...args: never[]) => {
        url: string;
        method: string;
        headers: {
            set(name: string, value: unknown): unknown;
        };
    };
    readonly Headers: abstract new (...args: never[]) => HeaderMethods;
    onBackgroundError?(error: unknown): void;
}
export interface DesktopWebSecureTransportFeatures {
    readonly fetch: boolean;
    readonly request: boolean;
    readonly headers: boolean;
}
export declare function captureDesktopWebSecureTransportFeatures(window: object): DesktopWebSecureTransportFeatures;
export declare function parseDesktopWebSecureResponseHeaders(text: string): Record<string, string | string[]>;
export declare class DesktopWebSecureTransportHooks extends DesktopWebSecureEvents {
    private readonly context;
    private readonly pipeline;
    config: Record<string, unknown>;
    updateData: boolean;
    login: boolean;
    initType: string;
    signType: string;
    private readonly nativeOpen;
    private readonly nativeSend;
    private readonly nativeSetHeader;
    private readonly nativeFetch;
    private readonly support;
    constructor(context: DesktopWebSecureTransportContext, pipeline: DesktopWebSecureRequestPipeline);
    setType: ({ initType, signType }: {
        initType?: string | undefined;
        signType?: string | undefined;
    }) => void;
    setConfig: (config: Record<string, unknown>) => void;
    setUpdateDataWhenVerifySuccess: (value: boolean) => void;
    setLogin: (value: boolean) => void;
    getBdTicketGuardHeader: (signData?: DesktopWebSecureManualSignData | null) => Promise<DesktopWebSecureManualHeaders>;
    private patchXhr;
    private patchFetch;
    private observe;
}
export {};
//# sourceMappingURL=desktop-web-secure-transport.d.ts.map