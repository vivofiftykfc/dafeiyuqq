export interface ImageResource {
    oid: string;
    skey: string;
    md5: string;
    dataSize: number;
    width: number;
    height: number;
    originUrls: string[];
    largeUrls: string[];
    mediumUrls: string[];
    thumbUrls: string[];
}
export interface VideoResource {
    tkey: string;
    skey: string;
    md5: string;
    width: number;
    height: number;
    checkPics: string[];
    poster?: ImageResource;
}
export interface CencSubsample {
    clear: number;
    protected: number;
}
export declare function pickImageUrl(image: ImageResource): string | undefined;
export declare function decryptImage(encrypted: Uint8Array, skeyHex: string): Buffer;
export declare function decryptCencSample(data: Uint8Array, keyInput: Uint8Array, ivInput: Uint8Array, subsamples?: readonly CencSubsample[]): Buffer;
export type ImageFormat = 'webp' | 'jpeg' | 'png' | 'gif' | 'heic' | 'unknown';
export declare function sniffImageFormat(data: Uint8Array): ImageFormat;
//# sourceMappingURL=media.d.ts.map