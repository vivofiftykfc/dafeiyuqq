import { DesktopWebSecureEvents } from './desktop-web-secure-events.js';
import { DesktopWebSecureKeys, type DesktopWebSecureKeysContext, type DesktopWebSecureKeysSettings } from './desktop-web-secure-keys.js';
import { DesktopWebSecureRequestPipeline, type DesktopWebSecureManualSignData } from './desktop-web-secure-request.js';
import { DesktopWebSecureTransportHooks, type DesktopWebSecureTransportContext } from './desktop-web-secure-transport.js';
import type { DesktopWebSecureSceneConfig } from './desktop-web-secure-config.js';
import type { DesktopWebSecureTcc } from './desktop-web-secure-tcc.js';
import { type DesktopStorageIframeContext } from './desktop-web-secure-iframe.js';
import { type DesktopWebSecureStoreContext } from './desktop-web-secure-store.js';
import type { DesktopWebSecureCacheContext } from './desktop-web-secure-cache.js';
export interface DesktopWebSecureTelemetry {
    setContext(value: Record<string, unknown>): void;
    dot(value: {
        name: unknown;
        metrics?: unknown;
        categories?: unknown;
    }): void;
    log(value: {
        content: unknown;
        level: unknown;
        extra: Record<string, unknown>;
    }): void;
    throw(value: {
        err: Error;
        extra: Record<string, unknown>;
    }): void;
    setEventParams?(value: Record<string, unknown>): void;
    initTicketGuard?(value: Record<string, unknown>): void;
    setWebId?(value: string | undefined): void;
    setEnv?(value: unknown): void;
    initTea?(value: {
        appId: number | string;
        config: Record<string, unknown>;
    }, options?: unknown): void;
    initDTrait?(value: Record<string, unknown>): void;
}
export interface DesktopWebSecureDTraitOptions {
    aid?: number | string | undefined;
    webId?: string | undefined;
    consumerPathList?: string[];
    urlRewriteRules?: unknown[];
    [key: string]: unknown;
}
export interface DesktopWebSecureSdkContext {
    readonly keys: Omit<DesktopWebSecureKeysContext, 'document' | 'browser'>;
    readonly transport: DesktopWebSecureTransportContext;
    readonly document: {
        readonly cookie: string;
        readonly location: {
            readonly hostname: string;
        };
    };
    readonly browser: Pick<DesktopStorageIframeContext, 'navigator' | 'window'>;
    readonly tcc: Pick<DesktopWebSecureTcc, 'getConfig'>;
    readonly storage?: {
        readonly iframe: DesktopStorageIframeContext;
        readonly store: DesktopWebSecureStoreContext;
        readonly cache: Omit<DesktopWebSecureCacheContext, 'document'>;
    };
    readonly telemetry?: DesktopWebSecureTelemetry;
    readonly dtrait?: {
        start(options: DesktopWebSecureDTraitOptions): Promise<unknown>;
        setWebId?(value: string | undefined): void;
    };
    onBackgroundError?(error: unknown): void;
}
export declare class DesktopWebSecureSdk extends DesktopWebSecureEvents {
    private readonly context;
    readonly cryptoSDK: DesktopWebSecureKeys;
    readonly pipeline: DesktopWebSecureRequestPipeline;
    readonly secureProxy: DesktopWebSecureTransportHooks;
    config: Record<string, DesktopWebSecureSceneConfig[]>;
    aid: number | string | undefined;
    enableEcdh: boolean | undefined;
    webid: string | undefined;
    private disableTcc;
    private loginStatus;
    private loginPromise;
    constructor(context: DesktopWebSecureSdkContext, options?: {
        containerVersion?: string;
        containerType?: string;
    });
    setConfig: (value: DesktopWebSecureSceneConfig) => void;
    setType: (value: Pick<DesktopWebSecureKeysSettings, "initType" | "signType">) => void;
    setNamespace: (value: string) => void;
    setAgidAndHost: (agid: number | string, host?: string) => void;
    setDisableCrossStorage: (value: boolean) => void;
    setDisableStorageSignData: (value: boolean) => void;
    setCrossStorageURL: (value: string) => void;
    setCrossStorageBackURL: (value: string) => void;
    setUpdateKeys: (value: boolean) => void;
    setContext: (value: DesktopWebSecureKeysSettings) => void;
    setEnableCache: (value: boolean) => void;
    setEnableEcdh: (value: boolean) => void;
    setUpdateDataWhenVerifySuccess: (value: boolean) => void;
    disableTccConfig: (value: boolean) => void;
    setLoginStatus: (value: boolean | (() => Promise<unknown>)) => void;
    setWebId: (value?: string, appId?: number | string, options?: unknown) => void;
    setSlardarEnv: (value: unknown) => void;
    startDTrait: (options: DesktopWebSecureDTraitOptions) => boolean;
    start: () => Promise<void>;
    refresh: () => Promise<void>;
    getBdTicketGuardHeader: (input?: DesktopWebSecureManualSignData | null) => Promise<import("./desktop-web-secure-request.js").DesktopWebSecureManualHeaders>;
    processSignCookie: () => Record<string, string>;
    sendEvent: (event: {
        name: unknown;
        metrics: unknown;
        categories?: Record<string, unknown>;
    }) => void;
    private forwardError;
    private forwardLog;
    private forwardKeysActivity;
    private forwardProxyActivity;
    private observe;
}
//# sourceMappingURL=desktop-web-secure-sdk.d.ts.map