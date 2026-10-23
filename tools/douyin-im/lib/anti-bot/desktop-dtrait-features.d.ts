import type { DesktopDTraitCryptoUtil } from './desktop-dtrait-crypto.js';
export interface DesktopDTraitHashContext {
    readonly encoder: {
        encode(value?: string): Uint8Array;
    };
    onDiagnostic(code: 'murmur3_len' | 'murmur3_encode'): void;
}
export declare function createDesktopDTraitHash(context: DesktopDTraitHashContext): (value: unknown, seed?: number) => number;
export interface DesktopDTraitFeatureContext {
    hash(value: unknown): number;
    getCryptoUtil(): Pick<DesktopDTraitCryptoUtil, 'bufferConcat'> | null | undefined;
    btoa(value: string): string;
}
export interface DesktopDTraitFeatureOptions {
    reserved?: number;
    dTraitType?: number;
    version?: number;
}
export declare class DesktopDTraitFeatures {
    private readonly context;
    reserved: number;
    dTraitType: number;
    centralAccessType: number;
    edgeAccessType: number;
    version: number;
    boolFeatures: Record<string, unknown>;
    numberFeatures: Record<string, unknown>;
    centralStringFeatures: Record<string, unknown>;
    edgeStringFeatures: Record<string, unknown>;
    constructor(context: DesktopDTraitFeatureContext, options: DesktopDTraitFeatureOptions);
    addBoolFeature(name: string, value: unknown): void;
    addNumFeature(name: string, value: unknown): void;
    addStringFeature(name: string, value: unknown): void;
    getCentralStringBuffer(): Uint8Array;
    getEdgeStringBuffer(): Uint8Array;
    getNumberBuffer(): Uint8Array;
    getBoolBuffer(): Uint8Array;
    getResult(): {
        centralString: string;
        edgeString: string;
    };
}
//# sourceMappingURL=desktop-dtrait-features.d.ts.map