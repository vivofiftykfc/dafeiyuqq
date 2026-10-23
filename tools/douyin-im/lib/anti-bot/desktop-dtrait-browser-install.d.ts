import { type DesktopDTraitBrowserRealm } from './desktop-dtrait-browser.js';
import { type DesktopDTraitCryptoContext } from './desktop-dtrait-crypto.js';
import type { DesktopDTraitTransportRealm } from './desktop-dtrait-transport.js';
export type DesktopDTraitBrowserInstallRealm = DesktopDTraitBrowserRealm & DesktopDTraitTransportRealm & Pick<DesktopDTraitCryptoContext, 'window' | 'crypto' | 'location'>;
export type DesktopDTraitBrowserDependencies = Pick<DesktopDTraitCryptoContext, 'loadCryptoJS' | 'loadJSEncrypt' | 'onBackgroundError'>;
export declare function installDesktopDTraitBrowser(realm: DesktopDTraitBrowserInstallRealm, dependencies: DesktopDTraitBrowserDependencies): {
    crypto: {
        aes: import("./desktop-dtrait-crypto.js").DesktopDTraitAes;
        rsa: import("./desktop-dtrait-crypto.js").DesktopDTraitRsa;
        util: import("./desktop-dtrait-crypto.js").DesktopDTraitCryptoUtil;
    };
    core: import("./desktop-dtrait-bootstrap.js").DesktopDTraitCore;
};
//# sourceMappingURL=desktop-dtrait-browser-install.d.ts.map