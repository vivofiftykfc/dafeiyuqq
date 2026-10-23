import type { webcrypto } from 'node:crypto';
export interface DesktopDTraitCryptoJS {
    lib: {
        WordArray: {
            create(bytes: Uint8Array): unknown;
        };
    };
    AES: {
        encrypt(text: unknown, key: unknown, options: unknown): {
            ciphertext: {
                toString(encoder: unknown): string;
            };
        };
    };
    mode: {
        CBC: unknown;
    };
    pad: {
        Pkcs7: unknown;
    };
    enc: {
        Base64: unknown;
    };
}
export interface DesktopDTraitRsaInstance {
    setPublicKey(key: string): void;
    encrypt(text: string): string | false;
}
export interface DesktopDTraitCryptoContext {
    readonly window: {
        crypto?: Pick<webcrypto.Crypto, 'subtle' | 'getRandomValues'>;
    };
    readonly crypto?: Pick<webcrypto.Crypto, 'subtle'> | undefined;
    readonly location: {
        search: string;
    };
    readonly Math: {
        random(): number;
    };
    readonly TextEncoder: typeof TextEncoder;
    atob(value: string): string;
    btoa(value: string): string;
    loadCryptoJS(): Promise<DesktopDTraitCryptoJS>;
    loadJSEncrypt(): Promise<{
        default: (new () => DesktopDTraitRsaInstance) | null;
    }>;
    onBackgroundError?(error: unknown): void;
}
export interface DesktopDTraitCipher {
    cipherText: string;
    encryptedData: string;
    iv: string;
}
export declare function createDesktopDTraitCryptoUtil(context: DesktopDTraitCryptoContext): {
    parseQuery: (text: string) => Record<string, string>;
    getQuery: (url?: string) => Record<string, string>;
    isSupportSystemCrypto: () => boolean;
    bufferConcat: (values: Uint8Array[]) => Uint8Array<ArrayBuffer>;
    buff2base64: (value: Uint8Array) => string;
    base642buff: (value: string) => Uint8Array<ArrayBuffer>;
    hexToUint8Array: (value: string) => Uint8Array<ArrayBuffer>;
    uint8ArrayToHex: (value: Uint8Array) => string;
    unit8ArrayToString: (value: Uint8Array) => string;
    getRandomValues: (value: Uint8Array) => Uint8Array<ArrayBufferLike>;
};
export type DesktopDTraitCryptoUtil = ReturnType<typeof createDesktopDTraitCryptoUtil>;
export declare class DesktopDTraitAes {
    private readonly context;
    supportSystemCrypto: boolean;
    cryptoJS: DesktopDTraitCryptoJS | null;
    initPromise: Promise<boolean>;
    readonly util: DesktopDTraitCryptoUtil;
    constructor(context: DesktopDTraitCryptoContext);
    init: () => Promise<boolean>;
    getIv: (length?: number) => Uint8Array;
    getAesKey: () => Uint8Array;
    encryptData: (hexKey: string, text: string) => Promise<DesktopDTraitCipher>;
    encryptDataWithLocal: (hexKey: string, text: string, iv: Uint8Array) => Promise<DesktopDTraitCipher>;
    encryptDataWithCryptoJS: (key: Uint8Array, text: string, iv: Uint8Array) => Promise<DesktopDTraitCipher>;
}
export declare class DesktopDTraitRsa {
    private readonly context;
    supportSystemCrypto: boolean;
    JSEncrypt: (new () => DesktopDTraitRsaInstance) | null;
    initPromise: Promise<boolean>;
    constructor(context: DesktopDTraitCryptoContext);
    init: () => Promise<boolean>;
    encryptData: (publicKey: string, text: string) => Promise<string>;
}
export declare function installDesktopDTraitCrypto(context: DesktopDTraitCryptoContext, target: Record<string, unknown>): {
    aes: DesktopDTraitAes;
    rsa: DesktopDTraitRsa;
    util: DesktopDTraitCryptoUtil;
};
//# sourceMappingURL=desktop-dtrait-crypto.d.ts.map