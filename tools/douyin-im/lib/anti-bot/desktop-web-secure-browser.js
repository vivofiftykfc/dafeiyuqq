import { DesktopWebSecureSdk, } from './desktop-web-secure-sdk.js';
import { DesktopWebSecureSystemCrypto } from './desktop-web-secure-crypto.js';
import { DesktopWebSecureTcc, } from './desktop-web-secure-tcc.js';
import { DesktopWebSecureServerCertificates, } from './desktop-web-secure-server-certificate.js';
import { DesktopWebSecureIndexedStorageHost, } from './desktop-web-secure-indexed-storage.js';
import { createDesktopDTraitBrowserBootstrap, } from './desktop-dtrait-browser-bootstrap.js';
const owners = new WeakMap();
export function startDesktopLoginWebSecure(realm, options, config) {
    const observe = (pending) => {
        void pending.catch(error => {
            try {
                options.onBackgroundError?.(error);
            }
            catch {
            }
        });
    };
    observe(Promise.resolve()
        .then(() => createDesktopWebSecureBrowser(realm, {
        ...options,
        containerType: options.containerType ?? 'sdk',
        containerVersion: options.containerVersion ?? '3.2.5',
    }))
        .then(sdk => {
        sdk.setConfig({ aid: config.aid, scene: 'login', certType: 'header' });
        sdk.setWebId(config.device_id || '');
        observe(sdk.start());
    }));
}
export function createDesktopWebSecureBrowser(realm, options) {
    const target = realm.window;
    const previous = owners.get(realm.window);
    if (previous) {
        if (target.securitySDK !== previous)
            throw new Error('securitySDK browser ownership changed');
        return previous;
    }
    if (target.securitySDK)
        throw new Error('securitySDK already belongs to another browser owner');
    const background = (error) => options.onBackgroundError?.(error);
    const dtrait = createDesktopDTraitBrowserBootstrap(realm, options);
    const certificates = new DesktopWebSecureServerCertificates({
        get window() {
            return realm.window;
        },
        get XMLHttpRequest() {
            return realm.XMLHttpRequest;
        },
        get localStorage() {
            return realm.localStorage;
        },
        get Date() {
            return realm.Date;
        },
        setTimeout: (callback, delay) => realm.setTimeout(callback, delay),
    });
    const tcc = new DesktopWebSecureTcc({
        get window() {
            return realm.window;
        },
        get XMLHttpRequest() {
            return realm.XMLHttpRequest;
        },
        get Date() {
            return realm.Date;
        },
    });
    const indexed = new DesktopWebSecureIndexedStorageHost({
        origin: realm.location.origin,
        readIndexedDB() {
            const global = (name) => {
                if (!(name in realm))
                    throw new ReferenceError(`${name} is not defined`);
                return realm[name];
            };
            return (global('indexedDB') ||
                realm.window.indexedDB ||
                global('webkitIndexedDB') ||
                global('mozIndexedDB') ||
                global('OIndexedDB'));
        },
        setTimeout: (callback, delay) => realm.setTimeout(callback, delay),
        clearTimeout: timer => realm.clearTimeout(timer),
        onBackgroundError: background,
    });
    const iframe = {
        origin: realm.location.origin,
        get document() {
            return realm.document;
        },
        get navigator() {
            return realm.navigator;
        },
        get window() {
            return realm.window;
        },
        get performance() {
            return realm.performance;
        },
        get Date() {
            return realm.Date;
        },
        get Math() {
            return realm.Math;
        },
        readLocalStorage: key => realm.localStorage.getItem(key),
        setTimeout: (callback, delay) => realm.setTimeout(callback, delay),
        clearTimeout: timer => realm.clearTimeout(timer),
        addMessageListener: listener => realm.addEventListener('message', listener),
        removeMessageListener: listener => realm.removeEventListener('message', listener),
    };
    const sdk = new DesktopWebSecureSdk({
        keys: {
            crypto: new DesktopWebSecureSystemCrypto(realm.crypto.subtle),
            certificates,
            get Date() {
                return realm.Date;
            },
            get performance() {
                return realm.performance;
            },
            onBackgroundError: background,
        },
        get document() {
            return realm.document;
        },
        browser: iframe,
        transport: {
            get window() {
                return realm.window;
            },
            get XMLHttpRequest() {
                return realm.XMLHttpRequest;
            },
            get location() {
                return realm.location;
            },
            get URL() {
                return realm.URL;
            },
            get Request() {
                return realm.Request;
            },
            get Headers() {
                return realm.Headers;
            },
            onBackgroundError: background,
        },
        storage: {
            iframe,
            store: {
                get window() {
                    return realm.window;
                },
                get hostname() {
                    return realm.location.hostname;
                },
                readCookie: () => realm.document.cookie,
                queryIframes: () => realm.document.querySelectorAll('iframe'),
                writeLocalStorage: (key, value) => realm.localStorage.setItem(key, value),
                createLocalStorage: config => indexed.createLocalStorage(() => realm.localStorage, config?.dbStorage),
                onBackgroundError: background,
            },
            cache: {
                get Math() {
                    return realm.Math;
                },
                onBackgroundError: background,
            },
        },
        tcc,
        dtrait,
        ...(options.telemetry === undefined
            ? {}
            : { telemetry: options.telemetry }),
        onBackgroundError: background,
    }, {
        ...(options.containerVersion === undefined
            ? {}
            : { containerVersion: options.containerVersion }),
        ...(options.containerType === undefined
            ? {}
            : { containerType: options.containerType }),
    });
    owners.set(realm.window, sdk);
    target.securitySDK = sdk;
    return sdk;
}
//# sourceMappingURL=desktop-web-secure-browser.js.map