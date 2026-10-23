export declare function desktopBodyDigest(body: Uint8Array): string;
export interface ImProtoTransportClient {
    getUserAgent(): string;
    getCookies(): string;
    getInstallId?(): string;
}
export interface CookieProtoOptions {
    deviceId: string;
    sdkVersion: string;
    buildNumber: string;
    versionCode: string;
    devicePlatform: string;
    biz: string;
    access: string;
    headers: Record<string, string>;
    query?: Record<string, string>;
    httpUserAgent: string;
}
export declare class ImProtoTransportError extends Error {
    readonly stage: 'network' | 'http' | 'decode';
    readonly cmd: number;
    readonly endpoint: string;
    readonly name = "ImProtoTransportError";
    constructor(stage: 'network' | 'http' | 'decode', cmd: number, endpoint: string, message: string, options?: ErrorOptions);
}
export declare class ImProtoTransport {
    private readonly client;
    private readonly installId;
    constructor(client: ImProtoTransportClient);
    sendCookieProto(cmd: number, inboxType: number, endpoint: string, body: Record<string, unknown>, opts: CookieProtoOptions): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=transport.d.ts.map