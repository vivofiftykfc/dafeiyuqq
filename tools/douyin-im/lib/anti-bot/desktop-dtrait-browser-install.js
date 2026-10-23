import { createDesktopDTraitBrowserCore, } from './desktop-dtrait-browser.js';
import { installDesktopDTraitCrypto, } from './desktop-dtrait-crypto.js';
const installed = new WeakMap();
export function installDesktopDTraitBrowser(realm, dependencies) {
    const previous = installed.get(realm.window);
    if (previous)
        return previous;
    const target = realm.window;
    if (target['DTraitSDK'])
        throw new Error('DTraitSDK already belongs to another browser owner');
    const result = assemble(realm, dependencies, target);
    target['DTraitSDK'] = result.core;
    installed.set(realm.window, result);
    return result;
}
function assemble(realm, dependencies, target) {
    const crypto = installDesktopDTraitCrypto({
        get window() {
            return realm.window;
        },
        get crypto() {
            return realm.crypto;
        },
        get location() {
            return realm.location;
        },
        get Math() {
            return realm.Math;
        },
        get TextEncoder() {
            return realm.TextEncoder;
        },
        atob: value => realm.atob(value),
        btoa: value => realm.btoa(value),
        loadCryptoJS: () => dependencies.loadCryptoJS(),
        loadJSEncrypt: () => dependencies.loadJSEncrypt(),
        onBackgroundError: error => dependencies.onBackgroundError?.(error),
    }, target);
    const core = createDesktopDTraitBrowserCore(realm, {
        crypto: {
            get aes() {
                return target['DTraitUcAesEncrypt'];
            },
            get rsa() {
                return target['DTraitUcRsaEncrypt'];
            },
            get util() {
                return target['DTraitUcCryptoJSUtil'];
            },
        },
        getCryptoUtil: () => target['DTraitUcCryptoJSUtil'],
        onBackgroundError: error => dependencies.onBackgroundError?.(error),
    });
    return { crypto, core };
}
//# sourceMappingURL=desktop-dtrait-browser-install.js.map