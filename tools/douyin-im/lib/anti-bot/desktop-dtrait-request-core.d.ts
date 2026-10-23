import type { DesktopDTraitAes, DesktopDTraitRsa, DesktopDTraitCryptoUtil } from './desktop-dtrait-crypto.js';
import { DesktopDTraitFeatures, type DesktopDTraitFeatureContext } from './desktop-dtrait-features.js';
import type { DesktopDTraitCore } from './desktop-dtrait-bootstrap.js';
export interface DesktopDTraitFeatureValues {
    bool?: Record<string, unknown> | null;
    num?: Record<string, unknown> | null;
    str?: Record<string, unknown> | null;
}
export interface DesktopDTraitRequestConfig {
    pathname: string;
    host?: string;
    headers?: Record<string, unknown> | string | null;
}
export interface DesktopDTraitRequestMeta {
    ucProxyParam?: Record<string, unknown>;
}
export interface DesktopDTraitRequestError {
    config: DesktopDTraitRequestConfig;
    err: unknown;
    instance?: DesktopDTraitRequestMeta;
    errType?: unknown;
}
export interface DesktopDTraitCoreMonitor {
    sendSlardarEvent?(value: Record<string, unknown>): unknown;
    sendTeaLog?(name: string, value: Record<string, unknown>): unknown;
    sendSlardarLog?(value: {
        content: string;
    }): unknown;
}
export interface DesktopDTraitCoreRealmState {
    hookLogCount: number;
    collectionCount: number;
    collectionErrors: {
        name: string;
    }[];
}
export interface DesktopDTraitRequestCoreContext {
    readonly Date: {
        now(): number;
    };
    readonly performance: {
        now(): number;
    };
    atob(value: string): string;
    readonly crypto: {
        aes?: Pick<DesktopDTraitAes, 'getAesKey' | 'encryptData'>;
        rsa?: Pick<DesktopDTraitRsa, 'encryptData'>;
        util?: Pick<DesktopDTraitCryptoUtil, 'uint8ArrayToHex'>;
    };
    readonly featureProtocol: Pick<DesktopDTraitFeatures, 'getResult' | 'addBoolFeature' | 'addNumFeature' | 'addStringFeature'>;
    readonly monitor?: DesktopDTraitCoreMonitor;
    collect(): Promise<DesktopDTraitFeatureValues>;
    readonly realmState?: DesktopDTraitCoreRealmState;
    installHooks(callbacks: {
        errorRequestConfig(input: DesktopDTraitRequestError): void;
        hookConfig(config: DesktopDTraitRequestConfig): {
            needProxy: boolean;
        };
        processRequestConfig(config: DesktopDTraitRequestConfig, meta: DesktopDTraitRequestMeta): Promise<DesktopDTraitRequestConfig>;
        processResponseConfig(response: {
            config: DesktopDTraitRequestConfig;
            headers?: Record<string, unknown> | string | null;
            httpCode?: number;
        }, meta?: DesktopDTraitRequestMeta): Promise<boolean>;
    }): void;
    onBackgroundError?(error: unknown): void;
}
export interface DesktopDTraitCoreContext extends Omit<DesktopDTraitRequestCoreContext, 'featureProtocol' | 'monitor'> {
    readonly featureContext: DesktopDTraitFeatureContext;
    setTimeout(callback: () => void, delay: number): unknown;
}
export declare function createDesktopDTraitCore(context: DesktopDTraitCoreContext): DesktopDTraitCore;
export declare class DesktopDTraitRequestCore {
    private readonly context;
    initPromise: Promise<unknown>;
    aesKey: string | undefined;
    centralRsaPub: string;
    centralVersion: unknown;
    centralRsaAesKey: string | undefined;
    edgeRsaPub: string;
    edgeVersion: unknown;
    edgeRsaAesKey: string;
    centralDTrait: string;
    edgeDTrait: string;
    dTraitToken: string;
    dTraitPathCache: Record<string, {
        time: number;
        val: Record<string, string> | null;
    }>;
    dTraitHooksPath: string[];
    dTraitHooksHost: string[];
    dTraitUrlRewriteRules: unknown[];
    collectStatus: boolean;
    readonly featureProtocol: DesktopDTraitRequestCoreContext['featureProtocol'];
    libraGroup: unknown;
    getLocalSource: () => Promise<unknown>;
    private readonly realmState;
    private readonly cacheLogList;
    private sendSlardarEventBase;
    private sendTeaLogBase;
    private sendSlardarLogBase;
    constructor(context: DesktopDTraitRequestCoreContext, params: Record<string, unknown>);
    sendSlardarEvent: (value: Record<string, unknown>) => unknown;
    sendTeaLog: (eventName: string, params: Record<string, unknown>) => unknown;
    sendSlardarLog: (value: {
        content: string;
    }) => unknown;
    updateMonitor: (monitor: DesktopDTraitCoreMonitor) => void;
    recordCollectionError: (name: string) => void;
    getOnlineSourceWithLog: () => Promise<DesktopDTraitFeatureValues>;
    setSource: () => void;
    updateFeatureScheduled: () => void;
    updateGetLocalSource: (source: () => Promise<unknown>) => void;
    getHooksConfig: () => {
        dTraitHooksHost: string[];
        dTraitHooksPath: string[];
        dTraitUrlRewriteRules: unknown[];
    };
    init: () => Promise<true>;
    getDTrait: () => Promise<true>;
    updateFeature: (source: DesktopDTraitFeatureValues) => void;
    rsaEncrypt: (key: string, plaintext: string) => Promise<string | undefined>;
    aesEncrypt: (key: string, plaintext: string) => Promise<string>;
    getCentralData: ({ path }: {
        path: string;
    }) => Promise<string>;
    getEdgeData: ({ path }: {
        path: string;
    }) => Promise<string>;
    getDTraitHeader: (input: {
        path: string;
    }) => Promise<Record<string, string> | null>;
    setDTraitToken: (token: string) => void;
    updateDTraitPath: (paths: string[]) => void;
    updateDTraitHost: (hosts: string[]) => void;
    updateUrlRewriteRules: (rules: unknown[]) => void;
    hookConfig: ({ pathname, host, }: DesktopDTraitRequestConfig) => {
        needProxy: boolean;
    };
    processRequestConfig: (config: DesktopDTraitRequestConfig, meta: DesktopDTraitRequestMeta) => Promise<DesktopDTraitRequestConfig>;
    processResponseConfig: (response: {
        config: DesktopDTraitRequestConfig;
        headers?: Record<string, unknown> | string | null;
        httpCode?: number;
    }, meta?: DesktopDTraitRequestMeta) => Promise<boolean>;
    private observe;
    errorRequestConfig: ({ config, instance, errType, }: DesktopDTraitRequestError) => void;
}
//# sourceMappingURL=desktop-dtrait-request-core.d.ts.map