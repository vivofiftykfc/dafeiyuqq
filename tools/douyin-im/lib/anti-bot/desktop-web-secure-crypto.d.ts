import type { webcrypto } from 'node:crypto';
export interface DesktopWebSecurePemPair {
    publicPem: string;
    privatePem: string;
}
export interface DesktopWebSecureSignature {
    hex: string;
    buffer: ArrayBuffer;
}
export declare class DesktopWebSecureSystemCrypto {
    private readonly subtle;
    constructor(subtle?: webcrypto.SubtleCrypto);
    generateNewKeyPairPEM: () => Promise<DesktopWebSecurePemPair>;
    signWithECDSA: (privatePem: string, text: string) => Promise<DesktopWebSecureSignature>;
    verifyWithECDSA: (publicPem: string, rawSignature: Uint8Array, text: string) => Promise<boolean>;
    validateKeyPair(privatePem: string, publicPem: string): Promise<boolean>;
    hmacSha256(key: Uint8Array, text: string): Promise<string>;
    extractPublicKeyHexFromPem: (publicPem: string) => Promise<{
        hex: string;
        rawHex: string;
    }>;
    extractPublicKeyFromPrivateKey: (privatePem: string) => Promise<DesktopWebSecureSignature & {
        rawHex: string;
    }>;
    extractPrivateKeyHexFromPem: (privatePem: string) => Promise<{
        privateKeyHex: string;
        privateKeyPKCSHex: string;
    }>;
    extractPublicKeyFromX509Cert: (certificatePem: string) => Promise<Uint8Array>;
    deriveEcdhKey: (privatePem: string, certificatePem: string) => Promise<{
        hex: string;
        bytes: Uint8Array;
    }>;
    private certificatePublicKey;
    private run;
}
export declare function desktopWebSecureSignatureDer(raw: ArrayBuffer): ArrayBuffer;
//# sourceMappingURL=desktop-web-secure-crypto.d.ts.map