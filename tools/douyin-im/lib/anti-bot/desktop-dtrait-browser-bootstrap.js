import { DesktopDTraitBootstrap, } from './desktop-dtrait-bootstrap.js';
import { installDesktopDTraitBrowser, } from './desktop-dtrait-browser-install.js';
export const DESKTOP_DTRAIT_LOCAL_CORE_VERSION = '1.0.31';
const acceptedVersions = new Set([
    DESKTOP_DTRAIT_LOCAL_CORE_VERSION,
    ...[
        'lf-douyin-pc-web.douyinstatic.com',
        'lf-ucenter-web.yhgfb-cn-static.com',
    ].map(host => `https://${host}/obj/passport-fe/ucenter_fe/@byted/uc-secure-dtrait-core/1.0.31/dist/index.umd.production.js`),
]);
const bootstraps = new WeakMap();
export function createDesktopDTraitBrowserBootstrap(realm, options) {
    const previous = bootstraps.get(realm.window);
    if (previous)
        return previous;
    const installation = installDesktopDTraitBrowser(realm, options);
    const target = realm.window;
    const requireVersion = (version) => {
        if (!acceptedVersions.has(version)) {
            throw new Error('Unsupported DTrait core version; local implementation requires verified 1.0.31');
        }
        if (target.DTraitSDK !== installation.core) {
            throw new Error('DTrait browser core ownership changed');
        }
    };
    const bootstrap = new DesktopDTraitBootstrap({
        window: target,
        localCore: {
            async load(version) {
                requireVersion(version);
                return true;
            },
            resolve(params) {
                requireVersion(params['urlVersion']);
                return installation.core;
            },
        },
        parameters: {
            get window() {
                return realm.window;
            },
            get XMLHttpRequest() {
                return realm.XMLHttpRequest;
            },
            get document() {
                return realm.document;
            },
            get localStorage() {
                return realm.localStorage;
            },
            get Date() {
                return realm.Date;
            },
            atob: value => realm.atob(value),
            btoa: value => realm.btoa(value),
            setTimeout: (callback, delay) => realm.setTimeout(callback, delay),
        },
        document: {
            createElement() {
                throw new Error('Remote DTrait script loading is disabled for the local core');
            },
            getElementsByTagName() {
                throw new Error('Remote DTrait script loading is disabled for the local core');
            },
        },
        monitor: {
            init: (value, instances) => options.monitor.init(value, instances),
            setConfig: value => options.monitor.setConfig(value),
            setWebId: value => options.monitor.setWebId?.(value),
            sendSlardarEvent: value => options.monitor.sendSlardarEvent(value),
            sendSlardarLog: value => options.monitor.sendSlardarLog(value),
            sendTeaLog: (...args) => options.monitor.sendTeaLog(...args),
        },
        ...(options.monitorInstances === undefined
            ? {}
            : { monitorInstances: options.monitorInstances }),
        get performance() {
            return realm.performance;
        },
    });
    bootstraps.set(realm.window, bootstrap);
    return bootstrap;
}
//# sourceMappingURL=desktop-dtrait-browser-bootstrap.js.map