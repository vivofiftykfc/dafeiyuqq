export interface DesktopWebSecureSceneConfig {
    aid?: number | string | undefined;
    scene?: string;
    certType?: string;
    signVersion?: unknown;
    signTimeout?: unknown;
    urlRewriteRules?: unknown;
    providerPathList?: string[];
    providerHostPathList?: string[];
    onlyProviderPathList?: string[];
    consumerPathList?: string[];
    consumerHostList?: string[];
    consumerHostPathList?: string[];
    excludeConsumerPathList?: string[];
    excludeReportPathList?: string[];
    [key: string]: unknown;
}
export interface DesktopWebSecureMatch {
    needProxy: boolean;
    onlyProxyResp?: boolean;
    providerConfig?: DesktopWebSecureSceneConfig | undefined;
    consumerConfig?: DesktopWebSecureSceneConfig | undefined;
    signType?: string | undefined;
    initType?: string | undefined;
    pathname?: string;
    hostname?: string | undefined;
    needReport?: boolean;
}
export declare class DesktopWebSecureConfiguration {
    aid: number | string | undefined;
    readonly config: Record<string, DesktopWebSecureSceneConfig[]>;
    setConfig(value: DesktopWebSecureSceneConfig): void;
    applyRemoteConfig(value: Record<string, unknown> | null | undefined): void;
}
export declare function classifyDesktopWebSecureRequest(request: {
    url?: string;
} | null | undefined, config: Record<string, unknown> | null | undefined, pageHref: string, signType?: string, initType?: string): DesktopWebSecureMatch;
//# sourceMappingURL=desktop-web-secure-config.d.ts.map