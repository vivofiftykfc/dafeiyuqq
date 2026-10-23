import type { DesktopWebSecureCertificateXhr } from './desktop-web-secure-server-certificate.js';
export declare const DESKTOP_DTRAIT_PARAMETERS_KEY = "dtrait-sdk/s_sdk_server_cert_key";
export interface DesktopDTraitParametersContext {
    readonly window: {
        readonly XMLHttpRequest?: unknown;
        readonly FormData?: unknown;
    };
    readonly XMLHttpRequest: new () => DesktopWebSecureCertificateXhr;
    readonly document: {
        readonly cookie: string;
    };
    readonly localStorage: {
        getItem(key: string): string | null;
        setItem(key: string, value: string): void;
        removeItem(key: string): void;
    };
    readonly Date: {
        now(): number;
    };
    atob(value: string): string;
    btoa(value: string): string;
    setTimeout(callback: () => void, milliseconds: number): unknown;
}
export interface DesktopDTraitParameterResult extends Record<string, unknown> {
    centralRsaPub?: unknown;
    centralVersion?: unknown;
    edgeRsaPub?: unknown;
    edgeVersion?: unknown;
    urlVersion?: unknown;
    dTraitVersion?: unknown;
    dataFrom: 'local' | 'remote';
}
export declare class DesktopDTraitParameters {
    private readonly context;
    private pending;
    constructor(context: DesktopDTraitParametersContext);
    get: (aid: number | string | undefined, useCache?: boolean) => Promise<DesktopDTraitParameterResult>;
    private readOrFetch;
    private readCache;
    private requestWithTimeout;
    private request;
}
//# sourceMappingURL=desktop-dtrait-parameters.d.ts.map