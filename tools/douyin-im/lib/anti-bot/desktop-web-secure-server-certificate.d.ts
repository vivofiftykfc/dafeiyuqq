export interface DesktopWebSecureCertificateXhr {
    readonly readyState: number;
    readonly status: number;
    readonly response: unknown;
    onreadystatechange: (() => void) | null;
    open(method: string, url: string): void;
    setRequestHeader(name: string, value: string): void;
    send(body: string): void;
}
export interface DesktopWebSecureServerCertificateContext {
    readonly window: {
        readonly XMLHttpRequest?: unknown;
        readonly FormData?: unknown;
    };
    readonly XMLHttpRequest: new () => DesktopWebSecureCertificateXhr;
    readonly localStorage: {
        getItem(key: string): string | null;
        setItem(key: string, value: string): void;
    };
    readonly Date: {
        now(): number;
    };
    setTimeout(callback: () => void, milliseconds: number): unknown;
}
export interface DesktopWebSecureServerCertificate {
    cert: unknown;
    sn: unknown;
}
export declare const DESKTOP_WEB_SECURE_SERVER_CERTIFICATE_KEY = "security-sdk/s_sdk_server_cert_key";
export declare class DesktopWebSecureServerCertificates {
    private readonly context;
    private pending;
    constructor(context: DesktopWebSecureServerCertificateContext);
    get: (aid: number | string, useCache?: boolean) => Promise<DesktopWebSecureServerCertificate>;
    private readOrFetch;
    private requestWithTimeout;
    private request;
}
//# sourceMappingURL=desktop-web-secure-server-certificate.d.ts.map