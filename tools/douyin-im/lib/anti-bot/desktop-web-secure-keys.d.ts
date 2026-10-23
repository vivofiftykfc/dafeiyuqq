import { DesktopWebSecureEvents } from './desktop-web-secure-events.js';
import { DesktopWebSecureSystemCrypto } from './desktop-web-secure-crypto.js';
import { type DesktopWebSecureKeyStore } from './desktop-web-secure-key-store.js';
import type { DesktopWebSecureServerCertificates } from './desktop-web-secure-server-certificate.js';
import { type DesktopStorageIframeContext } from './desktop-web-secure-iframe.js';
interface CryptRecord {
    ec_privateKey?: unknown;
    ec_publicKey?: unknown;
    ec_csr?: unknown;
}
export interface DesktopWebSecureKeysInfo {
    crypt?: CryptRecord;
    cryptData?: unknown;
    cert?: unknown;
    sign?: {
        ticket?: unknown;
        ts_sign?: unknown;
        client_cert?: unknown;
    };
    b64Cert?: string;
    b64PubKey?: string;
    b64Csr?: string;
    serverData?: unknown;
    dataFrom?: string;
    items?: unknown[];
    getKeysInfoTime?: number;
    cacheEnabled?: boolean;
}
export interface DesktopWebSecureScene {
    certType?: 'header' | 'cookie';
    scene: string;
}
export interface DesktopWebSecureSignInput extends DesktopWebSecureScene {
    keysInfo: DesktopWebSecureKeysInfo;
    sign_data?: string;
    req_content?: string;
    timestamp?: number;
    isNewCert?: boolean;
}
export interface DesktopWebSecureSignedData {
    result: string;
    times: {
        calTime: number;
        ecdhTime?: number;
        hmacTime?: number;
    };
    algoType: 'hmac' | 'ecdsa';
}
export interface DesktopWebSecureKeysSettings {
    disableCrossStorage?: boolean | undefined;
    updateKeys?: boolean | undefined;
    storageNamespace?: string | undefined;
    iframeBackURL?: string | undefined;
    iframeURL?: string | undefined;
    signType?: 'pubKey' | 'cert' | undefined;
    initType?: 'pubKey' | 'cert' | undefined;
    disableStorageSignData?: boolean | undefined;
}
export interface DesktopWebSecureKeysStoreSettings extends DesktopWebSecureKeysSettings {
    agid: number | string | undefined;
    ztIframe: boolean | undefined;
    enableCache: boolean;
}
export interface DesktopWebSecureKeysContext {
    readonly crypto: DesktopWebSecureSystemCrypto;
    readonly certificates: Pick<DesktopWebSecureServerCertificates, 'get'>;
    readonly Date: {
        new (): {
            getTime(): number;
        };
        now(): number;
    };
    readonly performance?: {
        now(): number;
    };
    readonly browser?: Pick<DesktopStorageIframeContext, 'navigator' | 'window'>;
    readonly document?: {
        readonly cookie: string;
        readonly location?: {
            readonly hostname: string;
        };
    };
    createKeyStore?(settings: DesktopWebSecureKeysStoreSettings): DesktopWebSecureKeyStore;
    onBackgroundError?(error: unknown): void;
}
declare class WebSecureKeyPair {
    private readonly crypto;
    private readonly clock;
    readonly pipeline: Promise<unknown>;
    private privateKey;
    private publicKey;
    constructor(crypto: DesktopWebSecureSystemCrypto, clock: {
        now(): number;
    }, keys: {
        privateKey?: unknown;
        publicKey?: unknown;
    });
    getKeys: () => Promise<{
        privateKey: unknown;
        publicKey: unknown;
    }>;
    sign: (text: string) => Promise<import("./desktop-web-secure-crypto.js").DesktopWebSecureSignature>;
    signWithHmac: (text: string, key: Uint8Array) => Promise<{
        result: string;
        times: {
            hmacTime: number;
        };
    }>;
    getCSR: () => string;
}
export declare class DesktopWebSecureKeys extends DesktopWebSecureEvents {
    private readonly context;
    private _storeSDK;
    private _cryptData;
    private _cryptObject;
    _initData: Record<string, unknown>;
    private _ecdh_key;
    private _hasProcessServerData;
    initMatch: boolean;
    cryptoSDK: WebSecureKeyPair | undefined;
    private readonly scheduler;
    _signData: string | undefined;
    private storageNamespace;
    private disableStorageSignData;
    private disableCrossStorage;
    private iframeURL;
    private iframeBackURL;
    private agid;
    private ztIframe;
    updateKeys: boolean | undefined;
    config: Record<string, unknown> | undefined;
    enableEcdh: boolean;
    enableCache: boolean;
    signType: 'pubKey' | 'cert';
    aid: number | string | undefined;
    initType: 'pubKey' | 'cert';
    constructor(context: DesktopWebSecureKeysContext, options?: {
        aid?: number;
        initType?: 'pubKey' | 'cert';
        storageNamespace?: string;
        disableStorageSignData?: boolean;
    });
    setType: ({ initType, signType }: Pick<DesktopWebSecureKeysSettings, "initType" | "signType">) => void;
    setDisableStorageSignData: (value: boolean) => void;
    setCrossStorageURL: (value: string) => void;
    setCrossStorageBackURL: (value: string) => void;
    setDisableCrossStorage: (value: boolean) => void;
    setStorageNamespace: (value: string) => void;
    setAgidAndHost: (agid: number | string, host?: string) => void;
    setUpdateKeys: (value: boolean) => void;
    setConfig: (value: Record<string, unknown>) => void;
    setAid: (value: number | string | undefined) => void;
    isTopBrowser: () => boolean;
    setEnableCache: (value: boolean) => void;
    setEnableEcdh: (value: boolean) => void;
    setContext: ({ disableCrossStorage, updateKeys, storageNamespace, iframeBackURL, iframeURL, signType, initType, disableStorageSignData }: DesktopWebSecureKeysSettings) => void;
    start: () => void;
    refresh: () => Promise<void>;
    initIframeStore: () => Promise<void>;
    initIframeKeys: () => Promise<void>;
    checkCryptKeys: () => Promise<boolean>;
    initPubKey: () => Promise<string | undefined>;
    initECDHKey: () => Promise<Uint8Array<ArrayBufferLike>>;
    checkSigningKeys(): Promise<boolean>;
    getCookieCryptStatus(): boolean;
    getIframeStatus(): boolean | undefined;
    getStorageStatus(): ReturnType<DesktopWebSecureKeyStore['getStorageStatus']>;
    getUsage(): Promise<'system'>;
    checkSignData(info: DesktopWebSecureKeysInfo | null | undefined): Promise<{
        match_md5_local: string;
        match_md5_iframe: string;
    }>;
    getKeysInfoWithOrigin({ certType, scene }: DesktopWebSecureScene): Promise<DesktopWebSecureKeysInfo>;
    signWithKeysInfo(input: DesktopWebSecureSignInput): Promise<DesktopWebSecureSignedData | null>;
    setSignValue: (input: {
        sign: unknown;
        scene: string;
        namespace?: string;
        logCtx?: {
            url: string;
            logId: unknown;
        };
    }) => boolean;
    setSignValueAsync(input: {
        sign: unknown;
        scene: string;
        namespace?: string;
        logCtx?: {
            url: string;
            logId: unknown;
        };
    }): Promise<boolean>;
    clearSignData(scene: string): Promise<boolean>;
    b642str(text: string): string;
    setKeysAndValues(keys: string[], values: unknown[]): void;
    private signValueWithIframe;
    private signText;
    private publicKeyBase64;
    initCookie: (scene?: string | undefined) => Promise<boolean>;
    processCookie(): Promise<void>;
    checkCookieMd5(): Promise<false | void>;
    private syncCookieMatch;
    private processCryptData;
    processServerCookie(scene?: string): Promise<boolean>;
    private matchesCertificate;
    private matchesPublicTicket;
    private initCert;
    private generateCertificatePem;
    private makePair;
    private performanceTime;
    private reportError;
    private observe;
    private backgroundError;
}
export {};
//# sourceMappingURL=desktop-web-secure-keys.d.ts.map