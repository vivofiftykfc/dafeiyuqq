import type { DesktopDTraitRequestConfig, DesktopDTraitRequestMeta, DesktopDTraitRequestError } from './desktop-dtrait-request-core.js';
export interface DesktopDTraitTransportConfig extends DesktopDTraitRequestConfig {
    method?: unknown;
    urlObj?: unknown;
    query?: Record<string, string>;
    fullUrl?: unknown;
    extras?: unknown;
}
export interface DesktopDTraitTransportResponse {
    config: DesktopDTraitTransportConfig;
    headers: Record<string, unknown>;
    reqHeaders: unknown;
    extras: unknown;
    httpCode?: number;
}
export interface DesktopDTraitTransportCallbacks {
    hookConfig(config: DesktopDTraitTransportConfig): {
        needProxy?: unknown;
        onlyProxyReq?: unknown;
        onlyProxyResp?: unknown;
    } | null | undefined;
    processRequestConfig(config: DesktopDTraitTransportConfig, instance: DesktopDTraitRequestMeta): Promise<DesktopDTraitTransportConfig | null | undefined>;
    processResponseConfig(response: DesktopDTraitTransportResponse, instance: DesktopDTraitRequestMeta): Promise<unknown>;
    errorRequestConfig?(error: DesktopDTraitRequestError): unknown;
}
export interface DesktopDTraitTransportXhr extends DesktopDTraitRequestMeta {
    secureOpenArgs?: IArguments;
    open(...args: unknown[]): unknown;
    send(...args: unknown[]): unknown;
    setRequestHeader(name: string, value: unknown): unknown;
    addEventListener(type: string, listener: (event: unknown) => void): unknown;
    readonly readyState: number;
    readonly status: number;
    getAllResponseHeaders?(): string;
    onloadend?: unknown;
    onreadystatechange?: unknown;
}
export interface DesktopDTraitFetchResponse {
    readonly headers?: {
        forEach?(callback: (value: string, key: string) => void): unknown;
        get?(name: string): unknown;
    } | undefined;
}
export interface DesktopDTraitFetchInit {
    method?: unknown;
    headers?: unknown;
}
interface HeaderSetter {
    set(name: string, value: unknown): unknown;
}
interface RequestInput {
    url: string;
    method: string;
    headers: HeaderSetter;
}
export interface DesktopDTraitTransportRealm {
    readonly window: {
        readonly location: {
            readonly href: string;
        };
        readonly XMLHttpRequest: {
            readonly prototype: DesktopDTraitTransportXhr;
        };
        fetch?(input: unknown, init?: DesktopDTraitFetchInit | undefined): Promise<DesktopDTraitFetchResponse>;
    };
    readonly XMLHttpRequest: {
        readonly prototype: DesktopDTraitTransportXhr;
    };
    readonly Request?: (new (...args: never[]) => RequestInput) | undefined;
    readonly Headers?: (new (...args: never[]) => HeaderSetter) | undefined;
    readonly URL: new (input: string, base: string) => {
        host: string;
        pathname: string;
        searchParams: {
            entries(): Iterable<[string, string]>;
        };
    };
    readonly Date: {
        now(): number;
    };
}
export interface DesktopDTraitTransportDiagnostics {
    onBackgroundError?(error: unknown): void;
    onDiagnostic?(code: 'fetch-headers'): void;
}
export declare function parseDesktopDTraitResponseHeaders(raw: string): Record<string, unknown>;
export declare function createDesktopDTraitTransportInstaller(realm: DesktopDTraitTransportRealm, diagnostics?: DesktopDTraitTransportDiagnostics): (callbacks: DesktopDTraitTransportCallbacks) => void;
export {};
//# sourceMappingURL=desktop-dtrait-transport.d.ts.map