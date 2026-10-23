import type { ImageAsset } from './content.js';
import { type DesktopScreenSize } from './desktop.js';
import { type ImageFormat } from './media.js';
export interface UploadClient {
    getCookies(): string;
    getUserAgent(): string;
    getDeviceId?(): string;
    getInstallId?(): string;
}
export interface UploadCredentials {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
    spaceName: string;
}
export interface VideoAsset {
    tkey: string;
    skey: string;
    md5: string;
}
export interface VodSignature {
    authorization: string;
    headers: Record<string, string>;
    canonicalQuery: string;
}
interface UploadProcessFunction {
    name: 'Encryption';
    input: {
        Config: Record<string, string>;
        PolicyParams: Record<string, string>;
    };
}
export declare function uploadProcessFunctions(fileType: 'image' | 'video' | 'object', imageFormat?: ImageFormat): UploadProcessFunction[];
export declare function canonicalUploadQuery(query: Record<string, string>): string;
export declare function signVodRequest(options: {
    method: 'GET' | 'POST';
    query: Record<string, string>;
    body?: Uint8Array;
    credentials: UploadCredentials;
    date: Date;
}): VodSignature;
export declare function crc32Hex(data: Uint8Array): string;
export declare class ImMediaUploader {
    private readonly client;
    private readonly userId;
    private readonly fetcher;
    private readonly deviceId;
    private readonly guid;
    private readonly screenSize;
    constructor(client: UploadClient, userId: () => Promise<string>, fetcher?: typeof fetch, deviceId?: () => Promise<string>, guid?: string, screenSize?: DesktopScreenSize);
    uploadImage(data: Uint8Array): Promise<ImageAsset>;
    uploadVideo(data: Uint8Array): Promise<VideoAsset>;
    uploadFile(data: Uint8Array, name: string): Promise<import('./cards.js').FileAsset>;
    private credentials;
    private apply;
    private putObject;
    private initParts;
    private transferPart;
    private finishParts;
    private commit;
    private signedVodJson;
    private browserHeaders;
    private storageHeaders;
}
export {};
//# sourceMappingURL=upload.d.ts.map