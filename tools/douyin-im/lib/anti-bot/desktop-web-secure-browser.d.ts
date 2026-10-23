import { DesktopWebSecureSdk, type DesktopWebSecureSdkContext, type DesktopWebSecureTelemetry } from './desktop-web-secure-sdk.js';
import { type DesktopWebSecureTccContext } from './desktop-web-secure-tcc.js';
import type { DesktopWebStorageArea } from './desktop-web-secure-local-storage.js';
import type { DesktopStorageIframeContext } from './desktop-web-secure-iframe.js';
import type { DesktopWebSecureTransportContext } from './desktop-web-secure-transport.js';
import type { DesktopWebSecureSocketContext } from './desktop-web-secure-socket.js';
import { type DesktopDTraitBrowserBootstrapOptions, type DesktopDTraitBrowserBootstrapRealm } from './desktop-dtrait-browser-bootstrap.js';
export type DesktopWebSecureBrowserRealm = DesktopDTraitBrowserBootstrapRealm & {
    readonly window: DesktopWebSecureTransportContext['window'] & DesktopWebSecureSocketContext['window'] & DesktopStorageIframeContext['window'] & DesktopWebSecureTccContext['window'];
    readonly document: DesktopStorageIframeContext['document'] & DesktopWebSecureSdkContext['document'] & {
        cookie: string;
    };
    readonly location: {
        href: string;
        origin: string;
        hostname: string;
        search: string;
    };
    readonly navigator: DesktopStorageIframeContext['navigator'];
    readonly Date: {
        new (): {
            getTime(): number;
        };
        now(): number;
    };
    readonly localStorage: DesktopWebStorageArea;
    readonly Request: DesktopWebSecureTransportContext['Request'];
    readonly Headers: DesktopWebSecureTransportContext['Headers'];
    readonly URL: typeof URL;
    readonly crypto: NonNullable<DesktopDTraitBrowserBootstrapRealm['crypto']>;
    readonly indexedDB?: unknown;
    readonly webkitIndexedDB?: unknown;
    readonly mozIndexedDB?: unknown;
    readonly OIndexedDB?: unknown;
    addEventListener(type: 'message', listener: (event: unknown) => void): void;
    removeEventListener(type: 'message', listener: (event: unknown) => void): void;
};
export interface DesktopWebSecureBrowserOptions extends DesktopDTraitBrowserBootstrapOptions {
    telemetry?: DesktopWebSecureTelemetry;
    containerVersion?: string;
    containerType?: string;
}
export interface DesktopLoginWebSecureConfig {
    aid?: number | string | undefined;
    device_id?: string | undefined;
}
export declare function startDesktopLoginWebSecure(realm: DesktopWebSecureBrowserRealm, options: DesktopWebSecureBrowserOptions, config: DesktopLoginWebSecureConfig): void;
export declare function createDesktopWebSecureBrowser(realm: DesktopWebSecureBrowserRealm, options: DesktopWebSecureBrowserOptions): DesktopWebSecureSdk;
//# sourceMappingURL=desktop-web-secure-browser.d.ts.map