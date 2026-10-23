import { DesktopDTraitParameters, type DesktopDTraitParametersContext } from './desktop-dtrait-parameters.js';
import type { DesktopWebSecureDTraitOptions } from './desktop-web-secure-sdk.js';
export interface DesktopDTraitMonitor {
    init(value: Record<string, unknown>, instances: {
        slardarInstance?: unknown;
        teaInstance?: unknown;
    }): unknown;
    setConfig(value: Record<string, unknown>): unknown;
    setWebId?(value: string | undefined): void;
    sendSlardarEvent(value: Record<string, unknown>): unknown;
    sendSlardarLog(value: {
        content: string;
    }): unknown;
    sendTeaLog(...args: unknown[]): unknown;
}
export interface DesktopDTraitCore {
    getInstance(params: Record<string, unknown>, options: Record<string, unknown>): unknown;
}
export interface DesktopDTraitScript {
    type: string;
    src: string;
    readonly readyState?: string;
    onreadystatechange?: (() => void) | null;
    onload?: (() => void) | null;
    onerror?: ((error: unknown) => void) | null;
}
export interface DesktopDTraitBootstrapContext {
    readonly localCore?: {
        load(version: unknown, aid: number | string | undefined): Promise<boolean>;
        resolve(params: Record<string, unknown>): DesktopDTraitCore;
    };
    readonly parameters: DesktopDTraitParametersContext;
    readonly window: {
        DTraitSDK?: DesktopDTraitCore | {
            default: DesktopDTraitCore;
        };
        readonly DTraitUcAesEncrypt?: unknown;
        readonly DTraitUcRsaEncrypt?: unknown;
        readonly DTraitUcCryptoJSUtil?: unknown;
    };
    readonly document: {
        createElement(tag: 'script'): DesktopDTraitScript;
        getElementsByTagName(tag: 'head'): ArrayLike<{
            appendChild(script: DesktopDTraitScript): unknown;
        }>;
    };
    readonly monitor: DesktopDTraitMonitor;
    readonly monitorInstances?: {
        slardarInstance?: unknown;
        teaInstance?: unknown;
    };
    readonly performance?: {
        now?(): number;
    };
}
export declare class DesktopDTraitBootstrap {
    private readonly context;
    readonly parameters: DesktopDTraitParameters;
    private coreResult;
    private loaded;
    private loading;
    private readonly builtin;
    constructor(context: DesktopDTraitBootstrapContext);
    setWebId: (value: string | undefined) => void;
    start: (options: DesktopWebSecureDTraitOptions) => Promise<unknown>;
    private cryptoPresence;
    private loadCore;
    private loadWithRetry;
    private loadScript;
}
//# sourceMappingURL=desktop-dtrait-bootstrap.d.ts.map