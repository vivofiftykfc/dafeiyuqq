import type { DesktopWebSecureSdk } from './desktop-web-secure-sdk.js';
import type { DesktopWebSecureSceneConfig } from './desktop-web-secure-config.js';
export interface DesktopPassportSecureOptions extends DesktopWebSecureSceneConfig {
    agid?: number | string;
    initCallback?: () => unknown;
    enableHeaderOptions?: boolean;
    enableCookieOptions?: boolean;
    disableCrossStorage?: boolean;
}
export interface DesktopPassportSecurePluginProps {
    aid?: number | string;
    ztsdkOptions?: DesktopPassportSecureOptions;
    ssoZtsdkOptions?: DesktopWebSecureSceneConfig & {
        enable?: boolean;
    };
    dtrait?: boolean;
    dtraitOption?: unknown;
}
export interface DesktopPassportSecurePluginContext {
    readonly realm: object;
    readonly sdk: Pick<DesktopWebSecureSdk, 'setConfig' | 'setDisableCrossStorage' | 'setAgidAndHost' | 'setWebId' | 'start' | 'startDTrait'>;
    getCookie(name: string): string | null | undefined;
    onBackgroundError?(error: unknown): void;
}
export declare class DesktopPassportSecurePlugin {
    readonly context: DesktopPassportSecurePluginContext;
    initProps: DesktopPassportSecurePluginProps;
    hasInit: boolean;
    defaultConfig: DesktopWebSecureSceneConfig;
    defaultWebConsumerPathList: string[];
    constructor(context: DesktopPassportSecurePluginContext, initProps: DesktopPassportSecurePluginProps);
    init: () => void;
}
//# sourceMappingURL=desktop-passport-secure-plugin.d.ts.map