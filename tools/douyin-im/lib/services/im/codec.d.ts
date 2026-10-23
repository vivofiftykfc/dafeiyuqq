export interface EncodeRequestOptions {
    token: string;
    cmd: number;
    inboxType?: number;
    body?: Record<string, unknown>;
    sequenceId?: number;
    authType?: number;
    access?: string;
    deviceId?: string;
    devicePlatform?: string;
    headers?: Record<string, string>;
    sdkVersion?: string;
    buildNumber?: string;
    refer?: number;
    versionCode?: string;
    biz?: string;
}
export interface DecodedResponse {
    cmd: number;
    sequenceId: number;
    statusCode: number;
    errorDesc: string;
    inboxType: number;
    body: Record<string, unknown> | null;
    logId: string;
}
export declare function encodeRequest(opts: EncodeRequestOptions): Promise<Uint8Array>;
export declare function decodeResponse(buffer: Uint8Array): Promise<DecodedResponse>;
export declare function decodeRequestRaw(buffer: Uint8Array): Promise<Record<string, unknown>>;
export declare function decodeResponseRaw(buffer: Uint8Array): Promise<Record<string, unknown>>;
//# sourceMappingURL=codec.d.ts.map