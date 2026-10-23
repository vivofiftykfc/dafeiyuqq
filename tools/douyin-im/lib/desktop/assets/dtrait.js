(function(){
const modules={"desktop-dtrait-browser-install":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.installDesktopDTraitBrowser = installDesktopDTraitBrowser;
const desktop_dtrait_browser_js_1 = require("./desktop-dtrait-browser.js");
const desktop_dtrait_crypto_js_1 = require("./desktop-dtrait-crypto.js");
const installed = new WeakMap();
function installDesktopDTraitBrowser(realm, dependencies) {
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
    const crypto = (0, desktop_dtrait_crypto_js_1.installDesktopDTraitCrypto)({
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
    const core = (0, desktop_dtrait_browser_js_1.createDesktopDTraitBrowserCore)(realm, {
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

},"desktop-dtrait-browser":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDesktopDTraitBrowserCollector = createDesktopDTraitBrowserCollector;
exports.createDesktopDTraitBrowserCore = createDesktopDTraitBrowserCore;
const desktop_dtrait_collector_js_1 = require("./desktop-dtrait-collector.js");
const desktop_dtrait_features_js_1 = require("./desktop-dtrait-features.js");
const desktop_dtrait_request_core_js_1 = require("./desktop-dtrait-request-core.js");
const desktop_dtrait_bool_js_1 = require("./desktop-dtrait-bool.js");
const desktop_dtrait_environment_js_1 = require("./desktop-dtrait-environment.js");
const desktop_dtrait_rendering_js_1 = require("./desktop-dtrait-rendering.js");
const desktop_dtrait_css_js_1 = require("./desktop-dtrait-css.js");
const desktop_dtrait_media_js_1 = require("./desktop-dtrait-media.js");
const desktop_dtrait_speech_js_1 = require("./desktop-dtrait-speech.js");
const desktop_dtrait_svg_js_1 = require("./desktop-dtrait-svg.js");
const desktop_dtrait_math_js_1 = require("./desktop-dtrait-math.js");
const desktop_dtrait_webgl_js_1 = require("./desktop-dtrait-webgl.js");
const desktop_dtrait_fonts_js_1 = require("./desktop-dtrait-fonts.js");
const desktop_dtrait_audio_js_1 = require("./desktop-dtrait-audio.js");
const desktop_dtrait_transport_js_1 = require("./desktop-dtrait-transport.js");
function createDesktopDTraitBrowserCollector(realm) {
    const realmState = {
        hookLogCount: 0,
        collectionCount: 0,
        collectionErrors: [],
    };
    const diagnostic = (name) => {
        realmState.collectionErrors.push({ name });
    };
    const hash = (0, desktop_dtrait_features_js_1.createDesktopDTraitHash)({
        encoder: new realm.TextEncoder(),
        onDiagnostic: diagnostic,
    });
    const common = {
        get navigator() {
            return realm.navigator;
        },
        get window() {
            return realm.window;
        },
        get screen() {
            return realm.screen;
        },
        get Math() {
            return realm.Math;
        },
        get Date() {
            return realm.Date;
        },
        setTimeout: (callback, delay) => realm.setTimeout(callback, delay),
        clearTimeout: (timer) => realm.clearTimeout(timer),
        parseInt: (value, radix) => realm.parseInt(value, radix),
        parseFloat: (value) => realm.parseFloat(value),
        hash,
        onDiagnostic: diagnostic,
    };
    const bind = (own) => Object.defineProperties(own, Object.getOwnPropertyDescriptors(common));
    const plugins = {
        boolFeature: (0, desktop_dtrait_bool_js_1.createDesktopDTraitBoolCollector)(bind({
            get document() {
                return realm.document;
            },
            get RTCPeerConnection() {
                return realm.RTCPeerConnection;
            },
        })),
        strFeature: (0, desktop_dtrait_environment_js_1.createDesktopDTraitEnvironmentCollector)(common),
        canvas: (0, desktop_dtrait_rendering_js_1.createDesktopDTraitCanvasCollector)(bind({
            get document() {
                return realm.document;
            },
        })),
        audio: (0, desktop_dtrait_audio_js_1.createDesktopDTraitAudioCollector)(bind({
            get OfflineAudioContext() {
                return realm.OfflineAudioContext;
            },
        })),
        css: (0, desktop_dtrait_css_js_1.createDesktopDTraitCssCollector)(bind({
            get document() {
                return realm.document;
            },
            getComputedStyle: (node) => realm.getComputedStyle(node),
        })),
        domRect: (0, desktop_dtrait_rendering_js_1.createDesktopDTraitDomCollector)(bind({
            get document() {
                return realm.document;
            },
        })),
        mediaTypes: (0, desktop_dtrait_media_js_1.createDesktopDTraitMediaCollector)(bind({
            get document() {
                return realm.document;
            },
            get Audio() {
                return realm.Audio;
            },
            get MediaSource() {
                return realm.MediaSource;
            },
            get MediaRecorder() {
                return realm.MediaRecorder;
            },
        })),
        speech: (0, desktop_dtrait_speech_js_1.createDesktopDTraitSpeechCollector)(bind({
            get speechSynthesis() {
                return realm.speechSynthesis;
            },
        })),
        svgRect: (0, desktop_dtrait_svg_js_1.createDesktopDTraitSvgCollector)(bind({
            get document() {
                return realm.document;
            },
        })),
        math: (0, desktop_dtrait_math_js_1.createDesktopDTraitMathCollector)(common),
        webGL: (0, desktop_dtrait_webgl_js_1.createDesktopDTraitWebGLCollector)(bind({
            get document() {
                return realm.document;
            },
        })),
        fonts: (0, desktop_dtrait_fonts_js_1.createDesktopDTraitFontsCollector)(bind({
            get document() {
                return realm.document;
            },
            get FontFace() {
                return realm.FontFace;
            },
            getComputedStyle: (node) => realm.getComputedStyle(node),
        })),
    };
    return {
        collector: new desktop_dtrait_collector_js_1.DesktopDTraitCollector(common, plugins),
        hash,
        realmState,
    };
}
function createDesktopDTraitBrowserCore(realm, options) {
    const { collector, hash, realmState } = createDesktopDTraitBrowserCollector(realm);
    const installHooks = options.installHooks ??
        (0, desktop_dtrait_transport_js_1.createDesktopDTraitTransportInstaller)(realm, { onBackgroundError: error => options.onBackgroundError?.(error) });
    return (0, desktop_dtrait_request_core_js_1.createDesktopDTraitCore)({
        get Date() {
            return realm.Date;
        },
        get performance() {
            return realm.performance;
        },
        atob: value => realm.atob(value),
        setTimeout: (callback, delay) => realm.setTimeout(callback, delay),
        crypto: options.crypto,
        featureContext: {
            hash,
            btoa: value => realm.btoa(value),
            getCryptoUtil: options.getCryptoUtil,
        },
        collect: () => collector.collect(),
        realmState,
        installHooks,
        onBackgroundError: error => options.onBackgroundError?.(error),
    });
}

},"desktop-dtrait-collector":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesktopDTraitCollector = void 0;
exports.prepareDesktopDTraitCollection = prepareDesktopDTraitCollection;
function invoke(task, complete) {
    try {
        const value = task();
        if (value && typeof value.then === 'function')
            value.then(result => complete(true, result), error => complete(false, error));
        else
            complete(true, value);
    }
    catch (error) {
        complete(false, error);
    }
}
function observe(task) {
    void task.then(undefined, () => { });
    return task;
}
async function mapInSlices(context, items, map, budget = 16) {
    const results = Array(items.length);
    let start = context.Date.now();
    for (let i = 0; i < items.length; i++) {
        results[i] = map(items[i], i);
        const now = context.Date.now();
        if (now >= start + budget) {
            start = now;
            await new Promise(resolve => context.setTimeout(() => resolve(), 0));
        }
    }
    return results;
}
function prepareDesktopDTraitCollection(context, tasks, options, budget) {
    const keys = Object.keys(tasks);
    const prepared = observe(mapInSlices(context, keys, key => {
        const task = tasks[key];
        const stage = observe(new Promise(resolve => {
            const start = context.Date.now();
            invoke(task.bind(null, options), (success, value) => {
                const duration = context.Date.now() - start;
                if (!success)
                    return resolve(() => ({ error: value, duration }));
                if (typeof value !== 'function')
                    return resolve(() => ({ value, duration }));
                resolve(() => new Promise(finish => {
                    const secondStart = context.Date.now();
                    invoke(value, (ok, result) => {
                        const total = duration + context.Date.now() - secondStart;
                        finish(ok
                            ? { value: result, duration: total }
                            : { error: result, duration: total });
                    });
                }));
            });
        }));
        return () => stage.then(run => run());
    }, budget));
    return async () => {
        const stages = await prepared;
        const running = await mapInSlices(context, stages, run => observe(run()), budget);
        const values = await Promise.all(running);
        const result = {};
        for (let i = 0; i < keys.length; i++)
            result[keys[i]] = values[i];
        return result;
    };
}
class DesktopDTraitCollector {
    context;
    bool;
    str;
    constructor(context, plugins) {
        this.context = context;
        this.str = {
            strFeature: plugins.strFeature,
            canvas: plugins.canvas,
            audio: plugins.audio,
            css: plugins.css,
            domRect: plugins.domRect,
            mediaTypes: plugins.mediaTypes,
            speech: plugins.speech,
            svgRect: plugins.svgRect,
            math: plugins.math,
            webGL: plugins.webGL,
            fonts: plugins.fonts,
        };
        this.bool = { boolFeature: plugins.boolFeature };
    }
    async collectGroup(tasks) {
        const run = prepareDesktopDTraitCollection(this.context, tasks, {
            cache: {},
            debug: false,
        });
        const results = await run();
        let combined = {};
        for (const key of Object.keys(results)) {
            const result = results[key];
            combined = Object.assign(Object.assign({}, combined), result.value);
        }
        return Object.assign({}, combined);
    }
    async collectOnce() {
        const [bool, str] = await Promise.all([
            this.collectGroup(this.bool),
            this.collectGroup(this.str),
        ]);
        return { num: {}, bool, str };
    }
    async collect() {
        try {
            return await new Promise((resolve, reject) => {
                let retries = 3;
                const attempt = () => {
                    void this.collectOnce()
                        .then(resolve)
                        .catch(error => {
                        if (retries-- > 0)
                            attempt();
                        else
                            reject(error);
                    });
                };
                attempt();
            });
        }
        catch {
            return { bool: {}, num: {}, str: {} };
        }
    }
}
exports.DesktopDTraitCollector = DesktopDTraitCollector;

},"desktop-dtrait-features":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesktopDTraitFeatures = void 0;
exports.createDesktopDTraitHash = createDesktopDTraitHash;
function createDesktopDTraitHash(context) {
    const cache = {};
    return (value, seed = 0) => {
        if (typeof value !== 'string') {
            void 'length_error, raw:'
                .concat(value, ', type:')
                .concat(typeof value);
            context.onDiagnostic('murmur3_len');
        }
        const text = typeof value === 'string' ? value : String(value);
        let bytes;
        if (!cache[text]) {
            try {
                cache[text] = context.encoder.encode(text);
                bytes = cache[text];
            }
            catch (error) {
                void ''.concat(error);
                context.onDiagnostic('murmur3_encode');
                bytes = new Uint8Array(0);
            }
        }
        else
            bytes = cache[text];
        const length = bytes.length, blocks = Math.floor(length / 4);
        let hash = seed;
        for (let i = 0; i < blocks; i++) {
            const at = i * 4;
            let k = bytes[at] |
                (bytes[at + 1] << 8) |
                (bytes[at + 2] << 16) |
                (bytes[at + 3] << 24);
            k = Math.imul(k, 0xcc9e2d51);
            k = (k << 15) | (k >>> 17);
            hash ^= Math.imul(k, 0x1b873593);
            hash = (hash << 13) | (hash >>> 19);
            hash = Math.imul(hash, 5) + 0xe6546b64;
        }
        let tail = 0;
        const at = 4 * blocks, remainder = length & 3;
        if (remainder === 3)
            tail ^= bytes[at + 2] << 16;
        if (remainder >= 2)
            tail ^= bytes[at + 1] << 8;
        if (remainder >= 1) {
            tail ^= bytes[at];
            tail = Math.imul(tail, 0xcc9e2d51);
            tail = (tail << 15) | (tail >>> 17);
            hash ^= Math.imul(tail, 0x1b873593);
        }
        hash ^= length;
        hash ^= hash >>> 16;
        hash = Math.imul(hash, 0x85ebca6b);
        hash ^= hash >>> 13;
        hash = Math.imul(hash, 0xc2b2ae35);
        return (hash ^ (hash >>> 16)) >>> 0;
    };
}
const versionZero = {};
for (let i = 1; i <= 10; i++)
    versionZero[`bool_${i}`] = i;
for (let i = 1; i <= 33; i++)
    versionZero[`str_${i}`] = i + 31;
const mappings = { 0: versionZero };
function encodeIndexed(getFeatures) {
    const bytes = new Uint8Array(Object.keys(getFeatures()).length * 5);
    const keys = Object.keys(getFeatures());
    let at = 0;
    for (const key of keys) {
        bytes[at] = parseInt(key, 10);
        const value = getFeatures()[key];
        bytes[at + 1] = (value >>> 24) & 255;
        bytes[at + 2] = (value >>> 16) & 255;
        bytes[at + 3] = (value >>> 8) & 255;
        bytes[at + 4] = value & 255;
        at += 5;
    }
    return bytes;
}
class DesktopDTraitFeatures {
    context;
    reserved = 0;
    dTraitType = 1;
    centralAccessType = 0;
    edgeAccessType = 1;
    version = 0;
    boolFeatures = {};
    numberFeatures = {};
    centralStringFeatures = {};
    edgeStringFeatures = {};
    constructor(context, options) {
        this.context = context;
        this.reserved = options.reserved || 0;
        this.dTraitType = options.dTraitType || 1;
        this.version = options.version || 0;
    }
    addBoolFeature(name, value) {
        const index = mappings?.[this.version]?.[name];
        if (index && index >= 0 && index <= 480)
            this.boolFeatures[index] = Boolean(value);
    }
    addNumFeature(name, value) {
        const index = mappings?.[this.version]?.[name];
        if (index && index >= 16 && index <= 31)
            this.numberFeatures[index] = value;
    }
    addStringFeature(name, value) {
        const index = mappings?.[this.version]?.[name];
        if (index && index >= 32 && index <= 255) {
            this.centralStringFeatures[index] = value;
            this.edgeStringFeatures[index] = this.context.hash(value.toString());
        }
    }
    getCentralStringBuffer() {
        return encodeIndexed(() => this.centralStringFeatures);
    }
    getEdgeStringBuffer() {
        return encodeIndexed(() => this.edgeStringFeatures);
    }
    getNumberBuffer() {
        return encodeIndexed(() => this.numberFeatures);
    }
    getBoolBuffer() {
        let max = 0;
        for (const key of Object.keys(this.boolFeatures)) {
            const index = parseInt(key, 10);
            if (index > max)
                max = index;
        }
        const bytes = new Uint8Array((Math.floor(max / 32) + 1) * 5);
        for (const key of Object.keys(this.boolFeatures)) {
            const index = parseInt(key, 10);
            if (index % 32 === 0)
                bytes[Math.floor(index / 32)] = Math.floor(index / 8);
            if (this.boolFeatures[index]) {
                const at = 5 * (Math.floor(index / 32) + 1) - Math.floor((index % 32) / 8) - 1;
                bytes[at] = bytes[at] | (1 << (index % 8));
            }
        }
        return bytes;
    }
    getResult() {
        const central = this.getCentralStringBuffer(), edge = this.getEdgeStringBuffer();
        const number = this.getNumberBuffer(), bool = this.getBoolBuffer();
        const centralHeader = new Uint8Array(1), edgeHeader = new Uint8Array(1);
        centralHeader[0] =
            (this.reserved << 6) |
                (this.dTraitType << 5) |
                (this.centralAccessType << 4) |
                this.version;
        edgeHeader[0] =
            (this.reserved << 6) |
                (this.dTraitType << 5) |
                (this.edgeAccessType << 4) |
                this.version;
        const c = this.context
            .getCryptoUtil()
            ?.bufferConcat([centralHeader, bool, number, central]);
        const e = this.context
            .getCryptoUtil()
            ?.bufferConcat([centralHeader, bool, number, edge]);
        const base64 = (bytes) => this.context.btoa(String.fromCharCode.apply(String, bytes));
        return { centralString: base64(c), edgeString: base64(e) };
    }
}
exports.DesktopDTraitFeatures = DesktopDTraitFeatures;

},"desktop-dtrait-request-core":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesktopDTraitRequestCore = void 0;
exports.createDesktopDTraitCore = createDesktopDTraitCore;
const desktop_dtrait_features_js_1 = require("./desktop-dtrait-features.js");
const quietPaths = [
    '/passport/web/check_qrconnect/',
    '/passport/token/beat/web/',
    '/check_qrconnect/',
    '/passport/web/get_qrcode/',
    '/passport/ticket_guard/get_client_cert/',
    '/passport/web/challenge/',
    '/passport/general/login_guiding_strategy/',
    '/passport/token/beat/sso/web/',
];
function createDesktopDTraitCore(context) {
    let instance = null;
    const realmState = context.realmState ?? {
        hookLogCount: 0,
        collectionCount: 0,
        collectionErrors: [],
    };
    return {
        getInstance(params, options) {
            const { sourcePromise, dTraitPath = [], urlRewriteRules = [], getLocalSource, dTraitHost = [], containerSdkVersion = 'unknown', monitor, delayCollect, } = options;
            void sourcePromise;
            void getLocalSource;
            void containerSdkVersion;
            if (!instance) {
                instance = new DesktopDTraitRequestCore({
                    ...context,
                    realmState,
                    get featureProtocol() {
                        return new desktop_dtrait_features_js_1.DesktopDTraitFeatures(context.featureContext, {});
                    },
                }, Object.assign({}, params, { libraGroup: options['libraGroup'] }));
                if (delayCollect)
                    context.setTimeout(() => instance?.setSource(), delayCollect * 1000);
                else
                    instance.setSource();
            }
            if (monitor)
                instance.updateMonitor(monitor);
            instance.updateDTraitPath(dTraitPath);
            instance.updateDTraitHost(dTraitHost);
            instance.updateUrlRewriteRules(urlRewriteRules);
            return true;
        },
    };
}
class DesktopDTraitRequestCore {
    context;
    initPromise = Promise.resolve(false);
    aesKey;
    centralRsaPub;
    centralVersion;
    centralRsaAesKey = '';
    edgeRsaPub;
    edgeVersion;
    edgeRsaAesKey = '';
    centralDTrait = '';
    edgeDTrait = '';
    dTraitToken = '';
    dTraitPathCache = {};
    dTraitHooksPath = [];
    dTraitHooksHost = [];
    dTraitUrlRewriteRules = [];
    collectStatus = false;
    featureProtocol;
    libraGroup;
    getLocalSource = () => Promise.resolve({});
    realmState;
    cacheLogList = {
        slardarEvent: [],
        sendTeaLog: [],
        slardarLog: [],
    };
    sendSlardarEventBase = undefined;
    sendTeaLogBase = undefined;
    sendSlardarLogBase = undefined;
    constructor(context, params) {
        this.context = context;
        this.realmState = context.realmState ?? {
            hookLogCount: 0,
            collectionCount: 0,
            collectionErrors: [],
        };
        this.sendSlardarEvent({
            name: 'dtrait_monkey_patch_request',
            metrics: { duration: context.performance.now() },
            categories: {
                path_len: Array.isArray(this.dTraitHooksPath)
                    ? this.dTraitHooksPath.length
                    : 0,
            },
        });
        context.installHooks({
            hookConfig: this.hookConfig,
            processRequestConfig: this.processRequestConfig,
            processResponseConfig: this.processResponseConfig,
            errorRequestConfig: this.errorRequestConfig,
        });
        const getKey = () => context.crypto.aes?.getAesKey();
        this.aesKey = context.crypto.util?.uint8ArrayToHex(getKey());
        this.centralRsaPub = context.atob((params['centralRsaPub'] || ''));
        this.centralVersion = params['centralVersion'];
        this.edgeRsaPub = context.atob((params['edgeRsaPub'] || ''));
        this.edgeVersion = params['edgeVersion'];
        this.featureProtocol = context.featureProtocol;
        this.libraGroup = params['libraGroup'];
        this.observe(this.init());
        if (context.monitor)
            this.updateMonitor(context.monitor);
    }
    sendSlardarEvent = (value) => {
        if (this.sendSlardarEventBase)
            return this.sendSlardarEventBase?.(value);
        this.cacheLogList.slardarEvent.push(value);
        return undefined;
    };
    sendTeaLog = (eventName, params) => {
        if (this.sendTeaLogBase)
            return this.sendTeaLogBase?.(eventName, params);
        this.cacheLogList.sendTeaLog.push({ eventName, params });
        return undefined;
    };
    sendSlardarLog = (value) => {
        if (this.sendSlardarLogBase)
            return this.sendSlardarLogBase?.(value);
        this.cacheLogList.slardarLog.push(value);
        return undefined;
    };
    updateMonitor = (monitor) => {
        if (monitor.sendTeaLog) {
            this.sendTeaLogBase = monitor.sendTeaLog;
            this.cacheLogList.sendTeaLog.map(value => {
                if (value)
                    this.sendTeaLog(value.eventName, value.params);
                return null;
            });
        }
        if (monitor.sendSlardarEvent) {
            this.sendSlardarEventBase = value => {
                monitor.sendSlardarEvent(Object.assign({}, value, {
                    categories: Object.assign({ realVersion: '1.0.31' }, value?.['categories']),
                }));
            };
            this.cacheLogList.slardarEvent.map(value => {
                if (value)
                    this.sendSlardarEvent(value);
                return null;
            });
        }
        if (monitor.sendSlardarLog) {
            this.sendSlardarLogBase = monitor.sendSlardarLog;
            this.cacheLogList.slardarLog.map(value => {
                if (value)
                    this.sendSlardarLog(value);
                return null;
            });
        }
    };
    recordCollectionError = (name) => {
        this.realmState.collectionErrors.push({ name });
    };
    getOnlineSourceWithLog = async () => {
        ++this.realmState.collectionCount;
        const start = this.context.Date.now();
        const source = await this.context.collect();
        try {
            const { num = {}, bool = {}, str = {} } = source;
            const numKeys = Object.keys(num), boolKeys = Object.keys(bool), strKeys = Object.keys(str);
            const total = numKeys.length + boolKeys.length + strKeys.length;
            this.sendSlardarEvent({
                name: 'feature_collect',
                metrics: {
                    duration: this.context.Date.now() - start,
                    performance: this.context.performance.now(),
                },
                categories: {
                    result: total ? 1 : 0,
                    bool_total: boolKeys.length,
                    str_total: strKeys.length,
                    index: this.realmState.collectionCount,
                    total,
                    path_len: Array.isArray(this.dTraitHooksPath)
                        ? this.dTraitHooksPath.length
                        : 0,
                },
            });
            this.realmState.collectionErrors.map(error => {
                this.sendSlardarLog({
                    content: '[ft err][' + error.name + ']:[redacted]',
                });
                this.sendSlardarEvent({
                    name: 'feat_collect_error',
                    categories: { type: error.name },
                });
                return null;
            });
            this.realmState.collectionErrors = [];
        }
        catch {
        }
        return source;
    };
    setSource = () => {
        this.initPromise = Promise.all([
            this.getOnlineSourceWithLog().then(source => {
                this.updateFeature(source);
                this.collectStatus = true;
                return Promise.resolve(true);
            }),
        ]).then(() => {
            this.updateFeatureScheduled();
            return true;
        });
        this.observe(this.initPromise);
    };
    updateFeatureScheduled = () => {
    };
    updateGetLocalSource = (source) => {
        this.getLocalSource = source;
    };
    getHooksConfig = () => ({
        dTraitHooksHost: this.dTraitHooksHost,
        dTraitHooksPath: this.dTraitHooksPath,
        dTraitUrlRewriteRules: this.dTraitUrlRewriteRules,
    });
    init = async () => {
        const start = this.context.Date.now();
        this.centralRsaAesKey = await this.rsaEncrypt(this.centralRsaPub, this.aesKey);
        this.sendSlardarEvent({
            name: 'dtrait_online_init',
            metrics: { duration: this.context.Date.now() - start },
            categories: {
                has_aes_key: this.aesKey ? 1 : 0,
                has_central_rsa_aes_key: this.centralRsaAesKey ? 1 : 0,
                crypto: this.context.crypto.util ? 1 : 0,
            },
        });
        await this.initPromise;
        this.observe(this.getDTrait());
        return Promise.resolve(true);
    };
    getDTrait = async () => {
        const { centralString, edgeString } = this.featureProtocol.getResult();
        this.centralDTrait = centralString;
        this.edgeDTrait = edgeString;
        return Promise.resolve(true);
    };
    updateFeature = (source) => {
        const { bool, num, str } = source;
        for (const key in bool)
            this.featureProtocol.addBoolFeature(key, bool[key]);
        for (const key in num)
            this.featureProtocol.addNumFeature(key, num[key]);
        for (const key in str)
            this.featureProtocol.addStringFeature(key, str[key]);
        this.observe(this.getDTrait());
    };
    rsaEncrypt = async (key, plaintext) => await this.context.crypto.rsa?.encryptData(key, plaintext);
    aesEncrypt = async (key, plaintext) => {
        const { cipherText, iv } = (await this.context.crypto.aes?.encryptData(key, plaintext));
        void iv;
        return cipherText;
    };
    getCentralData = async ({ path }) => {
        let rewritten = path;
        await this.initPromise;
        if (!this.centralDTrait)
            await this.getDTrait();
        if (this.dTraitUrlRewriteRules && this.dTraitUrlRewriteRules.length > 0)
            this.dTraitUrlRewriteRules.forEach(rule => {
                if (Array.isArray(rule) &&
                    rule.length > 1 &&
                    rewritten.indexOf(rule[0]) === 0)
                    rewritten = rule[1];
            });
        const text = JSON.stringify({
            dtrait: this.centralDTrait,
            timestamp: Math.floor(this.context.Date.now() / 1000),
            sdkVersion: '1.0.31',
            path: rewritten,
        });
        const cipher = await this.aesEncrypt(this.aesKey, text);
        return this.centralVersion + '_' + this.centralRsaAesKey + '_' + cipher;
    };
    getEdgeData = async ({ path }) => {
        await this.initPromise;
        if (!this.edgeDTrait)
            await this.getDTrait();
        const text = JSON.stringify({
            dtrait: this.edgeDTrait,
            timestamp: Math.floor(this.context.Date.now() / 1000),
            path,
        });
        const cipher = this.aesEncrypt(this.aesKey, text);
        this.observe(cipher);
        return this.edgeVersion + '_' + this.edgeRsaAesKey + '_' + cipher;
    };
    getDTraitHeader = async (input) => {
        const [central] = await Promise.all([
            this.getCentralData(input),
            this.getEdgeData(input),
        ]);
        return central ? { 'x-tt-session-dtrait': central } : null;
    };
    setDTraitToken = (token) => {
        this.dTraitToken = token;
    };
    updateDTraitPath = (paths) => {
        this.dTraitHooksPath = [].concat(this.dTraitHooksPath, paths);
    };
    updateDTraitHost = (hosts) => {
        this.dTraitHooksHost = [].concat(this.dTraitHooksHost, hosts);
    };
    updateUrlRewriteRules = (rules) => {
        this.dTraitUrlRewriteRules = [].concat(this.dTraitUrlRewriteRules, rules);
    };
    hookConfig = ({ pathname, host, }) => {
        if (this.realmState.hookLogCount < 3) {
            this.realmState.hookLogCount++;
            this.sendSlardarEvent({
                name: 'dtrait_request_hook',
                metrics: { count: 1, duration: this.context.performance.now() },
                categories: {
                    pathname,
                    path_len: Array.isArray(this.dTraitHooksPath)
                        ? this.dTraitHooksPath.length
                        : 0,
                },
            });
        }
        let needProxy = false;
        for (let i = 0; i < this.dTraitHooksHost.length; i++)
            if (host && host.indexOf(this.dTraitHooksHost[i]) === 0) {
                needProxy = true;
                break;
            }
        for (let i = 0; i < this.dTraitHooksPath.length; i++)
            if (pathname.indexOf(this.dTraitHooksPath[i]) === 0) {
                needProxy = true;
                break;
            }
        return { needProxy };
    };
    processRequestConfig = async (config, meta) => {
        const { pathname, host } = config, start = this.context.Date.now();
        let isCache = 0, headers = null;
        try {
            if (this.dTraitPathCache?.[pathname] &&
                start - this.dTraitPathCache?.[pathname]?.time < 600_000) {
                headers = this.dTraitPathCache[pathname].val;
                isCache = 1;
            }
            else {
                headers = await this.getDTraitHeader({ path: pathname });
                if (this.collectStatus)
                    this.dTraitPathCache[pathname] = { time: start, val: headers };
            }
            const duration = this.context.Date.now() - start, length = headers?.['x-tt-session-dtrait'].length;
            if (!quietPaths.includes(pathname)) {
                this.sendSlardarEvent({
                    name: 'dtrait_request',
                    metrics: { duration },
                    categories: {
                        pathname,
                        host,
                        isCache,
                        centralDTraitLen: length,
                        result: headers ? 1 : 0,
                    },
                });
                meta.ucProxyParam = Object.assign({}, meta?.ucProxyParam || {}, {
                    startTime: this.context.Date.now(),
                });
            }
        }
        finally {
            config.headers = Object.assign({}, config.headers || {}, headers || {});
            return Promise.resolve(config);
        }
    };
    processResponseConfig = async (response, meta) => {
        const { config, httpCode } = response, { host, pathname } = config;
        if (!response?.headers || typeof response.headers === 'string')
            return true;
        const token = '' + (response.headers?.['x-tt-session-dtrait-token'] || ''), logid = '' + (response.headers?.['x-tt-logid'] || 'unknown');
        if (token)
            this.setDTraitToken(token);
        if (!quietPaths.includes(pathname))
            try {
                this.sendTeaLog('web_bd_ticket_dtrait_response', {
                    duration: meta?.ucProxyParam?.['startTime']
                        ? this.context.Date.now() -
                            meta.ucProxyParam['startTime']
                        : 0,
                    pathname,
                    host,
                    has_dTraitToken: token ? 1 : 0,
                    logid,
                    http_code: httpCode,
                    performance_time: this.context.performance?.now(),
                });
                this.sendSlardarEvent({
                    name: 'dtrait_response',
                    metrics: {
                        count: 1,
                        duration: meta?.ucProxyParam?.['startTime']
                            ? this.context.Date.now() -
                                meta.ucProxyParam['startTime']
                            : 0,
                    },
                    categories: {
                        pathname,
                        path: pathname,
                        host,
                        has_dTraitToken: token ? 1 : 0,
                        logId: logid,
                        http_code: httpCode,
                    },
                });
            }
            catch {
            }
        return true;
    };
    observe(task) {
        void task.catch(error => {
            try {
                this.context.onBackgroundError?.(error);
            }
            catch {
            }
        });
    }
    errorRequestConfig = ({ config, instance, errType, }) => {
        const { pathname, host } = config;
        try {
            this.sendSlardarEvent({
                name: 'dtrait_request_error',
                metrics: {
                    count: 1,
                    duration: instance?.ucProxyParam?.['startTime']
                        ? this.context.Date.now() -
                            instance.ucProxyParam['startTime']
                        : 0,
                },
                categories: { pathname, host, errType },
            });
            this.sendSlardarLog({
                content: '[request error]: [redacted]',
            });
        }
        catch {
        }
    };
}
exports.DesktopDTraitRequestCore = DesktopDTraitRequestCore;

},"desktop-dtrait-bool":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDesktopDTraitBoolCollector = createDesktopDTraitBoolCollector;
const IMAGE_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFUAAABUCAYAAADzqXv/AAAACXBIWXMAACE4AAAhOAFFljFgAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAALASURBVHgB7ZyJUsJAEEQHBK///1UvQNS2dmGL4sgm3cui/apiqjQmzcvM5tQIY4wxxhhjzL9gFtcB270r5vPYZ3mJvkHORZoj9136/vZneov0wxbkjS9iL/NWKHOXO/8kSqk5zDLqJGLZr7geuRJz/qHZd8uxpY4VebiOTbQH20XuGpElszR9saSiLR5jP77cEsj8EJzsFKmzFGgZPFpVqqIQsM7tFKn4XYRiH3RaHMTu0yTJPkaqojpLlEOIepjCete1UhHqKc1VqCoVH/gptJ1QXakQ+Rz69twdRYMHuuox9PwW21CprYRmmFIxVN1HG+a7LwMWbCk0b5NBS6GZ2aVKbS0U18+faT4VfLaWQj/TdLb9IVI9sINNCrMOXsvno7yaTTHtsp+TitZRHuURZBVp75JRF8M6TUezn5K6DN15KFr7PTQygbIYUAgfcWF4OiYVe1g1Fq3SpLoLBZmK7MgLmeshCx+TilDsPY1QqE71Nb1CaL75PPjgeShVsaerQ40k37pjgsyvUdlZh1LZQhGmOtRIHoLLKKGgbPP8vIgJxqEWQstnRSxGF0MpdRHcsTSfdrSA3WGTiqGUyB6PPqIdzCpF269iAvNizgzGvDq6BLvDJgkFOQx7PJocrAL2w8vJp30KqdvQnz6VdNdhCqmqy89j5LdEWFCy5zcumMFaPrNnX/nRpLKDtWz9LrMrpLZ8ZYd9LKDAPh0JwvpqWpCdfcpOQjH97pix7w2d4znGg1A1r1Iys+dHR2PBmcN7XpHy7r6aLrMPet+yU7rNbakCbllqt9zyeNp1pRoylirAUgVYqgBLFWCpAixVgKUKsFQBlirAUgVYqgBLFWCpAixVgKUKsFQBlirAUgVYqgBLFWCpAixVgKUKsFQBlirAUgXgpd9r/LPCU9S82o5le8re8q9yjDHGGGOMMeaP8g1FVWaArDlxQQAAAABJRU5ErkJggg==';
function createDesktopDTraitBoolCollector(context) {
    const imageDisable = () => {
        const started = context.Date.now();
        return new Promise(resolve => {
            const image = context.document.createElement('img');
            image.id = 'image_disable';
            image.style.cssText = '\n    display: none;\n    ';
            image.src = IMAGE_DATA_URL;
            context.document.body.appendChild(image);
            const found = context.document.getElementById('image_disable');
            const finish = (disabled) => {
                if (image.parentNode)
                    image.parentNode.removeChild(image);
                resolve({
                    imageDisable: disabled,
                    duration_time_imageDisable: context.Date.now() - started,
                });
            };
            const timer = context.setTimeout(() => finish(1), 500);
            if (!found) {
                context.clearTimeout(timer);
                finish(0);
                return;
            }
            found.onload = () => {
                context.clearTimeout(timer);
                finish(0);
            };
            found.onerror = () => {
                context.clearTimeout(timer);
                finish(1);
            };
        });
    };
    const rtcDisable = () => {
        try {
            const RTC = context.RTCPeerConnection;
            new RTC();
            return Promise.resolve(0);
        }
        catch {
            return Promise.resolve(1);
        }
    };
    const automa = () => context.document.getElementsByClassName('automa-element-selector').length >
        0 || Boolean(context.document.getElementById('automa-palette'))
        ? 1
        : 0;
    const touch = () => {
        try {
            context.document.createEvent('TouchEvent');
            return 1;
        }
        catch {
            return 0;
        }
    };
    return async () => {
        const image = imageDisable();
        void image.catch(() => undefined);
        return Promise.all([image, rtcDisable(), automa(), touch()])
            .then(([imageValue, rtc, automation, touchValue]) => ({
            bool_1: automation,
            bool_2: imageValue.imageDisable,
            bool_3: context.navigator.brave ? 1 : 0,
            bool_4: context.navigator.cookieEnabled ? 1 : 0,
            bool_5: context.navigator.doNotTrack ? 1 : 0,
            bool_6: context.navigator.pdfViewerEnabled ? 1 : 0,
            bool_7: context.navigator.serviceWorker ? 1 : 0,
            bool_8: context.navigator.webdriver ? 1 : 0,
            bool_9: touchValue,
            bool_10: rtc,
        }))
            .catch(error => {
            context.onDiagnostic('bool');
            return Promise.reject(error);
        });
    };
}

},"desktop-dtrait-environment":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDesktopDTraitEnvironmentCollector = createDesktopDTraitEnvironmentCollector;
function createDesktopDTraitEnvironmentCollector(context) {
    const touchPoints = () => {
        const navigator = context.navigator;
        let value = 0;
        if (navigator.maxTouchPoints !== undefined)
            value = context.parseInt(''.concat(navigator.maxTouchPoints), 10);
        else if (navigator.msMaxTouchPoints !== undefined)
            value = navigator.msMaxTouchPoints;
        return value;
    };
    const arrayValues = (items, key) => {
        if (!items || !Array.isArray(items) || !items?.length)
            return [];
        const values = [];
        for (let index = 0; index < items.length; index++) {
            const item = items[index];
            if (!item)
                continue;
            values.push(item[key]);
        }
        return values;
    };
    return () => {
        try {
            return {
                str_14: context.hash(''
                    .concat(context.navigator.connection?.downlink, ',')
                    .concat(context.navigator.connection?.effectiveType)),
                str_15: context.hash(''
                    .concat(context.navigator?.language, ',')
                    .concat(context.navigator?.languages?.join(','))),
                str_16: context.hash(''
                    .concat(arrayValues(context.navigator.mimeTypes, 'type')?.join(','), ',')
                    .concat(context.navigator?.vendor)),
                str_18: context.hash(arrayValues(context.navigator.plugins, 'name')?.join(',')),
                str_19: context.hash(''.concat(context.navigator?.userAgent)),
                str_29: context.hash(''
                    .concat(touchPoints(), ',')
                    .concat(context.navigator?.deviceMemory, ',')
                    .concat(context.navigator?.hardwareConcurrency, ',')
                    .concat(context.navigator?.maxTouchPoints)),
                str_27: context.hash(''
                    .concat(context.window?.Intl?.DateTimeFormat()?.resolvedOptions()
                    ?.locale, '+')
                    .concat(context.window?.Intl?.DateTimeFormat()?.resolvedOptions()
                    ?.timeZone)),
                str_28: context.hash(context.window?.Notification?.permission),
                str_30: context.hash(''
                    .concat(context.screen.availHeight, ',')
                    .concat(context.screen.availLeft, ',')
                    .concat(context.screen.availTop, ',')
                    .concat(context.screen.availWidth)),
                str_31: context.hash(''
                    .concat(context.screen.height, ',')
                    .concat(context.screen.width)),
                str_32: context.hash(''
                    .concat(context.screen.colorDepth, ',')
                    .concat(context.screen.pixelDepth, ',')
                    .concat(context.window.devicePixelRatio)),
            };
        }
        catch {
            context.onDiagnostic('str');
            return {
                str_14: context.hash(''),
                str_15: context.hash(''),
                str_16: context.hash(''),
                str_18: context.hash(''),
                str_19: context.hash(''),
                str_29: context.hash(''),
                str_27: context.hash(''),
                str_28: context.hash(''),
                str_30: context.hash(''),
                str_31: context.hash(''),
                str_32: context.hash(''),
            };
        }
    };
}

},"desktop-dtrait-rendering":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDesktopDTraitCanvasCollector = createDesktopDTraitCanvasCollector;
exports.createDesktopDTraitDomCollector = createDesktopDTraitDomCollector;
function createDesktopDTraitCanvasCollector(context) {
    return () => {
        const canvas = context.document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 200;
        const draw = canvas.getContext('2d');
        if (!draw)
            return { str_3: '' };
        const gradient = draw.createRadialGradient(200, 100, 20, 200, 100, 180);
        gradient.addColorStop(0, 'rgba(255,0,0,0.5)');
        gradient.addColorStop(0.5, 'rgba(0,255,0,0.5)');
        gradient.addColorStop(1, 'rgba(0,0,255,0.5)');
        draw.fillStyle = gradient;
        draw.fillRect(0, 0, 400, 200);
        draw.shadowColor = 'rgba(50,50,50,0.8)';
        draw.shadowBlur = 10;
        draw.shadowOffsetX = 4;
        draw.shadowOffsetY = 4;
        draw.fillStyle = '#FF5722';
        draw.beginPath();
        draw.arc(150, 75, 40, 0, 2 * context.Math.PI);
        draw.fill();
        draw.fillStyle = '#4CAF50';
        draw.fillRect(50, 100, 100, 30);
        draw.shadowBlur = 0;
        draw.font = "italic 48px 'Comic Sans MS'";
        draw.fillStyle = 'rgba(0, 0, 0, 0.8)';
        draw.fillText('ABCDEFGHIJKL', 0, 40);
        draw.fillText('MNOPQRSTUVWXYZ', 0, 80);
        draw.font = "bold 42px 'Arial'";
        draw.fillStyle = 'rgba(255, 215, 0, 0.6)';
        draw.fillText('abcdefghijklmn', 0, 120);
        draw.fillText('opqrstuvwxyz', 0, 160);
        draw.strokeStyle = 'rgba(0,0,0,0.3)';
        draw.lineWidth = 2;
        for (let x = 0; x < 400; x += 20) {
            draw.beginPath();
            draw.moveTo(x, 0);
            draw.lineTo(x + 20, 200);
            draw.stroke();
            draw.beginPath();
            draw.moveTo(x, 200);
            draw.lineTo(x + 20, 0);
            draw.stroke();
        }
        const url = canvas.toDataURL();
        return { str_3: context.hash(url) || '' };
    };
}
function createDesktopDTraitDomCollector(context) {
    return () => {
        const element = context.document.createElement('div');
        element.id = 'secure-collect-dom';
        element.style.cssText =
            '\n      position: absolute;\n      top: 0;\n      left: 0;\n      width: 123.45px; \n      height: 67.89px;\n      transform: rotate(45deg) translateX(-200px);\n      visibility: hidden;\n      z-index: -100;\n    ';
        context.document.body.appendChild(element);
        const rect = element.getBoundingClientRect();
        if (element.parentNode === context.document.body)
            context.document.body.removeChild(element);
        else {
            const found = context.document.querySelector('#secure-collect-dom');
            if (found)
                found.parentNode?.removeChild(found);
        }
        const { width, height, x, y } = rect;
        return {
            str_2: context.hash(''
                .concat(height, ',')
                .concat(width, ',')
                .concat(x, ',')
                .concat(y)),
        };
    };
}

},"desktop-dtrait-css":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDesktopDTraitCssCollector = createDesktopDTraitCssCollector;
function createDesktopDTraitCssCollector(context) {
    const computed = () => {
        try {
            const style = context.getComputedStyle(context.document.body);
            if (!style)
                throw new TypeError('invalid argument string');
            const proto = Object.getPrototypeOf(style);
            const prototypeKeys = Object.getOwnPropertyNames(proto);
            const propertyKeys = [];
            const custom = new RegExp('^--.*$');
            Object.keys(style).forEach(key => {
                const numeric = !isNaN(+key);
                const value = style[key];
                const customKey = custom.test(key);
                const customValue = custom.test(value);
                if (numeric && !customValue)
                    propertyKeys.push(value);
                else if (!numeric && !customKey)
                    propertyKeys.push(key);
            });
            const aliases = {};
            const upper = new RegExp('[A-Z]', 'g');
            const upperFirst = (value) => value.charAt(0).toUpperCase() + value.slice(1);
            const lowerFirst = (value) => value.charAt(0).toLowerCase() + value.slice(1);
            propertyKeys.forEach(key => {
                if (aliases[key])
                    return;
                const hasHyphen = key.indexOf('-') > -1;
                const hasUpper = upper.test(key);
                const first = key.charAt(0);
                const initialHyphen = hasHyphen && first === '-';
                const initialUpper = hasUpper && first === first.toUpperCase();
                key = initialHyphen
                    ? key.slice(1)
                    : initialUpper
                        ? lowerFirst(key)
                        : key;
                if (hasHyphen) {
                    const camel = key
                        .split('-')
                        .map((part, index) => (index === 0 ? part : upperFirst(part)))
                        .join('');
                    if (camel in style)
                        aliases[camel] = true;
                    else if (upperFirst(camel) in style)
                        aliases[upperFirst(camel)] = true;
                }
                else if (hasUpper) {
                    const dashed = key.replace(upper, letter => '-'.concat(letter.toLowerCase()));
                    if (dashed in style)
                        aliases[dashed] = true;
                    else if ('-'.concat(dashed) in style)
                        aliases['-'.concat(dashed)] = true;
                }
            });
            const keys = Array.from(new Set([...prototypeKeys, ...propertyKeys, ...Object.keys(aliases)]));
            const interfaceName = ''
                .concat(proto)
                .match(new RegExp('\\[object (.+)\\]'))[1];
            return {
                keys: context.hash(keys.join(',')),
                interfaceName: context.hash(interfaceName),
            };
        }
        catch {
            return undefined;
        }
    };
    const system = () => {
        try {
            const colors = [
                'ActiveBorder',
                'ActiveCaption',
                'ActiveText',
                'AppWorkspace',
                'Background',
                'ButtonBorder',
                'ButtonFace',
                'ButtonHighlight',
                'ButtonShadow',
                'ButtonText',
                'Canvas',
                'CanvasText',
                'CaptionText',
                'Field',
                'FieldText',
                'GrayText',
                'Highlight',
                'HighlightText',
                'InactiveBorder',
                'InactiveCaption',
                'InactiveCaptionText',
                'InfoBackground',
                'InfoText',
                'LinkText',
                'Mark',
                'MarkText',
                'Menu',
                'MenuText',
                'Scrollbar',
                'ThreeDDarkShadow',
                'ThreeDFace',
                'ThreeDHighlight',
                'ThreeDLightShadow',
                'ThreeDShadow',
                'VisitedText',
                'Window',
                'WindowFrame',
                'WindowText',
            ];
            const fonts = [
                'caption',
                'icon',
                'menu',
                'message-box',
                'small-caption',
                'status-bar',
            ];
            const div = context.document.createElement('div');
            context.document.body.append(div);
            const colorValues = colors.map(color => {
                div.setAttribute('style', 'background-color: '.concat(color, ' !important'));
                return { [color]: context.getComputedStyle(div)['backgroundColor'] };
            });
            const fontValues = fonts.map(font => {
                div.setAttribute('style', 'font: '.concat(font, ' !important'));
                const value = context.getComputedStyle(div);
                return {
                    [font]: ''
                        .concat(value['fontSize'], ' ')
                        .concat(value['fontFamily']),
                };
            });
            div?.parentNode?.removeChild(div);
            return {
                colors: context.hash(JSON.stringify(colorValues)),
                fonts: context.hash(JSON.stringify(fontValues)),
            };
        }
        catch {
            return undefined;
        }
    };
    return () => {
        try {
            const keys = computed();
            const values = system();
            return {
                str_1: keys?.interfaceName,
                str_4: keys?.keys,
                str_5: values?.colors,
                str_6: values?.fonts,
            };
        }
        catch {
            context.onDiagnostic('css');
            return {
                str_1: context.hash(''),
                str_4: context.hash(''),
                str_5: context.hash(''),
                str_6: context.hash(''),
            };
        }
    };
}

},"desktop-dtrait-media":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDesktopDTraitMediaCollector = createDesktopDTraitMediaCollector;
function createDesktopDTraitMediaCollector(context) {
    function supported() {
        try {
            const types = [
                'audio/ogg; codecs="vorbis"',
                'audio/mpeg',
                'audio/mpegurl',
                'audio/wav; codecs="1"',
                'audio/x-m4a',
                'audio/aac',
                'video/ogg; codecs="theora"',
                'video/quicktime',
                'video/mp4; codecs="avc1.42E01E"',
                'video/webm; codecs="vp8"',
                'video/webm; codecs="vp9"',
                'video/x-matroska',
            ].sort();
            const video = context.document.createElement('video'), audio = new context.Audio();
            const recorderPresent = 'MediaRecorder' in context.window;
            return types.reduce((items, mimeType) => {
                const item = {
                    mimeType,
                    audioPlayType: audio.canPlayType(mimeType),
                    videoPlayType: video.canPlayType(mimeType),
                    mediaSource: context.MediaSource.isTypeSupported(mimeType),
                    mediaRecorder: recorderPresent
                        ? context.MediaRecorder.isTypeSupported(mimeType)
                        : false,
                };
                if (!item.audioPlayType &&
                    !item.videoPlayType &&
                    !item.mediaSource &&
                    !item.mediaRecorder)
                    return items;
                items.push(item);
                return items;
            }, []);
        }
        catch {
            return undefined;
        }
    }
    return async () => {
        try {
            const items = supported();
            return {
                str_13: Array.isArray(items)
                    ? context.hash(items.map(item => item.mimeType).join(','))
                    : '',
            };
        }
        catch {
            context.onDiagnostic('md');
            return { str_13: context.hash('') };
        }
    };
}

},"desktop-dtrait-speech":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDesktopDTraitSpeechCollector = createDesktopDTraitSpeechCollector;
function createDesktopDTraitSpeechCollector(context) {
    const empty = () => ({ str_23: context.hash(''), str_22: context.hash('') });
    return async () => {
        await new Promise(resolve => context.setTimeout(() => resolve(), 50));
        return new Promise(resolve => {
            try {
                if (!('speechSynthesis' in context.window)) {
                    context.onDiagnostic('speech', '!supported');
                    resolve(empty());
                    return;
                }
                context.speechSynthesis.getVoices();
                const timer = context.setTimeout(() => {
                    context.onDiagnostic('speech', 'timeout');
                    resolve(empty());
                }, 300);
                const changed = () => {
                    const voices = context.speechSynthesis.getVoices();
                    const local = (voices || []).find(voice => voice.localService);
                    if (!voices || !voices.length || !local)
                        return;
                    context.clearTimeout(timer);
                    const seen = new Set();
                    const unique = voices.filter(voice => {
                        if (seen.has(voice.voiceURI))
                            return false;
                        seen.add(voice.voiceURI);
                        return true;
                    });
                    const localNames = unique
                        .filter(voice => voice.localService)
                        .map(voice => voice.name);
                    const remoteNames = unique
                        .filter(voice => !voice.localService)
                        .map(voice => voice.name);
                    const languages = [...new Set(unique.map(voice => voice.lang))];
                    const defaults = unique.filter(voice => voice.default && voice.localService);
                    let defaultName = '', defaultLang = '';
                    if (defaults.length === 1) {
                        defaultName = defaults[0].name;
                        defaultLang = (defaults[0].lang || '').replace(new RegExp('_'), '-');
                    }
                    resolve({
                        str_23: context.hash(''
                            .concat((languages || []).join(','), ',')
                            .concat((localNames || []).join(','))),
                        str_22: context.hash(''
                            .concat(defaultLang, ',')
                            .concat(defaultName, ',')
                            .concat((remoteNames || []).join(','))),
                    });
                };
                changed();
                if (context.speechSynthesis.addEventListener)
                    context.speechSynthesis.addEventListener('voiceschanged', changed);
                else
                    context.speechSynthesis.onvoiceschanged = changed;
            }
            catch {
                context.onDiagnostic('speech', 'error');
                resolve(empty());
            }
        });
    };
}

},"desktop-dtrait-svg":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDesktopDTraitSvgCollector = createDesktopDTraitSvgCollector;
function createDesktopDTraitSvgCollector(context) {
    return () => {
        const namespace = 'http://www.w3.org/2000/svg';
        const svg = context.document.createElementNS(namespace, 'svg');
        svg.id = 'secure-collect-svg';
        svg.setAttribute('width', '200');
        svg.setAttribute('height', '100');
        svg.setAttribute('style', 'opacity: 0;position: absolute;top: 0;left: 0;transform: translateX(-200px)');
        const rect = context.document.createElementNS(namespace, 'rect');
        rect.setAttribute('x', '10.5');
        rect.setAttribute('y', '20.25');
        rect.setAttribute('width', '123.45');
        rect.setAttribute('height', '67.89');
        svg.appendChild(rect);
        context.document.body.appendChild(svg);
        const box = rect.getBBox();
        if (svg.parentNode === context.document.body)
            context.document.body.removeChild(svg);
        else {
            const found = context.document.querySelector('#secure-collect-svg');
            if (found)
                found.parentNode?.removeChild(found);
        }
        const { x, y, width, height } = box;
        return {
            str_24: context.hash(''
                .concat(x, ',')
                .concat(y, ',')
                .concat(width, ',')
                .concat(height)),
        };
    };
}

},"desktop-dtrait-math":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDesktopDTraitMathCollector = createDesktopDTraitMathCollector;
function createDesktopDTraitMathCollector(context) {
    const math = context.Math;
    const zero = () => 0;
    return () => {
        const acos = math.acos || zero, atanh = math.atanh || zero;
        const sin = math.sin || zero, cos = math.cos || zero;
        const tan = math.tan || zero, expm1 = math.expm1 || zero;
        const powPI = (x) => math.pow(math.PI, x);
        const atanhPf = (x) => math.log((1 + x) / (1 - x)) / 2;
        const values = {
            math_acos: acos(0.12312423423423424),
            math_atanh: atanh(0.5),
            math_atanhPf: atanhPf(0.5),
            math_sin: sin(-1e300),
            math_cos: cos(10.000000000123),
            math_tan: tan(-1e300),
            math_expm1: expm1(1),
            math_powPI: powPI(-100),
        };
        const ignored = {};
        for (const key in values)
            ignored['hash_'.concat(key)] = context.hash(''.concat(values[key]));
        const combine = (a, b, c, d) => ''
            .concat(a, ',')
            .concat(b, ',')
            .concat(c, ',')
            .concat(d);
        return {
            str_11: context.hash(combine(values['math_tan'], values['math_atanh'], values['math_atanhPf'], values['math_cos'])),
            str_12: context.hash(combine(values['math_expm1'], values['math_powPI'], values['math_sin'], values['math_tan'])),
        };
    };
}

},"desktop-dtrait-webgl":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDesktopDTraitWebGLCollector = createDesktopDTraitWebGLCollector;
const VERTEX_SOURCE = '\n    attribute vec2 a_position;\n    attribute vec4 a_color;\n    uniform mat3 u_transform;\n    varying vec4 v_color;\n    void main() {\n      vec3 position = u_transform * vec3(a_position, 1.0);\n      gl_Position = vec4(position.xy, 0.0, 1.0);\n      v_color = a_color;\n    }\n  ';
const FRAGMENT_SOURCE = '\n    precision mediump float;\n    varying vec4 v_color;\n    void main() {\n      gl_FragColor = v_color;\n    }\n  ';
function createDesktopDTraitWebGLCollector(context) {
    const createContext = () => {
        if (typeof context.document === 'undefined') {
            context.onDiagnostic('webgl', 'document');
            return null;
        }
        const canvas = context.document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 200;
        const gl = canvas.getContext('webgl2') ||
            canvas.getContext('webgl', { preserveDrawingBuffer: true });
        if (gl)
            gl.__canvas = canvas;
        return gl;
    };
    const compile = (gl, source, type) => {
        const shader = gl.createShader(type);
        if (shader) {
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                gl.getShaderInfoLog(shader);
                context.onDiagnostic('webgl', 'shader');
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        }
        return undefined;
    };
    const program = (gl) => {
        const vertex = compile(gl, VERTEX_SOURCE, gl.VERTEX_SHADER);
        const fragment = compile(gl, FRAGMENT_SOURCE, gl.FRAGMENT_SHADER);
        if (!vertex || !fragment)
            return null;
        const value = gl.createProgram();
        gl.attachShader(value, vertex);
        gl.attachShader(value, fragment);
        gl.linkProgram(value);
        if (!gl.getProgramParameter(value, gl.LINK_STATUS)) {
            void 'Program linking failed: '.concat(gl.getProgramInfoLog(value));
            context.onDiagnostic('webgl', 'program');
            gl.deleteProgram(value);
            return null;
        }
        return value;
    };
    const vertices = () => {
        const triangle = [
            -0.8, -0.8, 1, 0, 0, 0.5, 0.8, -0.8, 0, 1, 0, 0.5, 0, 0.8, 0, 0, 1, 0.5,
        ];
        const rectangle = [
            -0.6, -0.3, 0.5, 0, 1, 0.5, 0.6, -0.3, 1, 0.5, 0, 0.5, 0.6, 0.3, 0, 1,
            0.5, 0.5, -0.6, 0.3, 1, 0, 1, 0.5,
        ];
        const ring = [];
        for (let index = 0; index <= 64; index++) {
            const angle = (index / 64) * context.Math.PI * 2;
            const cosine = context.Math.cos(angle), sine = context.Math.sin(angle);
            const red = context.Math.abs(context.Math.sin(angle));
            const green = context.Math.abs(context.Math.cos(angle));
            const blue = (red + green) / 2;
            ring.push(0 + cosine * 0.7, 0 + sine * 0.7, red, green, blue, 0.6);
            ring.push(0 + cosine * 0.4, 0 + sine * 0.4, green, blue, red, 0.6);
        }
        return new Float32Array([...triangle, ...rectangle, ...ring]);
    };
    const render = () => {
        const gl = createContext();
        if (!gl) {
            context.onDiagnostic('webgl', 'context');
            return '';
        }
        const value = program(gl);
        if (!value)
            return '';
        gl.useProgram(value);
        const position = gl.getAttribLocation(value, 'a_position');
        const color = gl.getAttribLocation(value, 'a_color');
        const transform = gl.getUniformLocation(value, 'u_transform');
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 24, 0);
        gl.vertexAttribPointer(color, 4, gl.FLOAT, false, 24, 8);
        gl.enableVertexAttribArray(position);
        gl.enableVertexAttribArray(color);
        const angle = context.Math.PI / 6;
        const cosine = context.Math.cos(angle), sine = context.Math.sin(angle);
        gl.uniformMatrix3fv(transform, false, new Float32Array([cosine, -sine, 0, sine, cosine, 0, 0, 0, 1]));
        gl.clearColor(0.9, 0.9, 0.9, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        const data = vertices();
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.drawArrays(gl.TRIANGLE_FAN, 3, 4);
        gl.drawArrays(gl.TRIANGLE_STRIP, 7, 64 * 2);
        const pixels = new Uint8Array(400 * 200 * 4);
        gl.readPixels(0, 0, 400, 200, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        const sampled = [];
        for (let index = 0; index < pixels.length; index += 100)
            sampled.push(pixels[index]);
        return JSON.stringify(sampled) || '';
    };
    const metadata = (key) => {
        const gl = createContext();
        const extension = gl?.getExtension?.call(gl, 'WEBGL_debug_renderer_info');
        return gl && extension ? gl.getParameter(extension[key]) || '' : '';
    };
    return () => ({
        str_26: context.hash(render()),
        str_33: context.hash(''
            .concat(context.hash(metadata('UNMASKED_RENDERER_WEBGL')), ',')
            .concat(context.hash(metadata('UNMASKED_VENDOR_WEBGL')))),
    });
}

},"desktop-dtrait-fonts":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDesktopDTraitFontsCollector = createDesktopDTraitFontsCollector;
const desktop_dtrait_font_data_js_1 = require("./desktop-dtrait-font-data.js");
function systemVersion(fonts) {
    const windows = {
        '11': desktop_dtrait_font_data_js_1.WINDOWS_FONTS['11'].find(font => fonts.includes(font)),
        '10': desktop_dtrait_font_data_js_1.WINDOWS_FONTS['10'].find(font => fonts.includes(font)),
        '8.1': desktop_dtrait_font_data_js_1.WINDOWS_FONTS['8.1'].find(font => fonts.includes(font)),
        '8': desktop_dtrait_font_data_js_1.WINDOWS_FONTS['8'].find(font => fonts.includes(font)),
        '7': desktop_dtrait_font_data_js_1.WINDOWS_FONTS['7'].every(font => fonts.includes(font)),
    };
    const signature = Object.keys(windows)
        .sort()
        .filter(key => Boolean(windows[key]))
        .join(',');
    const windowsVersions = {
        '10,11,7,8,8.1': '11',
        '10,7,8,8.1': '10',
        '7,8,8.1': '8.1',
    };
    if (windowsVersions[signature])
        return 'Windows '.concat(windowsVersions[signature]);
    const apple = {
        '13': desktop_dtrait_font_data_js_1.APPLE_FONTS['13'].find(font => fonts.includes(font)),
        '12': desktop_dtrait_font_data_js_1.APPLE_FONTS['12'].find(font => fonts.includes(font)),
        '10.15-11': desktop_dtrait_font_data_js_1.APPLE_FONTS['10.15-11'].find(font => fonts.includes(font)),
    };
    const appleSignature = Object.keys(apple)
        .sort()
        .filter(key => Boolean(apple[key]))
        .join(',');
    const appleVersions = {
        '10.10,10.11,10.12,10.13-10.14,10.15-11,10.9,12,13': 'Ventura',
        '10.10,10.11,10.12,10.13-10.14,10.15-11,10.9,12': 'Monterey',
    };
    return appleVersions[appleSignature]
        ? 'macOS '.concat(appleVersions[appleSignature])
        : undefined;
}
function createDesktopDTraitFontsCollector(context) {
    const detect = async () => {
        try {
            const random = String.fromCharCode(context.Math.random() * 26 + 97) +
                context.Math.random().toString(36).slice(-7);
            if (!context.document.fonts.check('0px "'.concat(random, '"')))
                return desktop_dtrait_font_data_js_1.CANDIDATE_FONTS.filter(font => context.document.fonts.check('0px "'.concat(font, '"')));
            const faces = desktop_dtrait_font_data_js_1.CANDIDATE_FONTS.map(font => new context.FontFace(font, 'local("'.concat(font, '")')));
            const loaded = await Promise.all(faces.map(face => face.load().catch(() => null)));
            return loaded?.filter(face => face !== null).map(face => face?.family);
        }
        catch {
            context.onDiagnostic('font-detection');
            return [];
        }
    };
    return async () => {
        let root = null;
        let container = null;
        try {
            const document = context.document;
            root = document.createElement('div');
            root.setAttribute('id', 'font-fingerprint');
            document.body.appendChild(root);
            const emojiFragment = context.document.createDocumentFragment();
            desktop_dtrait_font_data_js_1.EMOJI.forEach(text => {
                const node = context.document.createElement('div');
                node.className = 'pixel-emoji';
                node.textContent = text;
                emojiFragment.appendChild(node);
            });
            const style = context.document.createElement('style');
            style.textContent =
                '\n      .pixel-emoji {\n        font-family: '.concat(desktop_dtrait_font_data_js_1.FONT_STYLE, ';\n        font-size: 200px !important;\n        height: auto;\n        position: absolute !important;\n        transform: scale(1.000999);\n      }\n    ');
            const fragment = context.document.createDocumentFragment();
            fragment.appendChild(style);
            container = context.document.createElement('div');
            container.id = 'pixel-emoji-container';
            container.appendChild(emojiFragment);
            fragment.appendChild(container);
            const found = document.getElementById('font-fingerprint');
            if (found)
                found.parentNode?.replaceChild(fragment, found);
            const nodes = Array.from(document.querySelectorAll('.pixel-emoji'));
            const sizes = new Set(), emojiSet = new Set();
            nodes.forEach((node, index) => {
                const measured = context.getComputedStyle(node);
                const emoji = desktop_dtrait_font_data_js_1.EMOJI[index];
                const size = ''
                    .concat(measured.inlineSize, ',')
                    .concat(measured.blockSize);
                if (!sizes.has(size)) {
                    sizes.add(size);
                    emojiSet.add(emoji);
                }
            });
            const sum = [...sizes]
                .map(size => size
                .split(',')
                .map(value => context.parseFloat(value))
                .reduce((a, b) => a + b, 0))
                .reduce((a, b) => a + b, 0) * 0.00001;
            const foundFonts = await detect();
            const system = systemVersion(foundFonts);
            return {
                str_10: context.hash((foundFonts || []).join(',')),
                str_17: context.hash(''
                    .concat(context.navigator.platform, ',')
                    .concat(system)),
                str_7: context.hash([...emojiSet].join(',')),
                str_21: context.hash(''.concat(sum)),
            };
        }
        catch {
            context.onDiagnostic('ft');
            return {
                str_10: context.hash(''),
                str_17: context.hash(''),
                str_7: context.hash(''),
                str_21: context.hash(''),
            };
        }
        finally {
            if (container) {
                while (container.firstChild)
                    container.removeChild(container.firstChild);
                container = null;
            }
            if (root && root.parentNode) {
                root.parentNode.removeChild(root);
                root = null;
            }
            if (typeof context.window.gc === 'function')
                context.window.gc();
        }
    };
}

},"desktop-dtrait-font-data":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CANDIDATE_FONTS = exports.APPLE_FONTS = exports.WINDOWS_FONTS = exports.FONT_STYLE = exports.EMOJI = void 0;
exports.EMOJI = [
    '😀',
    '☺',
    '🤵‍♂️',
    '♨',
    '☸',
    '⚧',
    '⁉',
    'ℹ',
    '🏳️‍⚧️',
    '🥲',
    '☹',
    '☠',
    '🧑‍🦰',
    '🧏‍♂️',
    '⛷',
    '🧑‍🤝‍🧑',
    '☘',
    '⛰',
    '⛩',
    '⛴',
    '✈',
    '⏱',
    '⛈',
    '☂',
    '⛱',
    '☃',
    '☄',
    '⛸',
    '♟',
    '⛑',
    '⌨',
    '✉',
    '✏',
    '👩‍❤️‍💋‍👨',
    '👨‍👩‍👧‍👦',
    '👨‍👩‍👦',
    '😀',
    '©',
    '®',
    '™',
    '👁️‍🗨️',
    '✒',
    '✂',
    '⛏',
    '⚒',
    '⚔',
    '⚙',
    '⛓',
    '⚗',
    '⚰',
    '⚱',
    '⚠',
    '☢',
    '☣',
    '⬆',
    '↗',
    '➡',
    '⬅',
    '⚛',
    '✡',
    '✝',
    '☦',
    '▶',
    '⏭',
    '⏯',
    '⏏',
    '♀',
    '♂',
    '✖',
    '〰',
    '⚕',
    '⚜',
    '✔',
    '✳',
    '❇',
    '◼',
    '▪',
    '❣',
    '❤',
    '✌',
    '☝',
    '✍',
    '❄',
    '⚖',
    '↪',
    '☯',
    '☪',
    '☮',
    '☑',
    '✴',
    '🅰',
    '🅿',
];
exports.FONT_STYLE = "\n\t'Segoe Fluent Icons',\n\t'Ink Free',\n\t'Bahnschrift',\n\t'Segoe MDL2 Assets',\n\t'HoloLens MDL2 Assets',\n\t'Leelawadee UI',\n\t'Javanese Text',\n\t'Segoe UI Emoji',\n\t'Aldhabi',\n\t'Gadugi',\n\t'Myanmar Text',\n\t'Nirmala UI',\n\t'Lucida Console',\n\t'Cambria Math',\n\t'Bai Jamjuree',\n\t'Chakra Petch',\n\t'Charmonman',\n\t'Fahkwang',\n\t'K2D',\n\t'Kodchasan',\n\t'KoHo',\n\t'Sarabun',\n\t'Srisakdi',\n\t'Galvji',\n\t'MuktaMahee Regular',\n\t'InaiMathi Bold',\n\t'American Typewriter Semibold',\n\t'Futura Bold',\n\t'SignPainter-HouseScript Semibold',\n\t'PingFang HK Light',\n\t'Kohinoor Devanagari Medium',\n\t'Luminari',\n\t'Geneva',\n\t'Helvetica Neue',\n\t'Droid Sans Mono',\n\t'Dancing Script',\n\t'Roboto',\n\t'Ubuntu',\n\t'Liberation Mono',\n\t'Source Code Pro',\n\t'DejaVu Sans',\n\t'OpenSymbol',\n\t'Chilanka',\n\t'Cousine',\n\t'Arimo',\n\t'Jomolhari',\n\t'MONO',\n\t'Noto Color Emoji',\n\tsans-serif !important\n";
exports.WINDOWS_FONTS = {
    '7': ['Cambria Math', 'Lucida Console'],
    '8': ['Aldhabi', 'Gadugi', 'Myanmar Text', 'Nirmala UI'],
    '10': [
        'HoloLens MDL2 Assets',
        'Segoe MDL2 Assets',
        'Bahnschrift',
        'Ink Free',
    ],
    '11': ['Segoe Fluent Icons'],
    '8.1': ['Leelawadee UI', 'Javanese Text', 'Segoe UI Emoji'],
};
exports.APPLE_FONTS = {
    '12': [
        'Noto Sans Gunjala Gondi Regular',
        'Noto Sans Masaram Gondi Regular',
        'Noto Serif Yezidi Regular',
    ],
    '13': [
        'Apple SD Gothic Neo ExtraBold',
        'STIX Two Math Regular',
        'STIX Two Text Regular',
        'Noto Sans Canadian Aboriginal Regular',
    ],
    '10.9': ['Helvetica Neue', 'Geneva'],
    '10.10': ['Kohinoor Devanagari Medium', 'Luminari'],
    '10.11': ['PingFang HK Light'],
    '10.12': [
        'American Typewriter Semibold',
        'Futura Bold',
        'SignPainter-HouseScript Semibold',
    ],
    '10.13-10.14': ['InaiMathi Bold'],
    '10.15-11': ['Galvji', 'MuktaMahee Regular'],
};
exports.CANDIDATE_FONTS = [
    'Aldhabi',
    'American Typewriter Semibold',
    'Amiri',
    'Apple SD Gothic Neo ExtraBold',
    'Arimo',
    'Bahnschrift',
    'Cambria Math',
    'Chilanka',
    'Cousine',
    'Dancing Script',
    'DejaVu Sans',
    'Droid Sans Mono',
    'Futura Bold',
    'Gadugi',
    'Galvji',
    'Geneva',
    'Gentium Book Basic',
    'Helvetica Neue',
    'HoloLens MDL2 Assets',
    'InaiMathi Bold',
    'Ink Free',
    'Javanese Text',
    'Jomolhari',
    'KACSTOffice',
    'Kohinoor Devanagari Medium',
    'Leelawadee UI',
    'Liberation Mono',
    'Lucida Console',
    'Luminari',
    'MONO',
    'MS Outlook',
    'MuktaMahee Regular',
    'Myanmar Text',
    'Nirmala UI',
    'Noto Color Emoji',
    'Noto Sans Canadian Aboriginal Regular',
    'Noto Sans Gunjala Gondi Regular',
    'Noto Sans Masaram Gondi Regular',
    'Noto Serif Yezidi Regular',
    'OpenSymbol',
    'PingFang HK Light',
    'Roboto',
    'STIX Two Math Regular',
    'STIX Two Text Regular',
    'Segoe Fluent Icons',
    'Segoe MDL2 Assets',
    'Segoe UI Emoji',
    'SignPainter-HouseScript Semibold',
    'Source Code Pro',
    'Ubuntu',
    'ZWAdobeF',
];

},"desktop-dtrait-audio":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDesktopDTraitAudioCollector = createDesktopDTraitAudioCollector;
function createDesktopDTraitAudioCollector(context) {
    return async () => {
        try {
            context.Date.now();
            const Audio = context.OfflineAudioContext;
            const audio = new Audio(1, 5000, 44100);
            const analyser = audio.createAnalyser();
            const oscillator = audio.createOscillator();
            const compressor = audio.createDynamicsCompressor();
            oscillator.type = 'triangle';
            oscillator.frequency.value = 10000;
            compressor.threshold.value = -50;
            compressor.knee.value = 40;
            compressor.attack.value = 0;
            oscillator.connect(compressor);
            compressor.connect(analyser);
            compressor.connect(audio.destination);
            oscillator.start(0);
            audio.startRendering();
            return new Promise(resolve => {
                audio.oncomplete = event => {
                    const buffer = event.renderedBuffer;
                    const frequency = new Float32Array(analyser.frequencyBinCount);
                    const time = new Float32Array(analyser.fftSize);
                    analyser.getFloatFrequencyData(frequency);
                    analyser.getFloatTimeDomainData(time);
                    const frequencySum = [...frequency].reduce((sum, value) => sum + context.Math.abs(value), 0);
                    const timeSum = [...time].reduce((sum, value) => sum + context.Math.abs(value), 0);
                    const first100 = frequency
                        .slice(0, 100)
                        .reduce((sum, value) => sum + context.Math.abs(value), 0);
                    const unique = new Set(buffer.getChannelData(0))?.size;
                    resolve({
                        str_8: context.hash(''.concat((frequencySum || ''))),
                        str_9: context.hash(''.concat((timeSum || ''))),
                        str_20: context.hash(''.concat((first100 || ''))),
                        str_25: context.hash(''.concat((unique || ''))),
                    });
                };
            });
        }
        catch {
            context.onDiagnostic('audio');
            return {
                str_8: context.hash(''),
                str_9: context.hash(''),
                str_20: context.hash(''),
                str_25: context.hash(''),
            };
        }
    };
}

},"desktop-dtrait-transport":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDesktopDTraitResponseHeaders = parseDesktopDTraitResponseHeaders;
exports.createDesktopDTraitTransportInstaller = createDesktopDTraitTransportInstaller;
const singletonHeaders = [
    'age',
    'authorization',
    'content-length',
    'content-type',
    'etag',
    'expires',
    'from',
    'host',
    'if-modified-since',
    'if-unmodified-since',
    'last-modified',
    'location',
    'max-forwards',
    'proxy-authorization',
    'referer',
    'retry-after',
    'user-agent',
];
function parseDesktopDTraitResponseHeaders(raw) {
    const headers = {};
    if (!raw)
        return headers;
    raw.split('\n').forEach(line => {
        const colon = line.indexOf(':');
        const name = line.substring(0, Math.max(0, colon)).trim().toLowerCase();
        const value = line.substring(colon + 1).trim();
        if (!name)
            return;
        if (headers[name] && singletonHeaders.indexOf(name) >= 0)
            return;
        headers[name] =
            name === 'set-cookie'
                ? (headers[name] || []).concat([value])
                : headers[name]
                    ? headers[name] + ', ' + value
                    : value;
    });
    return headers;
}
function createDesktopDTraitTransportInstaller(realm, diagnostics = {}) {
    const fetchPresent = 'fetch' in realm.window, requestPresent = 'Request' in realm.window, headersPresent = 'Headers' in realm.window;
    const parseUrl = (input) => {
        try {
            const url = new realm.URL(input, realm.window.location.href);
            const { host, pathname, searchParams } = url;
            const query = {};
            for (const [key, value] of searchParams.entries())
                query[key] = value;
            return {
                host,
                pathname,
                urlObj: url,
                query,
                fullUrl: input,
            };
        }
        catch {
            return { pathname: input };
        }
    };
    const observe = (task) => {
        void task.catch(error => {
            try {
                diagnostics.onBackgroundError?.(error);
            }
            catch {
            }
        });
    };
    return (callbacks) => {
        const nativeOpen = realm.window.XMLHttpRequest.prototype.open;
        const nativeSend = realm.window.XMLHttpRequest.prototype.send;
        const nativeSetHeader = realm.window.XMLHttpRequest.prototype.setRequestHeader;
        const nativeFetch = realm.window.fetch;
        const owner = {
            processResponseConfig: callbacks.processResponseConfig,
            processRequestConfig: callbacks.processRequestConfig,
            hookConfig: callbacks.hookConfig,
            errorRequestConfig: callbacks?.errorRequestConfig || (() => null),
        };
        realm.XMLHttpRequest.prototype.open = function () {
            this.secureOpenArgs = arguments;
            this.ucProxyParam = { startTime: realm.Date.now() };
            nativeOpen.apply(this, arguments);
        };
        realm.XMLHttpRequest.prototype.send = function () {
            const xhr = this, openArgs = this.secureOpenArgs, args = arguments;
            const method = openArgs[0] || 'GET';
            const config = Object.assign({}, parseUrl(openArgs[1]) || {}, { method });
            const { needProxy = false, onlyProxyReq = false, onlyProxyResp = false, } = owner.hookConfig(config) || {};
            if (!needProxy && !onlyProxyReq && !onlyProxyResp)
                return nativeSend.apply(xhr, args);
            const error = (errType, err) => owner.errorRequestConfig?.({ config, errType, err, instance: xhr });
            xhr.addEventListener('error', event => {
                error('error', event);
            });
            xhr.addEventListener('abort', event => {
                error('abort', event);
            });
            xhr.addEventListener('timeout', event => {
                error('timeout', event);
            });
            const reqHeaders = {};
            let extras = {};
            const wrap = (previous) => async function (...values) {
                if (xhr.readyState === 4 &&
                    'getAllResponseHeaders' in xhr &&
                    typeof xhr.getAllResponseHeaders === 'function' &&
                    (needProxy || onlyProxyResp)) {
                    const headers = parseDesktopDTraitResponseHeaders(xhr.getAllResponseHeaders());
                    await owner.processResponseConfig({
                        config,
                        headers: headers || {},
                        reqHeaders,
                        extras,
                        httpCode: xhr.status,
                    }, xhr);
                }
                if (previous)
                    return previous.apply(xhr, values);
                return undefined;
            };
            if ('onloadend' in xhr && typeof xhr.onloadend === 'function') {
                const previous = xhr.onloadend;
                xhr.onloadend = wrap(previous);
            }
            else {
                const previous = xhr.onreadystatechange;
                const hasPrevious = 'onreadystatechange' in xhr && typeof previous === 'function';
                xhr.onreadystatechange = wrap(hasPrevious
                    ? previous
                    : undefined);
            }
            if ((openArgs.length >= 3 && !openArgs[2]) || onlyProxyResp)
                return nativeSend.apply(xhr, args);
            const pending = owner.processRequestConfig?.(config, xhr).then(value => {
                const { headers = {}, extras: nextExtras = {} } = value || {};
                extras = nextExtras;
                Object.keys(headers).forEach(key => {
                    reqHeaders[key] = headers[key];
                    nativeSetHeader.call(xhr, key, headers[key]);
                });
                return nativeSend.apply(xhr, args);
            });
            if (pending)
                observe(pending);
            return undefined;
        };
        if (fetchPresent)
            realm.window.fetch = function (input, init) {
                const receiver = this;
                const isRequest = () => requestPresent && input instanceof realm.Request;
                let url, method;
                if (isRequest()) {
                    url = input.url;
                    method = input.method;
                }
                else {
                    url = input;
                    method = init && init.method ? init.method : 'GET';
                }
                const meta = {
                    ucProxyParam: { startTime: realm.Date.now() },
                };
                const config = Object.assign({}, parseUrl(url) || {}, { method });
                const { needProxy = false, onlyProxyReq = false, onlyProxyResp = false, } = owner.hookConfig(config) || {};
                const response = (value, reqHeaders, extras) => {
                    if (needProxy || onlyProxyResp) {
                        const headers = {};
                        if (value?.headers) {
                            if (typeof value?.headers?.forEach === 'function')
                                value?.headers?.forEach?.((item, key) => {
                                    headers[key] = item;
                                });
                            else if (typeof value?.headers?.get === 'function') {
                                for (const key of [
                                    'x-tt-session-dtrait-token',
                                    'bd-ticket-guard-server-data',
                                    'bd-ticket-guard-result',
                                    'x-tt-logid',
                                ])
                                    headers[key] = value?.headers?.get(key) || '';
                            }
                            return owner
                                .processResponseConfig({ config, headers, reqHeaders, extras }, meta)
                                .then(() => value);
                        }
                    }
                    return value;
                };
                if (needProxy || onlyProxyReq)
                    return owner.processRequestConfig(config, meta).then(value => {
                        const { headers = {}, extras = {} } = value || {};
                        try {
                            if (isRequest())
                                Object.keys(headers).forEach(key => {
                                    input.headers.set(key, headers[key]);
                                });
                            else {
                                init = init || {};
                                init.headers = init.headers || {};
                                if (headersPresent && init?.headers instanceof realm.Headers)
                                    Object.keys(headers).forEach(key => {
                                        init?.headers?.set?.(key, headers[key]);
                                    });
                                else if (init && init.headers && Array.isArray(init.headers))
                                    Object.keys(headers).forEach(key => {
                                        if (init && init.headers && Array.isArray(init.headers))
                                            init?.headers?.push([
                                                key,
                                                headers[key],
                                            ]);
                                    });
                                else
                                    Object.keys(headers).forEach(key => {
                                        init.headers[key] = headers[key];
                                    });
                            }
                        }
                        catch {
                            diagnostics.onDiagnostic?.('fetch-headers');
                        }
                        return nativeFetch
                            .call(receiver, input, init)
                            .then(value => response(value, headers, extras))
                            .catch(error => {
                            owner.errorRequestConfig?.({
                                config,
                                err: error,
                                instance: meta,
                                errType: 'error',
                            });
                            return Promise.reject(error);
                        });
                    });
                return nativeFetch
                    .call(this, input, init)
                    .then(value => response(value));
            };
    };
}

},"desktop-dtrait-crypto":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesktopDTraitRsa = exports.DesktopDTraitAes = void 0;
exports.createDesktopDTraitCryptoUtil = createDesktopDTraitCryptoUtil;
exports.installDesktopDTraitCrypto = installDesktopDTraitCrypto;
function createDesktopDTraitCryptoUtil(context) {
    const parseQuery = (text) => {
        if (!text)
            return {};
        const result = {};
        (text.indexOf('?') === 0 ? text.slice(1) : text)
            .split('&')
            .forEach(pair => {
            const [name, value = ''] = pair.split('=');
            result[name] = decodeURIComponent(value);
        });
        return result;
    };
    const getQuery = (url) => {
        if (!url)
            return parseQuery(context.location.search.slice(1));
        const parts = url.split('?');
        if (parts.length < 2)
            return {};
        return parseQuery(parts[parts.length - 1].split('#')[0]);
    };
    return {
        parseQuery,
        getQuery,
        isSupportSystemCrypto: () => !getQuery()['disableSystemCrypto'] &&
            Boolean(context.window.crypto?.subtle),
        bufferConcat: (values) => {
            const result = new Uint8Array(values.reduce((sum, value) => sum + value.byteLength, 0));
            let offset = 0;
            for (const value of values) {
                result.set(new Uint8Array(value), offset);
                offset += value.byteLength;
            }
            return result;
        },
        buff2base64: (value) => context.btoa(String.fromCharCode(...value)),
        base642buff: (value) => {
            const text = context.atob(value);
            return Uint8Array.from(text, char => char.charCodeAt(0));
        },
        hexToUint8Array: (value) => new Uint8Array(value.match(/.{2}/g).map(pair => parseInt(pair, 16))),
        uint8ArrayToHex: (value) => {
            let text = '';
            value.forEach(byte => {
                text += byte.toString(16).padStart(2, '0');
            });
            return text;
        },
        unit8ArrayToString: (value) => {
            let text = '';
            for (const byte of value)
                text += String.fromCharCode(byte);
            return text;
        },
        getRandomValues: (value) => {
            if (context.window.crypto?.getRandomValues)
                context.window.crypto.getRandomValues(value);
            else
                for (let i = 0; i < value.length; i++)
                    value[i] = (4294967296 * context.Math.random()) | 0;
            return value;
        },
    };
}
class DesktopDTraitAes {
    context;
    supportSystemCrypto = false;
    cryptoJS = null;
    initPromise;
    util;
    constructor(context) {
        this.context = context;
        this.util = createDesktopDTraitCryptoUtil(context);
        this.initPromise = this.init();
        observe(context, this.initPromise);
    }
    init = async () => {
        if (!this.util.isSupportSystemCrypto()) {
            this.supportSystemCrypto = false;
            this.cryptoJS = await this.context.loadCryptoJS();
        }
        else
            this.supportSystemCrypto = true;
        return Promise.resolve(true);
    };
    getIv = (length = 16) => this.util.getRandomValues(new Uint8Array(length));
    getAesKey = () => this.util.getRandomValues(new Uint8Array(16));
    encryptData = async (hexKey, text) => {
        const iv = this.getIv();
        if (this.supportSystemCrypto)
            return await this.encryptDataWithLocal(hexKey, text, iv);
        await this.initPromise;
        return await this.encryptDataWithCryptoJS(this.util.hexToUint8Array(hexKey), text, iv);
    };
    encryptDataWithLocal = async (hexKey, text, iv) => {
        const key = await this.context.crypto.subtle.importKey('raw', this.util.hexToUint8Array(hexKey), { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']);
        const input = new this.context.TextEncoder().encode(text);
        const encrypted = new Uint8Array(await this.context.crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, input));
        return {
            cipherText: this.util.buff2base64(this.util.bufferConcat([iv, encrypted])),
            encryptedData: this.util.buff2base64(encrypted),
            iv: this.util.buff2base64(iv),
        };
    };
    encryptDataWithCryptoJS = async (key, text, iv) => {
        if (!this.cryptoJS)
            await this.initPromise;
        const js = this.cryptoJS, ivWords = js.lib.WordArray.create(iv), keyWords = js.lib.WordArray.create(key), textWords = js.lib.WordArray.create(new this.context.TextEncoder().encode(text));
        const encrypted = js.AES.encrypt(textWords, keyWords, {
            iv: ivWords,
            mode: js.mode.CBC,
            padding: js.pad.Pkcs7,
        }).ciphertext.toString(js.enc.Base64);
        return {
            cipherText: this.util.buff2base64(this.util.bufferConcat([iv, this.util.base642buff(encrypted)])),
            encryptedData: encrypted,
            iv: this.util.buff2base64(iv),
        };
    };
}
exports.DesktopDTraitAes = DesktopDTraitAes;
class DesktopDTraitRsa {
    context;
    supportSystemCrypto = false;
    JSEncrypt = null;
    initPromise;
    constructor(context) {
        this.context = context;
        this.initPromise = this.init();
        observe(context, this.initPromise);
    }
    init = async () => this.context.loadJSEncrypt().then(module => {
        this.JSEncrypt = module.default;
        return true;
    });
    encryptData = async (publicKey, text) => {
        await this.initPromise;
        if (!this.JSEncrypt)
            return '';
        const cipher = new this.JSEncrypt();
        cipher.setPublicKey(publicKey);
        const result = cipher.encrypt(text);
        return result === false ? '' : result;
    };
}
exports.DesktopDTraitRsa = DesktopDTraitRsa;
const installed = new WeakMap();
function installDesktopDTraitCrypto(context, target) {
    const previous = installed.get(target);
    if (previous)
        return previous;
    const aes = new DesktopDTraitAes(context);
    target['DTraitUcAesEncrypt'] = aes;
    const rsa = new DesktopDTraitRsa(context);
    target['DTraitUcRsaEncrypt'] = rsa;
    const util = createDesktopDTraitCryptoUtil(context);
    target['DTraitUcCryptoJSUtil'] = util;
    const result = { aes, rsa, util };
    installed.set(target, result);
    return result;
}
function observe(context, task) {
    void task.catch(error => {
        try {
            context.onBackgroundError?.(error);
        }
        catch {
        }
    });
}

},"desktop-dtrait-browser-bootstrap":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DESKTOP_DTRAIT_LOCAL_CORE_VERSION = void 0;
exports.createDesktopDTraitBrowserBootstrap = createDesktopDTraitBrowserBootstrap;
const desktop_dtrait_bootstrap_js_1 = require("./desktop-dtrait-bootstrap.js");
const desktop_dtrait_browser_install_js_1 = require("./desktop-dtrait-browser-install.js");
exports.DESKTOP_DTRAIT_LOCAL_CORE_VERSION = '1.0.31';
const acceptedVersions = new Set([
    exports.DESKTOP_DTRAIT_LOCAL_CORE_VERSION,
    ...[
        'lf-douyin-pc-web.douyinstatic.com',
        'lf-ucenter-web.yhgfb-cn-static.com',
    ].map(host => `https://${host}/obj/passport-fe/ucenter_fe/@byted/uc-secure-dtrait-core/1.0.31/dist/index.umd.production.js`),
]);
const bootstraps = new WeakMap();
function createDesktopDTraitBrowserBootstrap(realm, options) {
    const previous = bootstraps.get(realm.window);
    if (previous)
        return previous;
    const installation = (0, desktop_dtrait_browser_install_js_1.installDesktopDTraitBrowser)(realm, options);
    const target = realm.window;
    const requireVersion = (version) => {
        if (!acceptedVersions.has(version)) {
            throw new Error('Unsupported DTrait core version; local implementation requires verified 1.0.31');
        }
        if (target.DTraitSDK !== installation.core) {
            throw new Error('DTrait browser core ownership changed');
        }
    };
    const bootstrap = new desktop_dtrait_bootstrap_js_1.DesktopDTraitBootstrap({
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

},"desktop-dtrait-bootstrap":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesktopDTraitBootstrap = void 0;
const desktop_dtrait_parameters_js_1 = require("./desktop-dtrait-parameters.js");
class DesktopDTraitBootstrap {
    context;
    parameters;
    coreResult = false;
    loaded = false;
    loading;
    builtin = {
        urlVersion: '1.0.31',
        centralRsaPub: 'LS0tLS1CRUdJTiBSU0EgUFVCTElDIEtFWS0tLS0tCk1JSUJDZ0tDQVFFQTQrZHZ2WTd1TStvcGMrbkxHL0R1bVNlRm83YVZjSW0xTE8rbVVJcldwclJ6UDBhMUdwRVEKNHF0TzlNUmYvbHdFSXgzOCs0Qlo0WE9HemV2VnR1VXZmSU9VRTdBVHRRVzdGS0pmNVBuU0xDSTYvazB2bDFGQwpMVVNWbUVQNnFQSnJJalo0elhvcWkzeXVOWisxb2RiUkEvL0dIZ2NnU3l5eWFMcXp3amtwV0dYb3VNWW12WXNTCnBway9mdjJFV0FCc3RQTnhXYTRFT0JDYWRUVVBrWE5RNzZOQkVQOXh6ZkpTMjB3aUR2MW9TL3ZLdnJTVXBXY0oKbmF6a2tCdnFRYmJBcVZiUUZURi9EUGlrcHB1NlpUNmxHSVh2SktDcmVlRmlIQTJxSzZ0UzE4U1dWSFc5QVJ6MQorcGpCMWVxSUlZdG9oV3BUMkI0ME9DNE84dFZlQkFuYmlRSURBUUFCCi0tLS0tRU5EIFJTQSBQVUJMSUMgS0VZLS0tLS0=',
        centralVersion: 'd0',
        edgeRsaPub: 'LS0tLS1CRUdJTiBSU0EgUFVCTElDIEtFWS0tLS0tCk1JSUJDZ0tDQVFFQXlFQkQ0MXQzcWpqL1NOaU5rT3BBbnNGdGZKZ0F5MGF5VTZCbEJ3RS9EZVZjNkdWV0xWUk4KWjdiMWRuRHVmQk5iUm1XQjlZeWVyYm1FOFFDM2lPOXp1NVFWd2x4SGV2ZEN0ZFFyeDZpQzF3QVRoaHFjdTNIYgprZ1dsazZ1Ylk5MXRvRFhNd0k2WGdmRUoyVEJsdHVSbklXRjR5RDVEaEc2c3lSSVNmNTRMWGY0WjgzbzlGcXNvCmlsNkV3cVZCbEU3dXlIY3dJOTA5WDg4Rlc3MXFLdmJMU040OGJlQ0EwbzFmZitqbmhRakNBTDZqbUR2dUhJeWEKUk1vYm1wRFVOLzQ3L3NHbDNzNDlFOEZFSEFXUmk5d1cyc2NZUDBJTkJXUlR5RlRHcG9GUGlqekJFUndnYzdrWQozVno3ZytSMXd2RkxUSEVITEtYUWFwTHpEMWR5Uk81YUt3SURBUUFCCi0tLS0tRU5EIFJTQSBQVUJMSUMgS0VZLS0tLS0K',
        edgeVersion: 'd0',
        dTraitVersion: '0',
    };
    constructor(context) {
        this.context = context;
        this.parameters = new desktop_dtrait_parameters_js_1.DesktopDTraitParameters(context.parameters);
    }
    setWebId = (value) => {
        this.context.monitor.setWebId?.(value);
    };
    start = async (options) => {
        const { aid = 6383, consumerPathList = [], urlRewriteRules = [], consumerHostList = [], reportAppLog, webId, libraGroup = '', delayCollect = 0, useBuildIn = false, } = options;
        const { monitor, window } = this.context, now = () => this.context.parameters.Date.now();
        monitor.init({
            appId: aid,
            commonParams: { dTraitVersion: '1.0.23' },
            webId,
            reportAppLog,
        }, {
            slardarInstance: this.context.monitorInstances?.slardarInstance,
            teaInstance: this.context.monitorInstances?.teaInstance,
        });
        let params = {
            centralVersion: '',
            dTraitVersion: '',
            edgeVersion: '',
            urlVersion: '',
            centralRsaPub: '',
            edgeRsaPub: '',
        };
        const initialize = async () => {
            if (useBuildIn) {
                const start = now();
                let cdnResult = 0;
                try {
                    if (!window.DTraitSDK)
                        await this.loadCore('1.0.31', options.aid);
                    params = { ...this.builtin };
                    cdnResult = 1;
                }
                catch {
                }
                monitor.sendSlardarEvent({
                    name: 'dtrait_sdk_init_local',
                    metrics: {
                        duration: now() - start,
                        performance: this.context.performance?.now?.() || 0,
                    },
                    categories: { cdn_result: cdnResult, ...this.cryptoPresence() },
                });
            }
            else {
                const start = now();
                params = await this.parameters.get(aid).catch(error => {
                    monitor.sendSlardarLog({
                        content: `[getDTraitParamsWithCache error]: ${error}`,
                    });
                    return this.builtin;
                });
                const duration = now() - start;
                if (!this.coreResult) {
                    let urlDuration = 0, cdnResult = 0;
                    try {
                        const begin = now();
                        await this.loadCore(params['urlVersion'], options.aid);
                        urlDuration = now() - begin;
                        cdnResult = 1;
                    }
                    catch {
                    }
                    monitor.sendSlardarEvent({
                        name: 'dtrait_sdk_init',
                        metrics: {
                            url_duration: urlDuration,
                            int_duration: duration,
                            performance: this.context.performance?.now?.() || 0,
                        },
                        categories: {
                            dataFrom: params['dataFrom'],
                            cdn_result: cdnResult,
                            ...this.cryptoPresence(),
                        },
                    });
                }
            }
        };
        await initialize();
        monitor.setConfig({
            centralVersion: params?.['centralVersion'],
            dTraitVersion: params?.['dTraitVersion'],
            edgeVersion: params?.['edgeVersion'],
            urlVersion: params?.['urlVersion'],
            dTraitContainerSdkVersion: '1.0.23',
            useBuildIn: Number(useBuildIn || false),
        });
        const module = (this.context.localCore
            ? this.context.localCore.resolve(params)
            : window.DTraitSDK);
        return (this.coreResult = (module.default || module).getInstance(params, {
            dTraitPath: consumerPathList,
            dTraitHost: consumerHostList,
            urlRewriteRules,
            containerSdkVersion: '1.0.23',
            libraGroup,
            delayCollect,
            monitor: {
                sendSlardarEvent: monitor.sendSlardarEvent,
                sendSlardarLog: monitor.sendSlardarLog,
                sendTeaLog: monitor.sendTeaLog,
            },
        }));
    };
    cryptoPresence() {
        const window = this.context.window;
        return {
            aesEncrypt: window.DTraitUcAesEncrypt ? 1 : 0,
            rsaEncrypt: window.DTraitUcRsaEncrypt ? 1 : 0,
            cryptoJSUtil: window.DTraitUcCryptoJSUtil ? 1 : 0,
        };
    }
    loadCore(version, aid) {
        if (this.loaded)
            return Promise.resolve(true);
        if (!this.loading)
            this.loading = new Promise((resolve, reject) => {
                this.loadWithRetry(version, aid)
                    .then(value => {
                    if (value)
                        this.loaded = true;
                    resolve(value);
                    this.loading = undefined;
                })
                    .catch(error => {
                    reject(error);
                    this.loading = undefined;
                });
            });
        return this.loading;
    }
    async loadWithRetry(version, aid) {
        if (this.context.localCore)
            return this.context.localCore.load(version, aid);
        const url = version && version.startsWith('http')
            ? version
            : `${aid === 6383 ? 'https://lf-douyin-pc-web.douyinstatic.com' : 'https://lf-ucenter-web.yhgfb-cn-static.com'}/obj/passport-fe/ucenter_fe/@byted/uc-secure-dtrait-core/${version}/dist/index.umd.production.js`;
        try {
            for (let remaining = 5;; remaining--) {
                try {
                    await this.loadScript(url);
                    return true;
                }
                catch (error) {
                    if (!remaining)
                        throw error;
                }
            }
        }
        catch (error) {
            this.context.monitor.sendSlardarLog({
                content: `[loadResource error]: ${error}`,
            });
            throw error;
        }
    }
    loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = this.context.document.createElement('script');
            script.type = 'text/javascript';
            script.src = url;
            this.context.document
                .getElementsByTagName('head')[0]
                .appendChild(script);
            if (script.readyState)
                script.onreadystatechange = () => {
                    if (script.readyState === 'complete' ||
                        script.readyState === 'loaded') {
                        script.onreadystatechange = null;
                        resolve(true);
                    }
                };
            else {
                script.onload = () => resolve(true);
                script.onerror = reject;
            }
        });
    }
}
exports.DesktopDTraitBootstrap = DesktopDTraitBootstrap;

},"desktop-dtrait-parameters":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesktopDTraitParameters = exports.DESKTOP_DTRAIT_PARAMETERS_KEY = void 0;
exports.DESKTOP_DTRAIT_PARAMETERS_KEY = 'dtrait-sdk/s_sdk_server_cert_key';
class DesktopDTraitParameters {
    context;
    pending;
    constructor(context) {
        this.context = context;
    }
    get = (aid, useCache = true) => {
        if (!this.pending)
            this.pending = new Promise((resolve, reject) => {
                this.readOrFetch(aid, useCache)
                    .then(resolve)
                    .catch(reject)
                    .finally(() => {
                    this.pending = undefined;
                });
            });
        return this.pending;
    };
    readOrFetch(aid, useCache) {
        try {
            if (useCache) {
                const cached = this.readCache();
                if (cached && !hasEmptyOwnField(cached))
                    return Promise.resolve({ ...cached, dataFrom: 'local' });
                try {
                    this.context.localStorage.removeItem(exports.DESKTOP_DTRAIT_PARAMETERS_KEY);
                }
                catch {
                }
            }
            return this.requestWithTimeout(aid)
                .then(async (response) => {
                const data = (response || {})['data'];
                if (hasEmptyOwnField(data))
                    throw new Error('get empty cert');
                const mapped = {
                    centralRsaPub: data?.['x-tt-session-dtrait-pk1'],
                    centralVersion: data?.['x-tt-session-dtrait-pk1-version'],
                    edgeRsaPub: data?.['x-tt-session-dtrait-pk2'],
                    edgeVersion: data?.['x-tt-session-dtrait-pk2-version'],
                    urlVersion: data?.['x-tt-session-dtrait-fe-url-version'],
                    dTraitVersion: data?.['x-tt-session-dtrait-version'],
                };
                try {
                    this.context.localStorage.setItem(exports.DESKTOP_DTRAIT_PARAMETERS_KEY, this.context.btoa(JSON.stringify({
                        ...mapped,
                        createdTime: this.context.Date.now(),
                    })));
                }
                catch {
                }
                return { ...mapped, dataFrom: 'remote' };
            })
                .catch(error => Promise.reject(error));
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
    readCache() {
        try {
            const text = this.context.localStorage.getItem(exports.DESKTOP_DTRAIT_PARAMETERS_KEY), now = this.context.Date.now();
            if (text && typeof text === 'string') {
                const { createdTime, ...cached } = JSON.parse(this.context.atob(text));
                if (createdTime + 86_400_000 > now)
                    return cached;
            }
        }
        catch {
            return null;
        }
        return undefined;
    }
    async requestWithTimeout(aid) {
        const timeout = new Promise((_resolve, reject) => {
            this.context.setTimeout(() => reject(new Error('get cert timeout')), 3000);
        });
        void timeout.catch(() => undefined);
        return Promise.race([timeout, this.request(aid)]);
    }
    request(aid) {
        if (!this.context.window.XMLHttpRequest || !this.context.window.FormData)
            return Promise.reject(new Error('not support XMLHttpRequest'));
        const xhr = new this.context.XMLHttpRequest();
        return new Promise((resolve, reject) => {
            xhr.open('POST', `/passport/ticket_guard/get_client_cert/?aid=${aid}&type=trait&sdk_version=1.0.23&is_from_ttaccountsdk=1`);
            xhr.onreadystatechange = () => {
                if (xhr.readyState !== 4 || !(xhr.status >= 200 && xhr.status < 300))
                    return;
                try {
                    const response = JSON.parse(xhr.response);
                    if (response.message !== 'success')
                        reject(new Error(response?.data?.description ||
                            response.message ||
                            'get cert error'));
                    resolve(response);
                }
                catch (error) {
                    reject(error);
                }
            };
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            xhr.setRequestHeader('Accept', 'application/json');
            const read = (name) => decodeURIComponent(this.context.document.cookie.replace(new RegExp('(?:(?:^|.*;)\\s*' +
                encodeURIComponent(name).replace(/[-.+*]/g, '\\$&') +
                '\\s*\\=\\s*([^;]*).*$)|^.*$'), '$1')) || null;
            xhr.setRequestHeader('x-tt-passport-csrf-token', read('passport_csrf_token') || read('passport_csrf_token_default') || '');
            xhr.send('server_data=1&need_session_dtrait=1');
        });
    }
}
exports.DesktopDTraitParameters = DesktopDTraitParameters;
function hasEmptyOwnField(value) {
    for (const key in value)
        if (value.hasOwnProperty(key) &&
            (value[key] === null || value[key] === undefined || value[key] === ''))
            return true;
    return false;
}

}};
const cache=Object.create(null);
function load(name){
  name=name.replace(/^\.\//,'').replace(/\.js$/,'');
  if(cache[name])return cache[name];
  const exports={};cache[name]=exports;
  if(!Object.prototype.hasOwnProperty.call(modules,name))throw Error('Unknown browser module: '+name);
  modules[name](exports,load);return exports;
}
const vendorFactories={
  rsa:function(module,exports){!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports.JSEncrypt=e():t.JSEncrypt=e()}(this,function(){return function(){var t={606:function(t){var e,r,i=t.exports={};function n(){throw new Error("setTimeout has not been defined")}function s(){throw new Error("clearTimeout has not been defined")}function o(t){if(e===setTimeout)return setTimeout(t,0);if((e===n||!e)&&setTimeout)return e=setTimeout,setTimeout(t,0);try{return e(t,0)}catch(r){try{return e.call(null,t,0)}catch(r){return e.call(this,t,0)}}}!function(){try{e="function"==typeof setTimeout?setTimeout:n}catch(t){e=n}try{r="function"==typeof clearTimeout?clearTimeout:s}catch(t){r=s}}();var h,a=[],u=!1,c=-1;function f(){u&&h&&(u=!1,h.length?a=h.concat(a):c=-1,a.length&&l())}function l(){if(!u){var t=o(f);u=!0;for(var e=a.length;e;){for(h=a,a=[];++c<e;)h&&h[c].run();c=-1,e=a.length}h=null,u=!1,function(t){if(r===clearTimeout)return clearTimeout(t);if((r===s||!r)&&clearTimeout)return r=clearTimeout,clearTimeout(t);try{return r(t)}catch(e){try{return r.call(null,t)}catch(e){return r.call(this,t)}}}(t)}}function p(t,e){this.fun=t,this.array=e}function g(){}i.nextTick=function(t){var e=new Array(arguments.length-1);if(arguments.length>1)for(var r=1;r<arguments.length;r++)e[r-1]=arguments[r];a.push(new p(t,e)),1!==a.length||u||o(l)},p.prototype.run=function(){this.fun.apply(null,this.array)},i.title="browser",i.browser=!0,i.env={},i.argv=[],i.version="",i.versions={},i.on=g,i.addListener=g,i.once=g,i.off=g,i.removeListener=g,i.removeAllListeners=g,i.emit=g,i.prependListener=g,i.prependOnceListener=g,i.listeners=function(t){return[]},i.binding=function(t){throw new Error("process.binding is not supported")},i.cwd=function(){return"/"},i.chdir=function(t){throw new Error("process.chdir is not supported")},i.umask=function(){return 0}}},e={};function r(i){var n=e[i];if(void 0!==n)return n.exports;var s=e[i]={exports:{}};return t[i](s,s.exports,r),s.exports}r.d=function(t,e){for(var i in e)r.o(e,i)&&!r.o(t,i)&&Object.defineProperty(t,i,{enumerable:!0,get:e[i]})},r.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)};var i={};return function(){"use strict";r.d(i,{default:function(){return Et}});function t(t){return"0123456789abcdefghijklmnopqrstuvwxyz".charAt(t)}function e(t,e){return t&e}function n(t,e){return t|e}function s(t,e){return t^e}function o(t,e){return t&~e}function h(t){if(0==t)return-1;var e=0;return 65535&t||(t>>=16,e+=16),255&t||(t>>=8,e+=8),15&t||(t>>=4,e+=4),3&t||(t>>=2,e+=2),1&t||++e,e}function a(t){for(var e=0;0!=t;)t&=t-1,++e;return e}var u,c="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";function f(t){var e,r,i="";for(e=0;e+3<=t.length;e+=3)r=parseInt(t.substring(e,e+3),16),i+=c.charAt(r>>6)+c.charAt(63&r);for(e+1==t.length?(r=parseInt(t.substring(e,e+1),16),i+=c.charAt(r<<2)):e+2==t.length&&(r=parseInt(t.substring(e,e+2),16),i+=c.charAt(r>>2)+c.charAt((3&r)<<4));(3&i.length)>0;)i+="=";return i}function l(e){var r,i="",n=0,s=0;for(r=0;r<e.length&&"="!=e.charAt(r);++r){var o=c.indexOf(e.charAt(r));o<0||(0==n?(i+=t(o>>2),s=3&o,n=1):1==n?(i+=t(s<<2|o>>4),s=15&o,n=2):2==n?(i+=t(s),i+=t(o>>2),s=3&o,n=3):(i+=t(s<<2|o>>4),i+=t(15&o),n=0))}return 1==n&&(i+=t(s<<2)),i}var p,g=function(t){var e;if(void 0===u){var r="0123456789ABCDEF",i=" \f\n\r\t \u2028\u2029";for(u={},e=0;e<16;++e)u[r.charAt(e)]=e;for(r=r.toLowerCase(),e=10;e<16;++e)u[r.charAt(e)]=e;for(e=0;e<8;++e)u[i.charAt(e)]=-1}var n=[],s=0,o=0;for(e=0;e<t.length;++e){var h=t.charAt(e);if("="==h)break;if(-1!=(h=u[h])){if(void 0===h)throw new Error("Illegal character at offset "+e);s|=h,++o>=2?(n[n.length]=s,s=0,o=0):s<<=4}}if(o)throw new Error("Hex encoding incomplete: 4 bits missing");return n},d={decode:function(t){var e;if(void 0===p){var r="= \f\n\r\t \u2028\u2029";for(p=Object.create(null),e=0;e<64;++e)p["ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt(e)]=e;for(p["-"]=62,p._=63,e=0;e<9;++e)p[r.charAt(e)]=-1}var i=[],n=0,s=0;for(e=0;e<t.length;++e){var o=t.charAt(e);if("="==o)break;if(-1!=(o=p[o])){if(void 0===o)throw new Error("Illegal character at offset "+e);n|=o,++s>=4?(i[i.length]=n>>16,i[i.length]=n>>8&255,i[i.length]=255&n,n=0,s=0):n<<=6}}switch(s){case 1:throw new Error("Base64 encoding incomplete: at least 2 bits missing");case 2:i[i.length]=n>>10;break;case 3:i[i.length]=n>>16,i[i.length]=n>>8&255}return i},re:/-----BEGIN [^-]+-----([A-Za-z0-9+\/=\s]+)-----END [^-]+-----|begin-base64[^\n]+\n([A-Za-z0-9+\/=\s]+)====/,unarmor:function(t){var e=d.re.exec(t);if(e)if(e[1])t=e[1];else{if(!e[2])throw new Error("RegExp out of sync");t=e[2]}return d.decode(t)}},v=1e13,y=function(){function t(t){this.buf=[+t||0]}return t.prototype.mulAdd=function(t,e){var r,i,n=this.buf,s=n.length;for(r=0;r<s;++r)(i=n[r]*t+e)<v?e=0:i-=(e=0|i/v)*v,n[r]=i;e>0&&(n[r]=e)},t.prototype.sub=function(t){var e,r,i=this.buf,n=i.length;for(e=0;e<n;++e)(r=i[e]-t)<0?(r+=v,t=1):t=0,i[e]=r;for(;0===i[i.length-1];)i.pop()},t.prototype.toString=function(t){if(10!=(t||10))throw new Error("only base 10 is supported");for(var e=this.buf,r=e[e.length-1].toString(),i=e.length-2;i>=0;--i)r+=(v+e[i]).toString().substring(1);return r},t.prototype.valueOf=function(){for(var t=this.buf,e=0,r=t.length-1;r>=0;--r)e=e*v+t[r];return e},t.prototype.simplify=function(){var t=this.buf;return 1==t.length?t[0]:this},t}(),m=/^(\d\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])([01]\d|2[0-3])(?:([0-5]\d)(?:([0-5]\d)(?:[.,](\d{1,3}))?)?)?(Z|[-+](?:[0]\d|1[0-2])([0-5]\d)?)?$/,b=/^(\d\d\d\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])([01]\d|2[0-3])(?:([0-5]\d)(?:([0-5]\d)(?:[.,](\d{1,3}))?)?)?(Z|[-+](?:[0]\d|1[0-2])([0-5]\d)?)?$/;function T(t,e){return t.length>e&&(t=t.substring(0,e)+"…"),t}var S,E=function(){function t(e,r){this.hexDigits="0123456789ABCDEF",e instanceof t?(this.enc=e.enc,this.pos=e.pos):(this.enc=e,this.pos=r)}return t.prototype.get=function(t){if(void 0===t&&(t=this.pos++),t>=this.enc.length)throw new Error("Requesting byte offset ".concat(t," on a stream of length ").concat(this.enc.length));return"string"==typeof this.enc?this.enc.charCodeAt(t):this.enc[t]},t.prototype.hexByte=function(t){return this.hexDigits.charAt(t>>4&15)+this.hexDigits.charAt(15&t)},t.prototype.hexDump=function(t,e,r){for(var i="",n=t;n<e;++n)if(i+=this.hexByte(this.get(n)),!0!==r)switch(15&n){case 7:i+="  ";break;case 15:i+="\n";break;default:i+=" "}return i},t.prototype.isASCII=function(t,e){for(var r=t;r<e;++r){var i=this.get(r);if(i<32||i>176)return!1}return!0},t.prototype.parseStringISO=function(t,e){for(var r="",i=t;i<e;++i)r+=String.fromCharCode(this.get(i));return r},t.prototype.parseStringUTF=function(t,e){for(var r="",i=t;i<e;){var n=this.get(i++);r+=n<128?String.fromCharCode(n):n>191&&n<224?String.fromCharCode((31&n)<<6|63&this.get(i++)):String.fromCharCode((15&n)<<12|(63&this.get(i++))<<6|63&this.get(i++))}return r},t.prototype.parseStringBMP=function(t,e){for(var r,i,n="",s=t;s<e;)r=this.get(s++),i=this.get(s++),n+=String.fromCharCode(r<<8|i);return n},t.prototype.parseTime=function(t,e,r){var i=this.parseStringISO(t,e),n=(r?m:b).exec(i);return n?(r&&(n[1]=+n[1],n[1]+=+n[1]<70?2e3:1900),i=n[1]+"-"+n[2]+"-"+n[3]+" "+n[4],n[5]&&(i+=":"+n[5],n[6]&&(i+=":"+n[6],n[7]&&(i+="."+n[7]))),n[8]&&(i+=" UTC","Z"!=n[8]&&(i+=n[8],n[9]&&(i+=":"+n[9]))),i):"Unrecognized time: "+i},t.prototype.parseInteger=function(t,e){for(var r,i=this.get(t),n=i>127,s=n?255:0,o="";i==s&&++t<e;)i=this.get(t);if(0===(r=e-t))return n?-1:0;if(r>4){for(o=i,r<<=3;!(128&(+o^s));)o=+o<<1,--r;o="("+r+" bit)\n"}n&&(i-=256);for(var h=new y(i),a=t+1;a<e;++a)h.mulAdd(256,this.get(a));return o+h.toString()},t.prototype.parseBitString=function(t,e,r){for(var i=this.get(t),n="("+((e-t-1<<3)-i)+" bit)\n",s="",o=t+1;o<e;++o){for(var h=this.get(o),a=o==e-1?i:0,u=7;u>=a;--u)s+=h>>u&1?"1":"0";if(s.length>r)return n+T(s,r)}return n+s},t.prototype.parseOctetString=function(t,e,r){if(this.isASCII(t,e))return T(this.parseStringISO(t,e),r);var i=e-t,n="("+i+" byte)\n";i>(r/=2)&&(e=t+r);for(var s=t;s<e;++s)n+=this.hexByte(this.get(s));return i>r&&(n+="…"),n},t.prototype.parseOID=function(t,e,r){for(var i="",n=new y,s=0,o=t;o<e;++o){var h=this.get(o);if(n.mulAdd(128,127&h),s+=7,!(128&h)){if(""===i)if((n=n.simplify())instanceof y)n.sub(80),i="2."+n.toString();else{var a=n<80?n<40?0:1:2;i=a+"."+(n-40*a)}else i+="."+n.toString();if(i.length>r)return T(i,r);n=new y,s=0}}return s>0&&(i+=".incomplete"),i},t}(),w=function(){function t(t,e,r,i,n){if(!(i instanceof D))throw new Error("Invalid tag value.");this.stream=t,this.header=e,this.length=r,this.tag=i,this.sub=n}return t.prototype.typeName=function(){switch(this.tag.tagClass){case 0:switch(this.tag.tagNumber){case 0:return"EOC";case 1:return"BOOLEAN";case 2:return"INTEGER";case 3:return"BIT_STRING";case 4:return"OCTET_STRING";case 5:return"NULL";case 6:return"OBJECT_IDENTIFIER";case 7:return"ObjectDescriptor";case 8:return"EXTERNAL";case 9:return"REAL";case 10:return"ENUMERATED";case 11:return"EMBEDDED_PDV";case 12:return"UTF8String";case 16:return"SEQUENCE";case 17:return"SET";case 18:return"NumericString";case 19:return"PrintableString";case 20:return"TeletexString";case 21:return"VideotexString";case 22:return"IA5String";case 23:return"UTCTime";case 24:return"GeneralizedTime";case 25:return"GraphicString";case 26:return"VisibleString";case 27:return"GeneralString";case 28:return"UniversalString";case 30:return"BMPString"}return"Universal_"+this.tag.tagNumber.toString();case 1:return"Application_"+this.tag.tagNumber.toString();case 2:return"["+this.tag.tagNumber.toString()+"]";case 3:return"Private_"+this.tag.tagNumber.toString()}},t.prototype.content=function(t){if(void 0===this.tag)return null;void 0===t&&(t=1/0);var e=this.posContent(),r=Math.abs(this.length);if(!this.tag.isUniversal())return null!==this.sub?"("+this.sub.length+" elem)":this.stream.parseOctetString(e,e+r,t);switch(this.tag.tagNumber){case 1:return 0===this.stream.get(e)?"false":"true";case 2:return this.stream.parseInteger(e,e+r);case 3:return this.sub?"("+this.sub.length+" elem)":this.stream.parseBitString(e,e+r,t);case 4:return this.sub?"("+this.sub.length+" elem)":this.stream.parseOctetString(e,e+r,t);case 6:return this.stream.parseOID(e,e+r,t);case 16:case 17:return null!==this.sub?"("+this.sub.length+" elem)":"(no elem)";case 12:return T(this.stream.parseStringUTF(e,e+r),t);case 18:case 19:case 20:case 21:case 22:case 26:return T(this.stream.parseStringISO(e,e+r),t);case 30:return T(this.stream.parseStringBMP(e,e+r),t);case 23:case 24:return this.stream.parseTime(e,e+r,23==this.tag.tagNumber)}return null},t.prototype.toString=function(){return this.typeName()+"@"+this.stream.pos+"[header:"+this.header+",length:"+this.length+",sub:"+(null===this.sub?"null":this.sub.length)+"]"},t.prototype.toPrettyString=function(t){void 0===t&&(t="");var e=t+this.typeName()+" @"+this.stream.pos;if(this.length>=0&&(e+="+"),e+=this.length,this.tag.tagConstructed?e+=" (constructed)":!this.tag.isUniversal()||3!=this.tag.tagNumber&&4!=this.tag.tagNumber||null===this.sub||(e+=" (encapsulates)"),e+="\n",null!==this.sub){t+="  ";for(var r=0,i=this.sub.length;r<i;++r)e+=this.sub[r].toPrettyString(t)}return e},t.prototype.posStart=function(){return this.stream.pos},t.prototype.posContent=function(){return this.stream.pos+this.header},t.prototype.posEnd=function(){return this.stream.pos+this.header+Math.abs(this.length)},t.prototype.toHexString=function(){return this.stream.hexDump(this.posStart(),this.posEnd(),!0)},t.decodeLength=function(t){var e=t.get(),r=127&e;if(r==e)return r;if(r>6)throw new Error("Length over 48 bits not supported at position "+(t.pos-1));if(0===r)return null;e=0;for(var i=0;i<r;++i)e=256*e+t.get();return e},t.prototype.getHexStringValue=function(){var t=this.toHexString(),e=2*this.header,r=2*this.length;return t.substring(e,e+r)},t.decode=function(e){var r;r=e instanceof E?e:new E(e,0);var i=new E(r),n=new D(r),s=t.decodeLength(r),o=r.pos,h=o-i.pos,a=null,u=function(){var e=[];if(null!==s){for(var i=o+s;r.pos<i;)e[e.length]=t.decode(r);if(r.pos!=i)throw new Error("Content size is not correct for container starting at offset "+o)}else try{for(;;){var n=t.decode(r);if(n.tag.isEOC())break;e[e.length]=n}s=o-r.pos}catch(t){throw new Error("Exception while decoding undefined length content: "+t)}return e};if(n.tagConstructed)a=u();else if(n.isUniversal()&&(3==n.tagNumber||4==n.tagNumber))try{if(3==n.tagNumber&&0!=r.get())throw new Error("BIT STRINGs with unused bits cannot encapsulate.");a=u();for(var c=0;c<a.length;++c)if(a[c].tag.isEOC())throw new Error("EOC is not supposed to be actual content.")}catch(t){a=null}if(null===a){if(null===s)throw new Error("We can't skip over an invalid tag with undefined length at offset "+o);r.pos=o+Math.abs(s)}return new t(i,h,s,n,a)},t}(),D=function(){function t(t){var e=t.get();if(this.tagClass=e>>6,this.tagConstructed=!!(32&e),this.tagNumber=31&e,31==this.tagNumber){var r=new y;do{e=t.get(),r.mulAdd(128,127&e)}while(128&e);this.tagNumber=r.simplify()}}return t.prototype.isUniversal=function(){return 0===this.tagClass},t.prototype.isEOC=function(){return 0===this.tagClass&&0===this.tagNumber},t}(),x=[2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131,137,139,149,151,157,163,167,173,179,181,191,193,197,199,211,223,227,229,233,239,241,251,257,263,269,271,277,281,283,293,307,311,313,317,331,337,347,349,353,359,367,373,379,383,389,397,401,409,419,421,431,433,439,443,449,457,461,463,467,479,487,491,499,503,509,521,523,541,547,557,563,569,571,577,587,593,599,601,607,613,617,619,631,641,643,647,653,659,661,673,677,683,691,701,709,719,727,733,739,743,751,757,761,769,773,787,797,809,811,821,823,827,829,839,853,857,859,863,877,881,883,887,907,911,919,929,937,941,947,953,967,971,977,983,991,997],R=(1<<26)/x[x.length-1],A=function(){function r(t,e,r){null!=t&&("number"==typeof t?this.fromNumber(t,e,r):null==e&&"string"!=typeof t?this.fromString(t,256):this.fromString(t,e))}return r.prototype.toString=function(e){if(this.s<0)return"-"+this.negate().toString(e);var r;if(16==e)r=4;else if(8==e)r=3;else if(2==e)r=1;else if(32==e)r=5;else{if(4!=e)return this.toRadix(e);r=2}var i,n=(1<<r)-1,s=!1,o="",h=this.t,a=this.DB-h*this.DB%r;if(h-- >0)for(a<this.DB&&(i=this[h]>>a)>0&&(s=!0,o=t(i));h>=0;)a<r?(i=(this[h]&(1<<a)-1)<<r-a,i|=this[--h]>>(a+=this.DB-r)):(i=this[h]>>(a-=r)&n,a<=0&&(a+=this.DB,--h)),i>0&&(s=!0),s&&(o+=t(i));return s?o:"0"},r.prototype.negate=function(){var t=N();return r.ZERO.subTo(this,t),t},r.prototype.abs=function(){return this.s<0?this.negate():this},r.prototype.compareTo=function(t){var e=this.s-t.s;if(0!=e)return e;var r=this.t;if(0!=(e=r-t.t))return this.s<0?-e:e;for(;--r>=0;)if(0!=(e=this[r]-t[r]))return e;return 0},r.prototype.bitLength=function(){return this.t<=0?0:this.DB*(this.t-1)+F(this[this.t-1]^this.s&this.DM)},r.prototype.mod=function(t){var e=N();return this.abs().divRemTo(t,null,e),this.s<0&&e.compareTo(r.ZERO)>0&&t.subTo(e,e),e},r.prototype.modPowInt=function(t,e){var r;return r=t<256||e.isEven()?new O(e):new V(e),this.exp(t,r)},r.prototype.clone=function(){var t=N();return this.copyTo(t),t},r.prototype.intValue=function(){if(this.s<0){if(1==this.t)return this[0]-this.DV;if(0==this.t)return-1}else{if(1==this.t)return this[0];if(0==this.t)return 0}return(this[1]&(1<<32-this.DB)-1)<<this.DB|this[0]},r.prototype.byteValue=function(){return 0==this.t?this.s:this[0]<<24>>24},r.prototype.shortValue=function(){return 0==this.t?this.s:this[0]<<16>>16},r.prototype.signum=function(){return this.s<0?-1:this.t<=0||1==this.t&&this[0]<=0?0:1},r.prototype.toByteArray=function(){var t=this.t,e=[];e[0]=this.s;var r,i=this.DB-t*this.DB%8,n=0;if(t-- >0)for(i<this.DB&&(r=this[t]>>i)!=(this.s&this.DM)>>i&&(e[n++]=r|this.s<<this.DB-i);t>=0;)i<8?(r=(this[t]&(1<<i)-1)<<8-i,r|=this[--t]>>(i+=this.DB-8)):(r=this[t]>>(i-=8)&255,i<=0&&(i+=this.DB,--t)),128&r&&(r|=-256),0==n&&(128&this.s)!=(128&r)&&++n,(n>0||r!=this.s)&&(e[n++]=r);return e},r.prototype.equals=function(t){return 0==this.compareTo(t)},r.prototype.min=function(t){return this.compareTo(t)<0?this:t},r.prototype.max=function(t){return this.compareTo(t)>0?this:t},r.prototype.and=function(t){var r=N();return this.bitwiseTo(t,e,r),r},r.prototype.or=function(t){var e=N();return this.bitwiseTo(t,n,e),e},r.prototype.xor=function(t){var e=N();return this.bitwiseTo(t,s,e),e},r.prototype.andNot=function(t){var e=N();return this.bitwiseTo(t,o,e),e},r.prototype.not=function(){for(var t=N(),e=0;e<this.t;++e)t[e]=this.DM&~this[e];return t.t=this.t,t.s=~this.s,t},r.prototype.shiftLeft=function(t){var e=N();return t<0?this.rShiftTo(-t,e):this.lShiftTo(t,e),e},r.prototype.shiftRight=function(t){var e=N();return t<0?this.lShiftTo(-t,e):this.rShiftTo(t,e),e},r.prototype.getLowestSetBit=function(){for(var t=0;t<this.t;++t)if(0!=this[t])return t*this.DB+h(this[t]);return this.s<0?this.t*this.DB:-1},r.prototype.bitCount=function(){for(var t=0,e=this.s&this.DM,r=0;r<this.t;++r)t+=a(this[r]^e);return t},r.prototype.testBit=function(t){var e=Math.floor(t/this.DB);return e>=this.t?0!=this.s:!!(this[e]&1<<t%this.DB)},r.prototype.setBit=function(t){return this.changeBit(t,n)},r.prototype.clearBit=function(t){return this.changeBit(t,o)},r.prototype.flipBit=function(t){return this.changeBit(t,s)},r.prototype.add=function(t){var e=N();return this.addTo(t,e),e},r.prototype.subtract=function(t){var e=N();return this.subTo(t,e),e},r.prototype.multiply=function(t){var e=N();return this.multiplyTo(t,e),e},r.prototype.divide=function(t){var e=N();return this.divRemTo(t,e,null),e},r.prototype.remainder=function(t){var e=N();return this.divRemTo(t,null,e),e},r.prototype.divideAndRemainder=function(t){var e=N(),r=N();return this.divRemTo(t,e,r),[e,r]},r.prototype.modPow=function(t,e){var r,i,n=t.bitLength(),s=H(1);if(n<=0)return s;r=n<18?1:n<48?3:n<144?4:n<768?5:6,i=n<8?new O(e):e.isEven()?new I(e):new V(e);var o=[],h=3,a=r-1,u=(1<<r)-1;if(o[1]=i.convert(this),r>1){var c=N();for(i.sqrTo(o[1],c);h<=u;)o[h]=N(),i.mulTo(c,o[h-2],o[h]),h+=2}var f,l,p=t.t-1,g=!0,d=N();for(n=F(t[p])-1;p>=0;){for(n>=a?f=t[p]>>n-a&u:(f=(t[p]&(1<<n+1)-1)<<a-n,p>0&&(f|=t[p-1]>>this.DB+n-a)),h=r;!(1&f);)f>>=1,--h;if((n-=h)<0&&(n+=this.DB,--p),g)o[f].copyTo(s),g=!1;else{for(;h>1;)i.sqrTo(s,d),i.sqrTo(d,s),h-=2;h>0?i.sqrTo(s,d):(l=s,s=d,d=l),i.mulTo(d,o[f],s)}for(;p>=0&&!(t[p]&1<<n);)i.sqrTo(s,d),l=s,s=d,d=l,--n<0&&(n=this.DB-1,--p)}return i.revert(s)},r.prototype.modInverse=function(t){var e=t.isEven();if(this.isEven()&&e||0==t.signum())return r.ZERO;for(var i=t.clone(),n=this.clone(),s=H(1),o=H(0),h=H(0),a=H(1);0!=i.signum();){for(;i.isEven();)i.rShiftTo(1,i),e?(s.isEven()&&o.isEven()||(s.addTo(this,s),o.subTo(t,o)),s.rShiftTo(1,s)):o.isEven()||o.subTo(t,o),o.rShiftTo(1,o);for(;n.isEven();)n.rShiftTo(1,n),e?(h.isEven()&&a.isEven()||(h.addTo(this,h),a.subTo(t,a)),h.rShiftTo(1,h)):a.isEven()||a.subTo(t,a),a.rShiftTo(1,a);i.compareTo(n)>=0?(i.subTo(n,i),e&&s.subTo(h,s),o.subTo(a,o)):(n.subTo(i,n),e&&h.subTo(s,h),a.subTo(o,a))}return 0!=n.compareTo(r.ONE)?r.ZERO:a.compareTo(t)>=0?a.subtract(t):a.signum()<0?(a.addTo(t,a),a.signum()<0?a.add(t):a):a},r.prototype.pow=function(t){return this.exp(t,new B)},r.prototype.gcd=function(t){var e=this.s<0?this.negate():this.clone(),r=t.s<0?t.negate():t.clone();if(e.compareTo(r)<0){var i=e;e=r,r=i}var n=e.getLowestSetBit(),s=r.getLowestSetBit();if(s<0)return e;for(n<s&&(s=n),s>0&&(e.rShiftTo(s,e),r.rShiftTo(s,r));e.signum()>0;)(n=e.getLowestSetBit())>0&&e.rShiftTo(n,e),(n=r.getLowestSetBit())>0&&r.rShiftTo(n,r),e.compareTo(r)>=0?(e.subTo(r,e),e.rShiftTo(1,e)):(r.subTo(e,r),r.rShiftTo(1,r));return s>0&&r.lShiftTo(s,r),r},r.prototype.isProbablePrime=function(t){var e,r=this.abs();if(1==r.t&&r[0]<=x[x.length-1]){for(e=0;e<x.length;++e)if(r[0]==x[e])return!0;return!1}if(r.isEven())return!1;for(e=1;e<x.length;){for(var i=x[e],n=e+1;n<x.length&&i<R;)i*=x[n++];for(i=r.modInt(i);e<n;)if(i%x[e++]==0)return!1}return r.millerRabin(t)},r.prototype.copyTo=function(t){for(var e=this.t-1;e>=0;--e)t[e]=this[e];t.t=this.t,t.s=this.s},r.prototype.fromInt=function(t){this.t=1,this.s=t<0?-1:0,t>0?this[0]=t:t<-1?this[0]=t+this.DV:this.t=0},r.prototype.fromString=function(t,e){var i;if(16==e)i=4;else if(8==e)i=3;else if(256==e)i=8;else if(2==e)i=1;else if(32==e)i=5;else{if(4!=e)return void this.fromRadix(t,e);i=2}this.t=0,this.s=0;for(var n=t.length,s=!1,o=0;--n>=0;){var h=8==i?255&+t[n]:C(t,n);h<0?"-"==t.charAt(n)&&(s=!0):(s=!1,0==o?this[this.t++]=h:o+i>this.DB?(this[this.t-1]|=(h&(1<<this.DB-o)-1)<<o,this[this.t++]=h>>this.DB-o):this[this.t-1]|=h<<o,(o+=i)>=this.DB&&(o-=this.DB))}8==i&&128&+t[0]&&(this.s=-1,o>0&&(this[this.t-1]|=(1<<this.DB-o)-1<<o)),this.clamp(),s&&r.ZERO.subTo(this,this)},r.prototype.clamp=function(){for(var t=this.s&this.DM;this.t>0&&this[this.t-1]==t;)--this.t},r.prototype.dlShiftTo=function(t,e){var r;for(r=this.t-1;r>=0;--r)e[r+t]=this[r];for(r=t-1;r>=0;--r)e[r]=0;e.t=this.t+t,e.s=this.s},r.prototype.drShiftTo=function(t,e){for(var r=t;r<this.t;++r)e[r-t]=this[r];e.t=Math.max(this.t-t,0),e.s=this.s},r.prototype.lShiftTo=function(t,e){for(var r=t%this.DB,i=this.DB-r,n=(1<<i)-1,s=Math.floor(t/this.DB),o=this.s<<r&this.DM,h=this.t-1;h>=0;--h)e[h+s+1]=this[h]>>i|o,o=(this[h]&n)<<r;for(h=s-1;h>=0;--h)e[h]=0;e[s]=o,e.t=this.t+s+1,e.s=this.s,e.clamp()},r.prototype.rShiftTo=function(t,e){e.s=this.s;var r=Math.floor(t/this.DB);if(r>=this.t)e.t=0;else{var i=t%this.DB,n=this.DB-i,s=(1<<i)-1;e[0]=this[r]>>i;for(var o=r+1;o<this.t;++o)e[o-r-1]|=(this[o]&s)<<n,e[o-r]=this[o]>>i;i>0&&(e[this.t-r-1]|=(this.s&s)<<n),e.t=this.t-r,e.clamp()}},r.prototype.subTo=function(t,e){for(var r=0,i=0,n=Math.min(t.t,this.t);r<n;)i+=this[r]-t[r],e[r++]=i&this.DM,i>>=this.DB;if(t.t<this.t){for(i-=t.s;r<this.t;)i+=this[r],e[r++]=i&this.DM,i>>=this.DB;i+=this.s}else{for(i+=this.s;r<t.t;)i-=t[r],e[r++]=i&this.DM,i>>=this.DB;i-=t.s}e.s=i<0?-1:0,i<-1?e[r++]=this.DV+i:i>0&&(e[r++]=i),e.t=r,e.clamp()},r.prototype.multiplyTo=function(t,e){var i=this.abs(),n=t.abs(),s=i.t;for(e.t=s+n.t;--s>=0;)e[s]=0;for(s=0;s<n.t;++s)e[s+i.t]=i.am(0,n[s],e,s,0,i.t);e.s=0,e.clamp(),this.s!=t.s&&r.ZERO.subTo(e,e)},r.prototype.squareTo=function(t){for(var e=this.abs(),r=t.t=2*e.t;--r>=0;)t[r]=0;for(r=0;r<e.t-1;++r){var i=e.am(r,e[r],t,2*r,0,1);(t[r+e.t]+=e.am(r+1,2*e[r],t,2*r+1,i,e.t-r-1))>=e.DV&&(t[r+e.t]-=e.DV,t[r+e.t+1]=1)}t.t>0&&(t[t.t-1]+=e.am(r,e[r],t,2*r,0,1)),t.s=0,t.clamp()},r.prototype.divRemTo=function(t,e,i){var n=t.abs();if(!(n.t<=0)){var s=this.abs();if(s.t<n.t)return null!=e&&e.fromInt(0),void(null!=i&&this.copyTo(i));null==i&&(i=N());var o=N(),h=this.s,a=t.s,u=this.DB-F(n[n.t-1]);u>0?(n.lShiftTo(u,o),s.lShiftTo(u,i)):(n.copyTo(o),s.copyTo(i));var c=o.t,f=o[c-1];if(0!=f){var l=f*(1<<this.F1)+(c>1?o[c-2]>>this.F2:0),p=this.FV/l,g=(1<<this.F1)/l,d=1<<this.F2,v=i.t,y=v-c,m=null==e?N():e;for(o.dlShiftTo(y,m),i.compareTo(m)>=0&&(i[i.t++]=1,i.subTo(m,i)),r.ONE.dlShiftTo(c,m),m.subTo(o,o);o.t<c;)o[o.t++]=0;for(;--y>=0;){var b=i[--v]==f?this.DM:Math.floor(i[v]*p+(i[v-1]+d)*g);if((i[v]+=o.am(0,b,i,y,0,c))<b)for(o.dlShiftTo(y,m),i.subTo(m,i);i[v]<--b;)i.subTo(m,i)}null!=e&&(i.drShiftTo(c,e),h!=a&&r.ZERO.subTo(e,e)),i.t=c,i.clamp(),u>0&&i.rShiftTo(u,i),h<0&&r.ZERO.subTo(i,i)}}},r.prototype.invDigit=function(){if(this.t<1)return 0;var t=this[0];if(!(1&t))return 0;var e=3&t;return(e=(e=(e=(e=e*(2-(15&t)*e)&15)*(2-(255&t)*e)&255)*(2-((65535&t)*e&65535))&65535)*(2-t*e%this.DV)%this.DV)>0?this.DV-e:-e},r.prototype.isEven=function(){return 0==(this.t>0?1&this[0]:this.s)},r.prototype.exp=function(t,e){if(t>4294967295||t<1)return r.ONE;var i=N(),n=N(),s=e.convert(this),o=F(t)-1;for(s.copyTo(i);--o>=0;)if(e.sqrTo(i,n),(t&1<<o)>0)e.mulTo(n,s,i);else{var h=i;i=n,n=h}return e.revert(i)},r.prototype.chunkSize=function(t){return Math.floor(Math.LN2*this.DB/Math.log(t))},r.prototype.toRadix=function(t){if(null==t&&(t=10),0==this.signum()||t<2||t>36)return"0";var e=this.chunkSize(t),r=Math.pow(t,e),i=H(r),n=N(),s=N(),o="";for(this.divRemTo(i,n,s);n.signum()>0;)o=(r+s.intValue()).toString(t).substring(1)+o,n.divRemTo(i,n,s);return s.intValue().toString(t)+o},r.prototype.fromRadix=function(t,e){this.fromInt(0),null==e&&(e=10);for(var i=this.chunkSize(e),n=Math.pow(e,i),s=!1,o=0,h=0,a=0;a<t.length;++a){var u=C(t,a);u<0?"-"==t.charAt(a)&&0==this.signum()&&(s=!0):(h=e*h+u,++o>=i&&(this.dMultiply(n),this.dAddOffset(h,0),o=0,h=0))}o>0&&(this.dMultiply(Math.pow(e,o)),this.dAddOffset(h,0)),s&&r.ZERO.subTo(this,this)},r.prototype.fromNumber=function(t,e,i){if("number"==typeof e)if(t<2)this.fromInt(1);else for(this.fromNumber(t,i),this.testBit(t-1)||this.bitwiseTo(r.ONE.shiftLeft(t-1),n,this),this.isEven()&&this.dAddOffset(1,0);!this.isProbablePrime(e);)this.dAddOffset(2,0),this.bitLength()>t&&this.subTo(r.ONE.shiftLeft(t-1),this);else{var s=[],o=7&t;s.length=1+(t>>3),e.nextBytes(s),o>0?s[0]&=(1<<o)-1:s[0]=0,this.fromString(s,256)}},r.prototype.bitwiseTo=function(t,e,r){var i,n,s=Math.min(t.t,this.t);for(i=0;i<s;++i)r[i]=e(this[i],t[i]);if(t.t<this.t){for(n=t.s&this.DM,i=s;i<this.t;++i)r[i]=e(this[i],n);r.t=this.t}else{for(n=this.s&this.DM,i=s;i<t.t;++i)r[i]=e(n,t[i]);r.t=t.t}r.s=e(this.s,t.s),r.clamp()},r.prototype.changeBit=function(t,e){var i=r.ONE.shiftLeft(t);return this.bitwiseTo(i,e,i),i},r.prototype.addTo=function(t,e){for(var r=0,i=0,n=Math.min(t.t,this.t);r<n;)i+=this[r]+t[r],e[r++]=i&this.DM,i>>=this.DB;if(t.t<this.t){for(i+=t.s;r<this.t;)i+=this[r],e[r++]=i&this.DM,i>>=this.DB;i+=this.s}else{for(i+=this.s;r<t.t;)i+=t[r],e[r++]=i&this.DM,i>>=this.DB;i+=t.s}e.s=i<0?-1:0,i>0?e[r++]=i:i<-1&&(e[r++]=this.DV+i),e.t=r,e.clamp()},r.prototype.dMultiply=function(t){this[this.t]=this.am(0,t-1,this,0,0,this.t),++this.t,this.clamp()},r.prototype.dAddOffset=function(t,e){if(0!=t){for(;this.t<=e;)this[this.t++]=0;for(this[e]+=t;this[e]>=this.DV;)this[e]-=this.DV,++e>=this.t&&(this[this.t++]=0),++this[e]}},r.prototype.multiplyLowerTo=function(t,e,r){var i=Math.min(this.t+t.t,e);for(r.s=0,r.t=i;i>0;)r[--i]=0;for(var n=r.t-this.t;i<n;++i)r[i+this.t]=this.am(0,t[i],r,i,0,this.t);for(n=Math.min(t.t,e);i<n;++i)this.am(0,t[i],r,i,0,e-i);r.clamp()},r.prototype.multiplyUpperTo=function(t,e,r){--e;var i=r.t=this.t+t.t-e;for(r.s=0;--i>=0;)r[i]=0;for(i=Math.max(e-this.t,0);i<t.t;++i)r[this.t+i-e]=this.am(e-i,t[i],r,0,0,this.t+i-e);r.clamp(),r.drShiftTo(1,r)},r.prototype.modInt=function(t){if(t<=0)return 0;var e=this.DV%t,r=this.s<0?t-1:0;if(this.t>0)if(0==e)r=this[0]%t;else for(var i=this.t-1;i>=0;--i)r=(e*r+this[i])%t;return r},r.prototype.millerRabin=function(t){var e=this.subtract(r.ONE),i=e.getLowestSetBit();if(i<=0)return!1;var n=e.shiftRight(i);(t=t+1>>1)>x.length&&(t=x.length);for(var s=N(),o=0;o<t;++o){s.fromInt(x[Math.floor(Math.random()*x.length)]);var h=s.modPow(n,this);if(0!=h.compareTo(r.ONE)&&0!=h.compareTo(e)){for(var a=1;a++<i&&0!=h.compareTo(e);)if(0==(h=h.modPowInt(2,this)).compareTo(r.ONE))return!1;if(0!=h.compareTo(e))return!1}}return!0},r.prototype.square=function(){var t=N();return this.squareTo(t),t},r.prototype.gcda=function(t,e){var r=this.s<0?this.negate():this.clone(),i=t.s<0?t.negate():t.clone();if(r.compareTo(i)<0){var n=r;r=i,i=n}var s=r.getLowestSetBit(),o=i.getLowestSetBit();if(o<0)e(r);else{s<o&&(o=s),o>0&&(r.rShiftTo(o,r),i.rShiftTo(o,i));var h=function(){(s=r.getLowestSetBit())>0&&r.rShiftTo(s,r),(s=i.getLowestSetBit())>0&&i.rShiftTo(s,i),r.compareTo(i)>=0?(r.subTo(i,r),r.rShiftTo(1,r)):(i.subTo(r,i),i.rShiftTo(1,i)),r.signum()>0?setTimeout(h,0):(o>0&&i.lShiftTo(o,i),setTimeout(function(){e(i)},0))};setTimeout(h,10)}},r.prototype.fromNumberAsync=function(t,e,i,s){if("number"==typeof e)if(t<2)this.fromInt(1);else{this.fromNumber(t,i),this.testBit(t-1)||this.bitwiseTo(r.ONE.shiftLeft(t-1),n,this),this.isEven()&&this.dAddOffset(1,0);var o=this,h=function(){o.dAddOffset(2,0),o.bitLength()>t&&o.subTo(r.ONE.shiftLeft(t-1),o),o.isProbablePrime(e)?setTimeout(function(){s()},0):setTimeout(h,0)};setTimeout(h,0)}else{var a=[],u=7&t;a.length=1+(t>>3),e.nextBytes(a),u>0?a[0]&=(1<<u)-1:a[0]=0,this.fromString(a,256)}},r}(),B=function(){function t(){}return t.prototype.convert=function(t){return t},t.prototype.revert=function(t){return t},t.prototype.mulTo=function(t,e,r){t.multiplyTo(e,r)},t.prototype.sqrTo=function(t,e){t.squareTo(e)},t}(),O=function(){function t(t){this.m=t}return t.prototype.convert=function(t){return t.s<0||t.compareTo(this.m)>=0?t.mod(this.m):t},t.prototype.revert=function(t){return t},t.prototype.reduce=function(t){t.divRemTo(this.m,null,t)},t.prototype.mulTo=function(t,e,r){t.multiplyTo(e,r),this.reduce(r)},t.prototype.sqrTo=function(t,e){t.squareTo(e),this.reduce(e)},t}(),V=function(){function t(t){this.m=t,this.mp=t.invDigit(),this.mpl=32767&this.mp,this.mph=this.mp>>15,this.um=(1<<t.DB-15)-1,this.mt2=2*t.t}return t.prototype.convert=function(t){var e=N();return t.abs().dlShiftTo(this.m.t,e),e.divRemTo(this.m,null,e),t.s<0&&e.compareTo(A.ZERO)>0&&this.m.subTo(e,e),e},t.prototype.revert=function(t){var e=N();return t.copyTo(e),this.reduce(e),e},t.prototype.reduce=function(t){for(;t.t<=this.mt2;)t[t.t++]=0;for(var e=0;e<this.m.t;++e){var r=32767&t[e],i=r*this.mpl+((r*this.mph+(t[e]>>15)*this.mpl&this.um)<<15)&t.DM;for(t[r=e+this.m.t]+=this.m.am(0,i,t,e,0,this.m.t);t[r]>=t.DV;)t[r]-=t.DV,t[++r]++}t.clamp(),t.drShiftTo(this.m.t,t),t.compareTo(this.m)>=0&&t.subTo(this.m,t)},t.prototype.mulTo=function(t,e,r){t.multiplyTo(e,r),this.reduce(r)},t.prototype.sqrTo=function(t,e){t.squareTo(e),this.reduce(e)},t}(),I=function(){function t(t){this.m=t,this.r2=N(),this.q3=N(),A.ONE.dlShiftTo(2*t.t,this.r2),this.mu=this.r2.divide(t)}return t.prototype.convert=function(t){if(t.s<0||t.t>2*this.m.t)return t.mod(this.m);if(t.compareTo(this.m)<0)return t;var e=N();return t.copyTo(e),this.reduce(e),e},t.prototype.revert=function(t){return t},t.prototype.reduce=function(t){for(t.drShiftTo(this.m.t-1,this.r2),t.t>this.m.t+1&&(t.t=this.m.t+1,t.clamp()),this.mu.multiplyUpperTo(this.r2,this.m.t+1,this.q3),this.m.multiplyLowerTo(this.q3,this.m.t+1,this.r2);t.compareTo(this.r2)<0;)t.dAddOffset(1,this.m.t+1);for(t.subTo(this.r2,t);t.compareTo(this.m)>=0;)t.subTo(this.m,t)},t.prototype.mulTo=function(t,e,r){t.multiplyTo(e,r),this.reduce(r)},t.prototype.sqrTo=function(t,e){t.squareTo(e),this.reduce(e)},t}();function N(){return new A(null)}function P(t,e){return new A(t,e)}var M="undefined"!=typeof navigator;M&&"Microsoft Internet Explorer"==navigator.appName?(A.prototype.am=function(t,e,r,i,n,s){for(var o=32767&e,h=e>>15;--s>=0;){var a=32767&this[t],u=this[t++]>>15,c=h*a+u*o;n=((a=o*a+((32767&c)<<15)+r[i]+(1073741823&n))>>>30)+(c>>>15)+h*u+(n>>>30),r[i++]=1073741823&a}return n},S=30):M&&"Netscape"!=navigator.appName?(A.prototype.am=function(t,e,r,i,n,s){for(;--s>=0;){var o=e*this[t++]+r[i]+n;n=Math.floor(o/67108864),r[i++]=67108863&o}return n},S=26):(A.prototype.am=function(t,e,r,i,n,s){for(var o=16383&e,h=e>>14;--s>=0;){var a=16383&this[t],u=this[t++]>>14,c=h*a+u*o;n=((a=o*a+((16383&c)<<14)+r[i]+n)>>28)+(c>>14)+h*u,r[i++]=268435455&a}return n},S=28),A.prototype.DB=S,A.prototype.DM=(1<<S)-1,A.prototype.DV=1<<S;A.prototype.FV=Math.pow(2,52),A.prototype.F1=52-S,A.prototype.F2=2*S-52;var L,j,q=[];for(L="0".charCodeAt(0),j=0;j<=9;++j)q[L++]=j;for(L="a".charCodeAt(0),j=10;j<36;++j)q[L++]=j;for(L="A".charCodeAt(0),j=10;j<36;++j)q[L++]=j;function C(t,e){var r=q[t.charCodeAt(e)];return null==r?-1:r}function H(t){var e=N();return e.fromInt(t),e}function F(t){var e,r=1;return 0!=(e=t>>>16)&&(t=e,r+=16),0!=(e=t>>8)&&(t=e,r+=8),0!=(e=t>>4)&&(t=e,r+=4),0!=(e=t>>2)&&(t=e,r+=2),0!=(e=t>>1)&&(t=e,r+=1),r}A.ZERO=H(0),A.ONE=H(1);var K=function(){function t(){this.i=0,this.j=0,this.S=[]}return t.prototype.init=function(t){var e,r,i;for(e=0;e<256;++e)this.S[e]=e;for(r=0,e=0;e<256;++e)r=r+this.S[e]+t[e%t.length]&255,i=this.S[e],this.S[e]=this.S[r],this.S[r]=i;this.i=0,this.j=0},t.prototype.next=function(){var t;return this.i=this.i+1&255,this.j=this.j+this.S[this.i]&255,t=this.S[this.i],this.S[this.i]=this.S[this.j],this.S[this.j]=t,this.S[t+this.S[this.i]&255]},t}();var U,k,_=null;if(null==_){_=[],k=0;var z=void 0;if("undefined"!=typeof window&&self.crypto&&self.crypto.getRandomValues){var Z=new Uint32Array(256);for(self.crypto.getRandomValues(Z),z=0;z<Z.length;++z)_[k++]=255&Z[z]}var G=0,$=function(t){if((G=G||0)>=256||k>=256)self.removeEventListener?self.removeEventListener("mousemove",$,!1):self.detachEvent&&self.detachEvent("onmousemove",$);else try{var e=t.x+t.y;_[k++]=255&e,G+=1}catch(t){}};"undefined"!=typeof window&&(self.addEventListener?self.addEventListener("mousemove",$,!1):self.attachEvent&&self.attachEvent("onmousemove",$))}function Y(){if(null==U){for(U=new K;k<256;){var t=Math.floor(65536*Math.random());_[k++]=255&t}for(U.init(_),k=0;k<_.length;++k)_[k]=0;k=0}return U.next()}var J=function(){function t(){}return t.prototype.nextBytes=function(t){for(var e=0;e<t.length;++e)t[e]=Y()},t}();function X(t){return function(t){for(var e="",r=0;r<32*t.length;r+=8)e+=String.fromCharCode(t[r>>5]>>>24-r%32&255);return e}(function(t,e){var r,i,n,s,o,h,a,u,c,f,l,p,g=new Array(1779033703,-1150833019,1013904242,-1521486534,1359893119,-1694144372,528734635,1541459225),d=new Array(64);for(t[e>>5]|=128<<24-e%32,t[15+(e+64>>9<<4)]=e,c=0;c<t.length;c+=16){for(r=g[0],i=g[1],n=g[2],s=g[3],o=g[4],h=g[5],a=g[6],u=g[7],f=0;f<64;f++)d[f]=f<16?t[f+c]:at(at(at(ot(d[f-2]),d[f-7]),st(d[f-15])),d[f-16]),l=at(at(at(at(u,nt(o)),et(o,h,a)),ht[f]),d[f]),p=at(it(r),rt(r,i,n)),u=a,a=h,h=o,o=at(s,l),s=n,n=i,i=r,r=at(l,p);g[0]=at(r,g[0]),g[1]=at(i,g[1]),g[2]=at(n,g[2]),g[3]=at(s,g[3]),g[4]=at(o,g[4]),g[5]=at(h,g[5]),g[6]=at(a,g[6]),g[7]=at(u,g[7])}return g}(function(t){for(var e=Array(t.length>>2),r=0;r<e.length;r++)e[r]=0;for(r=0;r<8*t.length;r+=8)e[r>>5]|=(255&t.charCodeAt(r/8))<<24-r%32;return e}(t),8*t.length))}function Q(t){for(var e="0123456789abcdef",r="",i=0;i<t.length;i++){var n=t.charCodeAt(i);r+=e.charAt(n>>>4&15)+e.charAt(15&n)}return r}function W(t,e){return t>>>e|t<<32-e}function tt(t,e){return t>>>e}function et(t,e,r){return t&e^~t&r}function rt(t,e,r){return t&e^t&r^e&r}function it(t){return W(t,2)^W(t,13)^W(t,22)}function nt(t){return W(t,6)^W(t,11)^W(t,25)}function st(t){return W(t,7)^W(t,18)^tt(t,3)}function ot(t){return W(t,17)^W(t,19)^tt(t,10)}var ht=new Array(1116352408,1899447441,-1245643825,-373957723,961987163,1508970993,-1841331548,-1424204075,-670586216,310598401,607225278,1426881987,1925078388,-2132889090,-1680079193,-1046744716,-459576895,-272742522,264347078,604807628,770255983,1249150122,1555081692,1996064986,-1740746414,-1473132947,-1341970488,-1084653625,-958395405,-710438585,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,-2117940946,-1838011259,-1564481375,-1474664885,-1035236496,-949202525,-778901479,-694614492,-200395387,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,-2067236844,-1933114872,-1866530822,-1538233109,-1090935817,-965641998);function at(t,e){var r=(65535&t)+(65535&e);return(t>>16)+(e>>16)+(r>>16)<<16|65535&r}function ut(t,e){if(e<t.length+11)return console.error("Message too long for RSA"),null;for(var r=[],i=t.length-1;i>=0&&e>0;){var n=t.charCodeAt(i--);n<128?r[--e]=n:n>127&&n<2048?(r[--e]=63&n|128,r[--e]=n>>6|192):(r[--e]=63&n|128,r[--e]=n>>6&63|128,r[--e]=n>>12|224)}r[--e]=0;for(var s=new J,o=[];e>2;){for(o[0]=0;0==o[0];)s.nextBytes(o);r[--e]=o[0]}return r[--e]=2,r[--e]=0,new A(r)}function ct(t,e,r){for(var i="",n=0;i.length<e;)i+=r(String.fromCharCode.apply(String,t.concat([(4278190080&n)>>24,(16711680&n)>>16,(65280&n)>>8,255&n]))),n+=1;return i}function ft(t,e){var r=X;if(t.length+64+2>e)throw"Message too long for RSA";var i,n="";for(i=0;i<e-t.length-64-2;i+=1)n+="\0";var s=r("")+n+""+t,o=new Array(32);(new J).nextBytes(o);var h=ct(o,s.length,r),a=[];for(i=0;i<s.length;i+=1)a[i]=s.charCodeAt(i)^h.charCodeAt(i);var u=ct(a,o.length,r),c=[0];for(i=0;i<o.length;i+=1)c[i+1]=o[i]^u.charCodeAt(i);return new A(c.concat(a))}var lt=function(){function t(){this.n=null,this.e=0,this.d=null,this.p=null,this.q=null,this.dmp1=null,this.dmq1=null,this.coeff=null}return t.prototype.doPublic=function(t){return t.modPowInt(this.e,this.n)},t.prototype.doPrivate=function(t){if(null==this.p||null==this.q)return t.modPow(this.d,this.n);for(var e=t.mod(this.p).modPow(this.dmp1,this.p),r=t.mod(this.q).modPow(this.dmq1,this.q);e.compareTo(r)<0;)e=e.add(this.p);return e.subtract(r).multiply(this.coeff).mod(this.p).multiply(this.q).add(r)},t.prototype.setPublic=function(t,e){null!=t&&null!=e&&t.length>0&&e.length>0?(this.n=P(t,16),this.e=parseInt(e,16)):console.error("Invalid RSA public key")},t.prototype.encrypt=function(t,e){void 0===e&&(e=ut);var r=this.n.bitLength()+7>>3,i=e(t,r);if(null==i)return null;var n=this.doPublic(i);if(null==n)return null;for(var s=n.toString(16),o=s.length,h=0;h<2*r-o;h++)s="0"+s;return s},t.prototype.setPrivate=function(t,e,r){null!=t&&null!=e&&t.length>0&&e.length>0?(this.n=P(t,16),this.e=parseInt(e,16),this.d=P(r,16)):console.error("Invalid RSA private key")},t.prototype.setPrivateEx=function(t,e,r,i,n,s,o,h){null!=t&&null!=e&&t.length>0&&e.length>0?(this.n=P(t,16),this.e=parseInt(e,16),this.d=P(r,16),this.p=P(i,16),this.q=P(n,16),this.dmp1=P(s,16),this.dmq1=P(o,16),this.coeff=P(h,16)):console.error("Invalid RSA private key")},t.prototype.generate=function(t,e){var r=new J,i=t>>1;this.e=parseInt(e,16);for(var n=new A(e,16);;){for(;this.p=new A(t-i,1,r),0!=this.p.subtract(A.ONE).gcd(n).compareTo(A.ONE)||!this.p.isProbablePrime(10););for(;this.q=new A(i,1,r),0!=this.q.subtract(A.ONE).gcd(n).compareTo(A.ONE)||!this.q.isProbablePrime(10););if(this.p.compareTo(this.q)<=0){var s=this.p;this.p=this.q,this.q=s}var o=this.p.subtract(A.ONE),h=this.q.subtract(A.ONE),a=o.multiply(h);if(0==a.gcd(n).compareTo(A.ONE)){this.n=this.p.multiply(this.q),this.d=n.modInverse(a),this.dmp1=this.d.mod(o),this.dmq1=this.d.mod(h),this.coeff=this.q.modInverse(this.p);break}}},t.prototype.decrypt=function(t){var e=P(t,16),r=this.doPrivate(e);return null==r?null:function(t,e){var r=t.toByteArray(),i=0;for(;i<r.length&&0==r[i];)++i;if(r.length-i!=e-1||2!=r[i])return null;++i;for(;0!=r[i];)if(++i>=r.length)return null;var n="";for(;++i<r.length;){var s=255&r[i];s<128?n+=String.fromCharCode(s):s>191&&s<224?(n+=String.fromCharCode((31&s)<<6|63&r[i+1]),++i):(n+=String.fromCharCode((15&s)<<12|(63&r[i+1])<<6|63&r[i+2]),i+=2)}return n}(r,this.n.bitLength()+7>>3)},t.prototype.generateAsync=function(t,e,r){var i=new J,n=t>>1;this.e=parseInt(e,16);var s=new A(e,16),o=this,h=function(){var e=function(){if(o.p.compareTo(o.q)<=0){var t=o.p;o.p=o.q,o.q=t}var e=o.p.subtract(A.ONE),i=o.q.subtract(A.ONE),n=e.multiply(i);0==n.gcd(s).compareTo(A.ONE)?(o.n=o.p.multiply(o.q),o.d=s.modInverse(n),o.dmp1=o.d.mod(e),o.dmq1=o.d.mod(i),o.coeff=o.q.modInverse(o.p),setTimeout(function(){r()},0)):setTimeout(h,0)},a=function(){o.q=N(),o.q.fromNumberAsync(n,1,i,function(){o.q.subtract(A.ONE).gcda(s,function(t){0==t.compareTo(A.ONE)&&o.q.isProbablePrime(10)?setTimeout(e,0):setTimeout(a,0)})})},u=function(){o.p=N(),o.p.fromNumberAsync(t-n,1,i,function(){o.p.subtract(A.ONE).gcda(s,function(t){0==t.compareTo(A.ONE)&&o.p.isProbablePrime(10)?setTimeout(a,0):setTimeout(u,0)})})};setTimeout(u,0)};setTimeout(h,0)},t.prototype.sign=function(t,e,r){var i=(pt[r]||"")+e(t).toString(),n=this.n.bitLength()/4,s=function(t,e){if(e<t.length+22)return console.error("Message too long for RSA"),null;for(var r=e-t.length-6,i="",n=0;n<r;n+=2)i+="ff";return P("0001"+i+"00"+t,16)}(i,n);if(null==s)return null;var o=this.doPrivate(s);if(null==o)return null;for(var h=o.toString(16),a=h.length,u=0;u<n-a;u++)h="0"+h;return h},t.prototype.verify=function(t,e,r){var i=P(e,16),n=this.doPublic(i);return null==n?null:function(t){for(var e in pt)if(pt.hasOwnProperty(e)){var r=pt[e],i=r.length;if(t.substring(0,i)==r)return t.substring(i)}return t}(n.toString(16).replace(/^1f+00/,""))==r(t).toString()},t}();var pt={md2:"3020300c06082a864886f70d020205000410",md5:"3020300c06082a864886f70d020505000410",sha1:"3021300906052b0e03021a05000414",sha224:"302d300d06096086480165030402040500041c",sha256:"3031300d060960864801650304020105000420",sha384:"3041300d060960864801650304020205000430",sha512:"3051300d060960864801650304020305000440",ripemd160:"3021300906052b2403020105000414"};function gt(t,e,r){if(!e||!t)throw new Error("extend failed, please check that all dependencies are included.");var i=function(){};if(i.prototype=e.prototype,t.prototype=new i,t.prototype.constructor=t,t.superclass=e.prototype,e.prototype.constructor==Object.prototype.constructor&&(e.prototype.constructor=e),r){var n;for(n in r)t.prototype[n]=r[n];var s=function(){},o=["toString","valueOf"];try{/MSIE/.test(navigator.userAgent)&&(s=function(t,e){for(n=0;n<o.length;n+=1){var r=o[n],i=e[r];"function"==typeof i&&i!=Object.prototype[r]&&(t[r]=i)}})}catch(t){}s(t.prototype,r)}}var dt={};void 0!==dt.asn1&&dt.asn1||(dt.asn1={}),dt.asn1.ASN1Util=new function(){this.integerToByteHex=function(t){var e=t.toString(16);return e.length%2==1&&(e="0"+e),e},this.bigIntToMinTwosComplementsHex=function(t){var e=t.toString(16);if("-"!=e.substring(0,1))e.length%2==1?e="0"+e:e.match(/^[0-7]/)||(e="00"+e);else{var r=e.substring(1).length;r%2==1?r+=1:e.match(/^[0-7]/)||(r+=2);for(var i="",n=0;n<r;n++)i+="f";e=new A(i,16).xor(t).add(A.ONE).toString(16).replace(/^-/,"")}return e},this.getPEMStringFromHex=function(t,e){return hextopem(t,e)},this.newObject=function(t){var e=dt.asn1,r=e.DERBoolean,i=e.DERInteger,n=e.DERBitString,s=e.DEROctetString,o=e.DERNull,h=e.DERObjectIdentifier,a=e.DEREnumerated,u=e.DERUTF8String,c=e.DERNumericString,f=e.DERPrintableString,l=e.DERTeletexString,p=e.DERIA5String,g=e.DERUTCTime,d=e.DERGeneralizedTime,v=e.DERSequence,y=e.DERSet,m=e.DERTaggedObject,b=e.ASN1Util.newObject,T=Object.keys(t);if(1!=T.length)throw"key of param shall be only one.";var S=T[0];if(-1==":bool:int:bitstr:octstr:null:oid:enum:utf8str:numstr:prnstr:telstr:ia5str:utctime:gentime:seq:set:tag:".indexOf(":"+S+":"))throw"undefined key: "+S;if("bool"==S)return new r(t[S]);if("int"==S)return new i(t[S]);if("bitstr"==S)return new n(t[S]);if("octstr"==S)return new s(t[S]);if("null"==S)return new o(t[S]);if("oid"==S)return new h(t[S]);if("enum"==S)return new a(t[S]);if("utf8str"==S)return new u(t[S]);if("numstr"==S)return new c(t[S]);if("prnstr"==S)return new f(t[S]);if("telstr"==S)return new l(t[S]);if("ia5str"==S)return new p(t[S]);if("utctime"==S)return new g(t[S]);if("gentime"==S)return new d(t[S]);if("seq"==S){for(var E=t[S],w=[],D=0;D<E.length;D++){var x=b(E[D]);w.push(x)}return new v({array:w})}if("set"==S){for(E=t[S],w=[],D=0;D<E.length;D++){x=b(E[D]);w.push(x)}return new y({array:w})}if("tag"==S){var R=t[S];if("[object Array]"===Object.prototype.toString.call(R)&&3==R.length){var A=b(R[2]);return new m({tag:R[0],explicit:R[1],obj:A})}var B={};if(void 0!==R.explicit&&(B.explicit=R.explicit),void 0!==R.tag&&(B.tag=R.tag),void 0===R.obj)throw"obj shall be specified for 'tag'.";return B.obj=b(R.obj),new m(B)}},this.jsonToASN1HEX=function(t){return this.newObject(t).getEncodedHex()}},dt.asn1.ASN1Util.oidHexToInt=function(t){for(var e="",r=parseInt(t.substring(0,2),16),i=(e=Math.floor(r/40)+"."+r%40,""),n=2;n<t.length;n+=2){var s=("00000000"+parseInt(t.substring(n,n+2),16).toString(2)).slice(-8);if(i+=s.substring(1,8),"0"==s.substring(0,1))e=e+"."+new A(i,2).toString(10),i=""}return e},dt.asn1.ASN1Util.oidIntToHex=function(t){var e=function(t){var e=t.toString(16);return 1==e.length&&(e="0"+e),e},r=function(t){var r="",i=new A(t,10).toString(2),n=7-i.length%7;7==n&&(n=0);for(var s="",o=0;o<n;o++)s+="0";i=s+i;for(o=0;o<i.length-1;o+=7){var h=i.substring(o,o+7);o!=i.length-7&&(h="1"+h),r+=e(parseInt(h,2))}return r};if(!t.match(/^[0-9.]+$/))throw"malformed oid string: "+t;var i="",n=t.split("."),s=40*parseInt(n[0])+parseInt(n[1]);i+=e(s),n.splice(0,2);for(var o=0;o<n.length;o++)i+=r(n[o]);return i},dt.asn1.ASN1Object=function(){this.getLengthHexFromValue=function(){if(void 0===this.hV||null==this.hV)throw"this.hV is null or undefined.";if(this.hV.length%2==1)throw"value hex must be even length: n=0,v="+this.hV;var t=this.hV.length/2,e=t.toString(16);if(e.length%2==1&&(e="0"+e),t<128)return e;var r=e.length/2;if(r>15)throw"ASN.1 length too long to represent by 8x: n = "+t.toString(16);return(128+r).toString(16)+e},this.getEncodedHex=function(){return(null==this.hTLV||this.isModified)&&(this.hV=this.getFreshValueHex(),this.hL=this.getLengthHexFromValue(),this.hTLV=this.hT+this.hL+this.hV,this.isModified=!1),this.hTLV},this.getValueHex=function(){return this.getEncodedHex(),this.hV},this.getFreshValueHex=function(){return""}},dt.asn1.DERAbstractString=function(t){dt.asn1.DERAbstractString.superclass.constructor.call(this);this.getString=function(){return this.s},this.setString=function(t){this.hTLV=null,this.isModified=!0,this.s=t,this.hV=stohex(this.s)},this.setStringHex=function(t){this.hTLV=null,this.isModified=!0,this.s=null,this.hV=t},this.getFreshValueHex=function(){return this.hV},void 0!==t&&("string"==typeof t?this.setString(t):void 0!==t.str?this.setString(t.str):void 0!==t.hex&&this.setStringHex(t.hex))},gt(dt.asn1.DERAbstractString,dt.asn1.ASN1Object),dt.asn1.DERAbstractTime=function(t){dt.asn1.DERAbstractTime.superclass.constructor.call(this);this.localDateToUTC=function(t){return utc=t.getTime()+6e4*t.getTimezoneOffset(),new Date(utc)},this.formatDate=function(t,e,r){var i=this.zeroPadding,n=this.localDateToUTC(t),s=String(n.getFullYear());"utc"==e&&(s=s.substring(2,4));var o=s+i(String(n.getMonth()+1),2)+i(String(n.getDate()),2)+i(String(n.getHours()),2)+i(String(n.getMinutes()),2)+i(String(n.getSeconds()),2);if(!0===r){var h=n.getMilliseconds();if(0!=h){var a=i(String(h),3);o=o+"."+(a=a.replace(/[0]+$/,""))}}return o+"Z"},this.zeroPadding=function(t,e){return t.length>=e?t:new Array(e-t.length+1).join("0")+t},this.getString=function(){return this.s},this.setString=function(t){this.hTLV=null,this.isModified=!0,this.s=t,this.hV=stohex(t)},this.setByDateValue=function(t,e,r,i,n,s){var o=new Date(Date.UTC(t,e-1,r,i,n,s,0));this.setByDate(o)},this.getFreshValueHex=function(){return this.hV}},gt(dt.asn1.DERAbstractTime,dt.asn1.ASN1Object),dt.asn1.DERAbstractStructured=function(t){dt.asn1.DERAbstractString.superclass.constructor.call(this);this.setByASN1ObjectArray=function(t){this.hTLV=null,this.isModified=!0,this.asn1Array=t},this.appendASN1Object=function(t){this.hTLV=null,this.isModified=!0,this.asn1Array.push(t)},this.asn1Array=new Array,void 0!==t&&void 0!==t.array&&(this.asn1Array=t.array)},gt(dt.asn1.DERAbstractStructured,dt.asn1.ASN1Object),dt.asn1.DERBoolean=function(){dt.asn1.DERBoolean.superclass.constructor.call(this),this.hT="01",this.hTLV="0101ff"},gt(dt.asn1.DERBoolean,dt.asn1.ASN1Object),dt.asn1.DERInteger=function(t){dt.asn1.DERInteger.superclass.constructor.call(this),this.hT="02",this.setByBigInteger=function(t){this.hTLV=null,this.isModified=!0,this.hV=dt.asn1.ASN1Util.bigIntToMinTwosComplementsHex(t)},this.setByInteger=function(t){var e=new A(String(t),10);this.setByBigInteger(e)},this.setValueHex=function(t){this.hV=t},this.getFreshValueHex=function(){return this.hV},void 0!==t&&(void 0!==t.bigint?this.setByBigInteger(t.bigint):void 0!==t.int?this.setByInteger(t.int):"number"==typeof t?this.setByInteger(t):void 0!==t.hex&&this.setValueHex(t.hex))},gt(dt.asn1.DERInteger,dt.asn1.ASN1Object),dt.asn1.DERBitString=function(t){if(void 0!==t&&void 0!==t.obj){var e=dt.asn1.ASN1Util.newObject(t.obj);t.hex="00"+e.getEncodedHex()}dt.asn1.DERBitString.superclass.constructor.call(this),this.hT="03",this.setHexValueIncludingUnusedBits=function(t){this.hTLV=null,this.isModified=!0,this.hV=t},this.setUnusedBitsAndHexValue=function(t,e){if(t<0||7<t)throw"unused bits shall be from 0 to 7: u = "+t;var r="0"+t;this.hTLV=null,this.isModified=!0,this.hV=r+e},this.setByBinaryString=function(t){var e=8-(t=t.replace(/0+$/,"")).length%8;8==e&&(e=0);for(var r=0;r<=e;r++)t+="0";var i="";for(r=0;r<t.length-1;r+=8){var n=t.substring(r,r+8),s=parseInt(n,2).toString(16);1==s.length&&(s="0"+s),i+=s}this.hTLV=null,this.isModified=!0,this.hV="0"+e+i},this.setByBooleanArray=function(t){for(var e="",r=0;r<t.length;r++)1==t[r]?e+="1":e+="0";this.setByBinaryString(e)},this.newFalseArray=function(t){for(var e=new Array(t),r=0;r<t;r++)e[r]=!1;return e},this.getFreshValueHex=function(){return this.hV},void 0!==t&&("string"==typeof t&&t.toLowerCase().match(/^[0-9a-f]+$/)?this.setHexValueIncludingUnusedBits(t):void 0!==t.hex?this.setHexValueIncludingUnusedBits(t.hex):void 0!==t.bin?this.setByBinaryString(t.bin):void 0!==t.array&&this.setByBooleanArray(t.array))},gt(dt.asn1.DERBitString,dt.asn1.ASN1Object),dt.asn1.DEROctetString=function(t){if(void 0!==t&&void 0!==t.obj){var e=dt.asn1.ASN1Util.newObject(t.obj);t.hex=e.getEncodedHex()}dt.asn1.DEROctetString.superclass.constructor.call(this,t),this.hT="04"},gt(dt.asn1.DEROctetString,dt.asn1.DERAbstractString),dt.asn1.DERNull=function(){dt.asn1.DERNull.superclass.constructor.call(this),this.hT="05",this.hTLV="0500"},gt(dt.asn1.DERNull,dt.asn1.ASN1Object),dt.asn1.DERObjectIdentifier=function(t){var e=function(t){var e=t.toString(16);return 1==e.length&&(e="0"+e),e},r=function(t){var r="",i=new A(t,10).toString(2),n=7-i.length%7;7==n&&(n=0);for(var s="",o=0;o<n;o++)s+="0";i=s+i;for(o=0;o<i.length-1;o+=7){var h=i.substring(o,o+7);o!=i.length-7&&(h="1"+h),r+=e(parseInt(h,2))}return r};dt.asn1.DERObjectIdentifier.superclass.constructor.call(this),this.hT="06",this.setValueHex=function(t){this.hTLV=null,this.isModified=!0,this.s=null,this.hV=t},this.setValueOidString=function(t){if(!t.match(/^[0-9.]+$/))throw"malformed oid string: "+t;var i="",n=t.split("."),s=40*parseInt(n[0])+parseInt(n[1]);i+=e(s),n.splice(0,2);for(var o=0;o<n.length;o++)i+=r(n[o]);this.hTLV=null,this.isModified=!0,this.s=null,this.hV=i},this.setValueName=function(t){var e=dt.asn1.x509.OID.name2oid(t);if(""===e)throw"DERObjectIdentifier oidName undefined: "+t;this.setValueOidString(e)},this.getFreshValueHex=function(){return this.hV},void 0!==t&&("string"==typeof t?t.match(/^[0-2].[0-9.]+$/)?this.setValueOidString(t):this.setValueName(t):void 0!==t.oid?this.setValueOidString(t.oid):void 0!==t.hex?this.setValueHex(t.hex):void 0!==t.name&&this.setValueName(t.name))},gt(dt.asn1.DERObjectIdentifier,dt.asn1.ASN1Object),dt.asn1.DEREnumerated=function(t){dt.asn1.DEREnumerated.superclass.constructor.call(this),this.hT="0a",this.setByBigInteger=function(t){this.hTLV=null,this.isModified=!0,this.hV=dt.asn1.ASN1Util.bigIntToMinTwosComplementsHex(t)},this.setByInteger=function(t){var e=new A(String(t),10);this.setByBigInteger(e)},this.setValueHex=function(t){this.hV=t},this.getFreshValueHex=function(){return this.hV},void 0!==t&&(void 0!==t.int?this.setByInteger(t.int):"number"==typeof t?this.setByInteger(t):void 0!==t.hex&&this.setValueHex(t.hex))},gt(dt.asn1.DEREnumerated,dt.asn1.ASN1Object),dt.asn1.DERUTF8String=function(t){dt.asn1.DERUTF8String.superclass.constructor.call(this,t),this.hT="0c"},gt(dt.asn1.DERUTF8String,dt.asn1.DERAbstractString),dt.asn1.DERNumericString=function(t){dt.asn1.DERNumericString.superclass.constructor.call(this,t),this.hT="12"},gt(dt.asn1.DERNumericString,dt.asn1.DERAbstractString),dt.asn1.DERPrintableString=function(t){dt.asn1.DERPrintableString.superclass.constructor.call(this,t),this.hT="13"},gt(dt.asn1.DERPrintableString,dt.asn1.DERAbstractString),dt.asn1.DERTeletexString=function(t){dt.asn1.DERTeletexString.superclass.constructor.call(this,t),this.hT="14"},gt(dt.asn1.DERTeletexString,dt.asn1.DERAbstractString),dt.asn1.DERIA5String=function(t){dt.asn1.DERIA5String.superclass.constructor.call(this,t),this.hT="16"},gt(dt.asn1.DERIA5String,dt.asn1.DERAbstractString),dt.asn1.DERUTCTime=function(t){dt.asn1.DERUTCTime.superclass.constructor.call(this,t),this.hT="17",this.setByDate=function(t){this.hTLV=null,this.isModified=!0,this.date=t,this.s=this.formatDate(this.date,"utc"),this.hV=stohex(this.s)},this.getFreshValueHex=function(){return void 0===this.date&&void 0===this.s&&(this.date=new Date,this.s=this.formatDate(this.date,"utc"),this.hV=stohex(this.s)),this.hV},void 0!==t&&(void 0!==t.str?this.setString(t.str):"string"==typeof t&&t.match(/^[0-9]{12}Z$/)?this.setString(t):void 0!==t.hex?this.setStringHex(t.hex):void 0!==t.date&&this.setByDate(t.date))},gt(dt.asn1.DERUTCTime,dt.asn1.DERAbstractTime),dt.asn1.DERGeneralizedTime=function(t){dt.asn1.DERGeneralizedTime.superclass.constructor.call(this,t),this.hT="18",this.withMillis=!1,this.setByDate=function(t){this.hTLV=null,this.isModified=!0,this.date=t,this.s=this.formatDate(this.date,"gen",this.withMillis),this.hV=stohex(this.s)},this.getFreshValueHex=function(){return void 0===this.date&&void 0===this.s&&(this.date=new Date,this.s=this.formatDate(this.date,"gen",this.withMillis),this.hV=stohex(this.s)),this.hV},void 0!==t&&(void 0!==t.str?this.setString(t.str):"string"==typeof t&&t.match(/^[0-9]{14}Z$/)?this.setString(t):void 0!==t.hex?this.setStringHex(t.hex):void 0!==t.date&&this.setByDate(t.date),!0===t.millis&&(this.withMillis=!0))},gt(dt.asn1.DERGeneralizedTime,dt.asn1.DERAbstractTime),dt.asn1.DERSequence=function(t){dt.asn1.DERSequence.superclass.constructor.call(this,t),this.hT="30",this.getFreshValueHex=function(){for(var t="",e=0;e<this.asn1Array.length;e++){t+=this.asn1Array[e].getEncodedHex()}return this.hV=t,this.hV}},gt(dt.asn1.DERSequence,dt.asn1.DERAbstractStructured),dt.asn1.DERSet=function(t){dt.asn1.DERSet.superclass.constructor.call(this,t),this.hT="31",this.sortFlag=!0,this.getFreshValueHex=function(){for(var t=new Array,e=0;e<this.asn1Array.length;e++){var r=this.asn1Array[e];t.push(r.getEncodedHex())}return 1==this.sortFlag&&t.sort(),this.hV=t.join(""),this.hV},void 0!==t&&void 0!==t.sortflag&&0==t.sortflag&&(this.sortFlag=!1)},gt(dt.asn1.DERSet,dt.asn1.DERAbstractStructured),dt.asn1.DERTaggedObject=function(t){dt.asn1.DERTaggedObject.superclass.constructor.call(this),this.hT="a0",this.hV="",this.isExplicit=!0,this.asn1Object=null,this.setASN1Object=function(t,e,r){this.hT=e,this.isExplicit=t,this.asn1Object=r,this.isExplicit?(this.hV=this.asn1Object.getEncodedHex(),this.hTLV=null,this.isModified=!0):(this.hV=null,this.hTLV=r.getEncodedHex(),this.hTLV=this.hTLV.replace(/^../,e),this.isModified=!1)},this.getFreshValueHex=function(){return this.hV},void 0!==t&&(void 0!==t.tag&&(this.hT=t.tag),void 0!==t.explicit&&(this.isExplicit=t.explicit),void 0!==t.obj&&(this.asn1Object=t.obj,this.setASN1Object(this.isExplicit,this.hT,this.asn1Object)))},gt(dt.asn1.DERTaggedObject,dt.asn1.ASN1Object);var vt,yt,mt=(vt=function(t,e){return vt=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var r in e)Object.prototype.hasOwnProperty.call(e,r)&&(t[r]=e[r])},vt(t,e)},function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Class extends value "+String(e)+" is not a constructor or null");function r(){this.constructor=t}vt(t,e),t.prototype=null===e?Object.create(e):(r.prototype=e.prototype,new r)}),bt=function(t){function e(r){var i=t.call(this)||this;return r&&("string"==typeof r?i.parseKey(r):(e.hasPrivateKeyProperty(r)||e.hasPublicKeyProperty(r))&&i.parsePropertiesFrom(r)),i}return mt(e,t),e.prototype.parseKey=function(t){try{var e=0,r=0,i=/^\s*(?:[0-9A-Fa-f][0-9A-Fa-f]\s*)+$/.test(t)?g(t):d.unarmor(t),n=w.decode(i);if(3===n.sub.length&&(n=n.sub[2].sub[0]),9===n.sub.length){e=n.sub[1].getHexStringValue(),this.n=P(e,16),r=n.sub[2].getHexStringValue(),this.e=parseInt(r,16);var s=n.sub[3].getHexStringValue();this.d=P(s,16);var o=n.sub[4].getHexStringValue();this.p=P(o,16);var h=n.sub[5].getHexStringValue();this.q=P(h,16);var a=n.sub[6].getHexStringValue();this.dmp1=P(a,16);var u=n.sub[7].getHexStringValue();this.dmq1=P(u,16);var c=n.sub[8].getHexStringValue();this.coeff=P(c,16)}else{if(2!==n.sub.length)return!1;if(n.sub[0].sub){var f=n.sub[1].sub[0];e=f.sub[0].getHexStringValue(),this.n=P(e,16),r=f.sub[1].getHexStringValue(),this.e=parseInt(r,16)}else e=n.sub[0].getHexStringValue(),this.n=P(e,16),r=n.sub[1].getHexStringValue(),this.e=parseInt(r,16)}return!0}catch(t){return!1}},e.prototype.getPrivateBaseKey=function(){var t={array:[new dt.asn1.DERInteger({int:0}),new dt.asn1.DERInteger({bigint:this.n}),new dt.asn1.DERInteger({int:this.e}),new dt.asn1.DERInteger({bigint:this.d}),new dt.asn1.DERInteger({bigint:this.p}),new dt.asn1.DERInteger({bigint:this.q}),new dt.asn1.DERInteger({bigint:this.dmp1}),new dt.asn1.DERInteger({bigint:this.dmq1}),new dt.asn1.DERInteger({bigint:this.coeff})]};return new dt.asn1.DERSequence(t).getEncodedHex()},e.prototype.getPrivateBaseKeyB64=function(){return f(this.getPrivateBaseKey())},e.prototype.getPublicBaseKey=function(){var t=new dt.asn1.DERSequence({array:[new dt.asn1.DERObjectIdentifier({oid:"1.2.840.113549.1.1.1"}),new dt.asn1.DERNull]}),e=new dt.asn1.DERSequence({array:[new dt.asn1.DERInteger({bigint:this.n}),new dt.asn1.DERInteger({int:this.e})]}),r=new dt.asn1.DERBitString({hex:"00"+e.getEncodedHex()});return new dt.asn1.DERSequence({array:[t,r]}).getEncodedHex()},e.prototype.getPublicBaseKeyB64=function(){return f(this.getPublicBaseKey())},e.wordwrap=function(t,e){if(!t)return t;var r="(.{1,"+(e=e||64)+"})( +|$\n?)|(.{1,"+e+"})";return t.match(RegExp(r,"g")).join("\n")},e.prototype.getPrivateKey=function(){var t="-----BEGIN RSA PRIVATE KEY-----\n";return t+=e.wordwrap(this.getPrivateBaseKeyB64())+"\n",t+="-----END RSA PRIVATE KEY-----"},e.prototype.getPublicKey=function(){var t="-----BEGIN PUBLIC KEY-----\n";return t+=e.wordwrap(this.getPublicBaseKeyB64())+"\n",t+="-----END PUBLIC KEY-----"},e.hasPublicKeyProperty=function(t){return(t=t||{}).hasOwnProperty("n")&&t.hasOwnProperty("e")},e.hasPrivateKeyProperty=function(t){return(t=t||{}).hasOwnProperty("n")&&t.hasOwnProperty("e")&&t.hasOwnProperty("d")&&t.hasOwnProperty("p")&&t.hasOwnProperty("q")&&t.hasOwnProperty("dmp1")&&t.hasOwnProperty("dmq1")&&t.hasOwnProperty("coeff")},e.prototype.parsePropertiesFrom=function(t){this.n=t.n,this.e=t.e,t.hasOwnProperty("d")&&(this.d=t.d,this.p=t.p,this.q=t.q,this.dmp1=t.dmp1,this.dmq1=t.dmq1,this.coeff=t.coeff)},e}(lt),Tt=r(606),St=void 0!==Tt?null===(yt=Tt.env)||void 0===yt?void 0:"3.5.4":void 0,Et=function(){function t(t){void 0===t&&(t={}),this.default_key_size=t.default_key_size?parseInt(t.default_key_size,10):1024,this.default_public_exponent=t.default_public_exponent||"010001",this.log=t.log||!1,this.key=t.key||null}return t.prototype.setKey=function(t){t?(this.log&&this.key&&console.warn("A key was already set, overriding existing."),this.key=new bt(t)):!this.key&&this.log&&console.error("A key was not set.")},t.prototype.setPrivateKey=function(t){this.setKey(t)},t.prototype.setPublicKey=function(t){this.setKey(t)},t.prototype.decrypt=function(t){try{return this.getKey().decrypt(l(t))}catch(t){return!1}},t.prototype.encrypt=function(t){try{return f(this.getKey().encrypt(t))}catch(t){return!1}},t.prototype.encryptOAEP=function(t){try{return f(this.getKey().encrypt(t,ft))}catch(t){return!1}},t.prototype.sign=function(t,e,r){void 0===e&&(e=function(t){return t}),void 0===r&&(r="");try{return f(this.getKey().sign(t,e,r))}catch(t){return!1}},t.prototype.signSha256=function(t){return this.sign(t,function(t){return Q(X(t))},"sha256")},t.prototype.verify=function(t,e,r){void 0===r&&(r=function(t){return t});try{return this.getKey().verify(t,l(e),r)}catch(t){return!1}},t.prototype.verifySha256=function(t,e){return this.verify(t,e,function(t){return Q(X(t))})},t.prototype.getKey=function(t){if(!this.key){if(this.key=new bt,t&&"[object Function]"==={}.toString.call(t))return void this.key.generateAsync(this.default_key_size,this.default_public_exponent,t);this.key.generate(this.default_key_size,this.default_public_exponent)}return this.key},t.prototype.getPrivateKey=function(){return this.getKey().getPrivateKey()},t.prototype.getPrivateKeyB64=function(){return this.getKey().getPrivateBaseKeyB64()},t.prototype.getPublicKey=function(){return this.getKey().getPublicKey()},t.prototype.getPublicKeyB64=function(){return this.getKey().getPublicBaseKeyB64()},t.version=St,t}()}(),i=i.default}()});
},
  aes:function(module,exports){;(function (root, factory) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory();
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define([], factory);
	}
	else {
		// Global (browser)
		root.CryptoJS = factory();
	}
}(this, function () {

	/*globals window, global, require*/

	/**
	 * CryptoJS core components.
	 */
	var CryptoJS = CryptoJS || (function (Math, undefined) {

	    var crypto;

	    // Native crypto from window (Browser)
	    if (typeof window !== 'undefined' && window.crypto) {
	        crypto = window.crypto;
	    }

	    // Native crypto in web worker (Browser)
	    if (typeof self !== 'undefined' && self.crypto) {
	        crypto = self.crypto;
	    }

	    // Native crypto from worker
	    if (typeof globalThis !== 'undefined' && globalThis.crypto) {
	        crypto = globalThis.crypto;
	    }

	    // Native (experimental IE 11) crypto from window (Browser)
	    if (!crypto && typeof window !== 'undefined' && window.msCrypto) {
	        crypto = window.msCrypto;
	    }

	    // Native crypto from global (NodeJS)
	    if (!crypto && typeof global !== 'undefined' && global.crypto) {
	        crypto = global.crypto;
	    }

	    // Native crypto import via require (NodeJS)
	    if (!crypto && typeof require === 'function') {
	        try {
	            crypto = require('crypto');
	        } catch (err) {}
	    }

	    /*
	     * Cryptographically secure pseudorandom number generator
	     *
	     * As Math.random() is cryptographically not safe to use
	     */
	    var cryptoSecureRandomInt = function () {
	        if (crypto) {
	            // Use getRandomValues method (Browser)
	            if (typeof crypto.getRandomValues === 'function') {
	                try {
	                    return crypto.getRandomValues(new Uint32Array(1))[0];
	                } catch (err) {}
	            }

	            // Use randomBytes method (NodeJS)
	            if (typeof crypto.randomBytes === 'function') {
	                try {
	                    return crypto.randomBytes(4).readInt32LE();
	                } catch (err) {}
	            }
	        }

	        throw new Error('Native crypto module could not be used to get secure random number.');
	    };

	    /*
	     * Local polyfill of Object.create

	     */
	    var create = Object.create || (function () {
	        function F() {}

	        return function (obj) {
	            var subtype;

	            F.prototype = obj;

	            subtype = new F();

	            F.prototype = null;

	            return subtype;
	        };
	    }());

	    /**
	     * CryptoJS namespace.
	     */
	    var C = {};

	    /**
	     * Library namespace.
	     */
	    var C_lib = C.lib = {};

	    /**
	     * Base object for prototypal inheritance.
	     */
	    var Base = C_lib.Base = (function () {


	        return {
	            /**
	             * Creates a new object that inherits from this object.
	             *
	             * @param {Object} overrides Properties to copy into the new object.
	             *
	             * @return {Object} The new object.
	             *
	             * @static
	             *
	             * @example
	             *
	             *     var MyType = CryptoJS.lib.Base.extend({
	             *         field: 'value',
	             *
	             *         method: function () {
	             *         }
	             *     });
	             */
	            extend: function (overrides) {
	                // Spawn
	                var subtype = create(this);

	                // Augment
	                if (overrides) {
	                    subtype.mixIn(overrides);
	                }

	                // Create default initializer
	                if (!subtype.hasOwnProperty('init') || this.init === subtype.init) {
	                    subtype.init = function () {
	                        subtype.$super.init.apply(this, arguments);
	                    };
	                }

	                // Initializer's prototype is the subtype object
	                subtype.init.prototype = subtype;

	                // Reference supertype
	                subtype.$super = this;

	                return subtype;
	            },

	            /**
	             * Extends this object and runs the init method.
	             * Arguments to create() will be passed to init().
	             *
	             * @return {Object} The new object.
	             *
	             * @static
	             *
	             * @example
	             *
	             *     var instance = MyType.create();
	             */
	            create: function () {
	                var instance = this.extend();
	                instance.init.apply(instance, arguments);

	                return instance;
	            },

	            /**
	             * Initializes a newly created object.
	             * Override this method to add some logic when your objects are created.
	             *
	             * @example
	             *
	             *     var MyType = CryptoJS.lib.Base.extend({
	             *         init: function () {
	             *             // ...
	             *         }
	             *     });
	             */
	            init: function () {
	            },

	            /**
	             * Copies properties into this object.
	             *
	             * @param {Object} properties The properties to mix in.
	             *
	             * @example
	             *
	             *     MyType.mixIn({
	             *         field: 'value'
	             *     });
	             */
	            mixIn: function (properties) {
	                for (var propertyName in properties) {
	                    if (properties.hasOwnProperty(propertyName)) {
	                        this[propertyName] = properties[propertyName];
	                    }
	                }

	                // IE won't copy toString using the loop above
	                if (properties.hasOwnProperty('toString')) {
	                    this.toString = properties.toString;
	                }
	            },

	            /**
	             * Creates a copy of this object.
	             *
	             * @return {Object} The clone.
	             *
	             * @example
	             *
	             *     var clone = instance.clone();
	             */
	            clone: function () {
	                return this.init.prototype.extend(this);
	            }
	        };
	    }());

	    /**
	     * An array of 32-bit words.
	     *
	     * @property {Array} words The array of 32-bit words.
	     * @property {number} sigBytes The number of significant bytes in this word array.
	     */
	    var WordArray = C_lib.WordArray = Base.extend({
	        /**
	         * Initializes a newly created word array.
	         *
	         * @param {Array} words (Optional) An array of 32-bit words.
	         * @param {number} sigBytes (Optional) The number of significant bytes in the words.
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.lib.WordArray.create();
	         *     var wordArray = CryptoJS.lib.WordArray.create([0x00010203, 0x04050607]);
	         *     var wordArray = CryptoJS.lib.WordArray.create([0x00010203, 0x04050607], 6);
	         */
	        init: function (words, sigBytes) {
	            words = this.words = words || [];

	            if (sigBytes != undefined) {
	                this.sigBytes = sigBytes;
	            } else {
	                this.sigBytes = words.length * 4;
	            }
	        },

	        /**
	         * Converts this word array to a string.
	         *
	         * @param {Encoder} encoder (Optional) The encoding strategy to use. Default: CryptoJS.enc.Hex
	         *
	         * @return {string} The stringified word array.
	         *
	         * @example
	         *
	         *     var string = wordArray + '';
	         *     var string = wordArray.toString();
	         *     var string = wordArray.toString(CryptoJS.enc.Utf8);
	         */
	        toString: function (encoder) {
	            return (encoder || Hex).stringify(this);
	        },

	        /**
	         * Concatenates a word array to this word array.
	         *
	         * @param {WordArray} wordArray The word array to append.
	         *
	         * @return {WordArray} This word array.
	         *
	         * @example
	         *
	         *     wordArray1.concat(wordArray2);
	         */
	        concat: function (wordArray) {
	            // Shortcuts
	            var thisWords = this.words;
	            var thatWords = wordArray.words;
	            var thisSigBytes = this.sigBytes;
	            var thatSigBytes = wordArray.sigBytes;

	            // Clamp excess bits
	            this.clamp();

	            // Concat
	            if (thisSigBytes % 4) {
	                // Copy one byte at a time
	                for (var i = 0; i < thatSigBytes; i++) {
	                    var thatByte = (thatWords[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
	                    thisWords[(thisSigBytes + i) >>> 2] |= thatByte << (24 - ((thisSigBytes + i) % 4) * 8);
	                }
	            } else {
	                // Copy one word at a time
	                for (var j = 0; j < thatSigBytes; j += 4) {
	                    thisWords[(thisSigBytes + j) >>> 2] = thatWords[j >>> 2];
	                }
	            }
	            this.sigBytes += thatSigBytes;

	            // Chainable
	            return this;
	        },

	        /**
	         * Removes insignificant bits.
	         *
	         * @example
	         *
	         *     wordArray.clamp();
	         */
	        clamp: function () {
	            // Shortcuts
	            var words = this.words;
	            var sigBytes = this.sigBytes;

	            // Clamp
	            words[sigBytes >>> 2] &= 0xffffffff << (32 - (sigBytes % 4) * 8);
	            words.length = Math.ceil(sigBytes / 4);
	        },

	        /**
	         * Creates a copy of this word array.
	         *
	         * @return {WordArray} The clone.
	         *
	         * @example
	         *
	         *     var clone = wordArray.clone();
	         */
	        clone: function () {
	            var clone = Base.clone.call(this);
	            clone.words = this.words.slice(0);

	            return clone;
	        },

	        /**
	         * Creates a word array filled with random bytes.
	         *
	         * @param {number} nBytes The number of random bytes to generate.
	         *
	         * @return {WordArray} The random word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.lib.WordArray.random(16);
	         */
	        random: function (nBytes) {
	            var words = [];

	            for (var i = 0; i < nBytes; i += 4) {
	                words.push(cryptoSecureRandomInt());
	            }

	            return new WordArray.init(words, nBytes);
	        }
	    });

	    /**
	     * Encoder namespace.
	     */
	    var C_enc = C.enc = {};

	    /**
	     * Hex encoding strategy.
	     */
	    var Hex = C_enc.Hex = {
	        /**
	         * Converts a word array to a hex string.
	         *
	         * @param {WordArray} wordArray The word array.
	         *
	         * @return {string} The hex string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var hexString = CryptoJS.enc.Hex.stringify(wordArray);
	         */
	        stringify: function (wordArray) {
	            // Shortcuts
	            var words = wordArray.words;
	            var sigBytes = wordArray.sigBytes;

	            // Convert
	            var hexChars = [];
	            for (var i = 0; i < sigBytes; i++) {
	                var bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
	                hexChars.push((bite >>> 4).toString(16));
	                hexChars.push((bite & 0x0f).toString(16));
	            }

	            return hexChars.join('');
	        },

	        /**
	         * Converts a hex string to a word array.
	         *
	         * @param {string} hexStr The hex string.
	         *
	         * @return {WordArray} The word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.enc.Hex.parse(hexString);
	         */
	        parse: function (hexStr) {
	            // Shortcut
	            var hexStrLength = hexStr.length;

	            // Convert
	            var words = [];
	            for (var i = 0; i < hexStrLength; i += 2) {
	                words[i >>> 3] |= parseInt(hexStr.substr(i, 2), 16) << (24 - (i % 8) * 4);
	            }

	            return new WordArray.init(words, hexStrLength / 2);
	        }
	    };

	    /**
	     * Latin1 encoding strategy.
	     */
	    var Latin1 = C_enc.Latin1 = {
	        /**
	         * Converts a word array to a Latin1 string.
	         *
	         * @param {WordArray} wordArray The word array.
	         *
	         * @return {string} The Latin1 string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var latin1String = CryptoJS.enc.Latin1.stringify(wordArray);
	         */
	        stringify: function (wordArray) {
	            // Shortcuts
	            var words = wordArray.words;
	            var sigBytes = wordArray.sigBytes;

	            // Convert
	            var latin1Chars = [];
	            for (var i = 0; i < sigBytes; i++) {
	                var bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
	                latin1Chars.push(String.fromCharCode(bite));
	            }

	            return latin1Chars.join('');
	        },

	        /**
	         * Converts a Latin1 string to a word array.
	         *
	         * @param {string} latin1Str The Latin1 string.
	         *
	         * @return {WordArray} The word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.enc.Latin1.parse(latin1String);
	         */
	        parse: function (latin1Str) {
	            // Shortcut
	            var latin1StrLength = latin1Str.length;

	            // Convert
	            var words = [];
	            for (var i = 0; i < latin1StrLength; i++) {
	                words[i >>> 2] |= (latin1Str.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
	            }

	            return new WordArray.init(words, latin1StrLength);
	        }
	    };

	    /**
	     * UTF-8 encoding strategy.
	     */
	    var Utf8 = C_enc.Utf8 = {
	        /**
	         * Converts a word array to a UTF-8 string.
	         *
	         * @param {WordArray} wordArray The word array.
	         *
	         * @return {string} The UTF-8 string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var utf8String = CryptoJS.enc.Utf8.stringify(wordArray);
	         */
	        stringify: function (wordArray) {
	            try {
	                return decodeURIComponent(escape(Latin1.stringify(wordArray)));
	            } catch (e) {
	                throw new Error('Malformed UTF-8 data');
	            }
	        },

	        /**
	         * Converts a UTF-8 string to a word array.
	         *
	         * @param {string} utf8Str The UTF-8 string.
	         *
	         * @return {WordArray} The word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.enc.Utf8.parse(utf8String);
	         */
	        parse: function (utf8Str) {
	            return Latin1.parse(unescape(encodeURIComponent(utf8Str)));
	        }
	    };

	    /**
	     * Abstract buffered block algorithm template.
	     *
	     * The property blockSize must be implemented in a concrete subtype.
	     *
	     * @property {number} _minBufferSize The number of blocks that should be kept unprocessed in the buffer. Default: 0
	     */
	    var BufferedBlockAlgorithm = C_lib.BufferedBlockAlgorithm = Base.extend({
	        /**
	         * Resets this block algorithm's data buffer to its initial state.
	         *
	         * @example
	         *
	         *     bufferedBlockAlgorithm.reset();
	         */
	        reset: function () {
	            // Initial values
	            this._data = new WordArray.init();
	            this._nDataBytes = 0;
	        },

	        /**
	         * Adds new data to this block algorithm's buffer.
	         *
	         * @param {WordArray|string} data The data to append. Strings are converted to a WordArray using UTF-8.
	         *
	         * @example
	         *
	         *     bufferedBlockAlgorithm._append('data');
	         *     bufferedBlockAlgorithm._append(wordArray);
	         */
	        _append: function (data) {
	            // Convert string to WordArray, else assume WordArray already
	            if (typeof data == 'string') {
	                data = Utf8.parse(data);
	            }

	            // Append
	            this._data.concat(data);
	            this._nDataBytes += data.sigBytes;
	        },

	        /**
	         * Processes available data blocks.
	         *
	         * This method invokes _doProcessBlock(offset), which must be implemented by a concrete subtype.
	         *
	         * @param {boolean} doFlush Whether all blocks and partial blocks should be processed.
	         *
	         * @return {WordArray} The processed data.
	         *
	         * @example
	         *
	         *     var processedData = bufferedBlockAlgorithm._process();
	         *     var processedData = bufferedBlockAlgorithm._process(!!'flush');
	         */
	        _process: function (doFlush) {
	            var processedWords;

	            // Shortcuts
	            var data = this._data;
	            var dataWords = data.words;
	            var dataSigBytes = data.sigBytes;
	            var blockSize = this.blockSize;
	            var blockSizeBytes = blockSize * 4;

	            // Count blocks ready
	            var nBlocksReady = dataSigBytes / blockSizeBytes;
	            if (doFlush) {
	                // Round up to include partial blocks
	                nBlocksReady = Math.ceil(nBlocksReady);
	            } else {
	                // Round down to include only full blocks,
	                // less the number of blocks that must remain in the buffer
	                nBlocksReady = Math.max((nBlocksReady | 0) - this._minBufferSize, 0);
	            }

	            // Count words ready
	            var nWordsReady = nBlocksReady * blockSize;

	            // Count bytes ready
	            var nBytesReady = Math.min(nWordsReady * 4, dataSigBytes);

	            // Process blocks
	            if (nWordsReady) {
	                for (var offset = 0; offset < nWordsReady; offset += blockSize) {
	                    // Perform concrete-algorithm logic
	                    this._doProcessBlock(dataWords, offset);
	                }

	                // Remove processed words
	                processedWords = dataWords.splice(0, nWordsReady);
	                data.sigBytes -= nBytesReady;
	            }

	            // Return processed words
	            return new WordArray.init(processedWords, nBytesReady);
	        },

	        /**
	         * Creates a copy of this object.
	         *
	         * @return {Object} The clone.
	         *
	         * @example
	         *
	         *     var clone = bufferedBlockAlgorithm.clone();
	         */
	        clone: function () {
	            var clone = Base.clone.call(this);
	            clone._data = this._data.clone();

	            return clone;
	        },

	        _minBufferSize: 0
	    });

	    /**
	     * Abstract hasher template.
	     *
	     * @property {number} blockSize The number of 32-bit words this hasher operates on. Default: 16 (512 bits)
	     */
	    var Hasher = C_lib.Hasher = BufferedBlockAlgorithm.extend({
	        /**
	         * Configuration options.
	         */
	        cfg: Base.extend(),

	        /**
	         * Initializes a newly created hasher.
	         *
	         * @param {Object} cfg (Optional) The configuration options to use for this hash computation.
	         *
	         * @example
	         *
	         *     var hasher = CryptoJS.algo.SHA256.create();
	         */
	        init: function (cfg) {
	            // Apply config defaults
	            this.cfg = this.cfg.extend(cfg);

	            // Set initial values
	            this.reset();
	        },

	        /**
	         * Resets this hasher to its initial state.
	         *
	         * @example
	         *
	         *     hasher.reset();
	         */
	        reset: function () {
	            // Reset data buffer
	            BufferedBlockAlgorithm.reset.call(this);

	            // Perform concrete-hasher logic
	            this._doReset();
	        },

	        /**
	         * Updates this hasher with a message.
	         *
	         * @param {WordArray|string} messageUpdate The message to append.
	         *
	         * @return {Hasher} This hasher.
	         *
	         * @example
	         *
	         *     hasher.update('message');
	         *     hasher.update(wordArray);
	         */
	        update: function (messageUpdate) {
	            // Append
	            this._append(messageUpdate);

	            // Update the hash
	            this._process();

	            // Chainable
	            return this;
	        },

	        /**
	         * Finalizes the hash computation.
	         * Note that the finalize operation is effectively a destructive, read-once operation.
	         *
	         * @param {WordArray|string} messageUpdate (Optional) A final message update.
	         *
	         * @return {WordArray} The hash.
	         *
	         * @example
	         *
	         *     var hash = hasher.finalize();
	         *     var hash = hasher.finalize('message');
	         *     var hash = hasher.finalize(wordArray);
	         */
	        finalize: function (messageUpdate) {
	            // Final message update
	            if (messageUpdate) {
	                this._append(messageUpdate);
	            }

	            // Perform concrete-hasher logic
	            var hash = this._doFinalize();

	            return hash;
	        },

	        blockSize: 512/32,

	        /**
	         * Creates a shortcut function to a hasher's object interface.
	         *
	         * @param {Hasher} hasher The hasher to create a helper for.
	         *
	         * @return {Function} The shortcut function.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var SHA256 = CryptoJS.lib.Hasher._createHelper(CryptoJS.algo.SHA256);
	         */
	        _createHelper: function (hasher) {
	            return function (message, cfg) {
	                return new hasher.init(cfg).finalize(message);
	            };
	        },

	        /**
	         * Creates a shortcut function to the HMAC's object interface.
	         *
	         * @param {Hasher} hasher The hasher to use in this HMAC helper.
	         *
	         * @return {Function} The shortcut function.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var HmacSHA256 = CryptoJS.lib.Hasher._createHmacHelper(CryptoJS.algo.SHA256);
	         */
	        _createHmacHelper: function (hasher) {
	            return function (message, key) {
	                return new C_algo.HMAC.init(hasher, key).finalize(message);
	            };
	        }
	    });

	    /**
	     * Algorithm namespace.
	     */
	    var C_algo = C.algo = {};

	    return C;
	}(Math));


	(function (undefined) {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var Base = C_lib.Base;
	    var X32WordArray = C_lib.WordArray;

	    /**
	     * x64 namespace.
	     */
	    var C_x64 = C.x64 = {};

	    /**
	     * A 64-bit word.
	     */
	    var X64Word = C_x64.Word = Base.extend({
	        /**
	         * Initializes a newly created 64-bit word.
	         *
	         * @param {number} high The high 32 bits.
	         * @param {number} low The low 32 bits.
	         *
	         * @example
	         *
	         *     var x64Word = CryptoJS.x64.Word.create(0x00010203, 0x04050607);
	         */
	        init: function (high, low) {
	            this.high = high;
	            this.low = low;
	        }

	        /**
	         * Bitwise NOTs this word.
	         *
	         * @return {X64Word} A new x64-Word object after negating.
	         *
	         * @example
	         *
	         *     var negated = x64Word.not();
	         */
	        // not: function () {
	            // var high = ~this.high;
	            // var low = ~this.low;

	            // return X64Word.create(high, low);
	        // },

	        /**
	         * Bitwise ANDs this word with the passed word.
	         *
	         * @param {X64Word} word The x64-Word to AND with this word.
	         *
	         * @return {X64Word} A new x64-Word object after ANDing.
	         *
	         * @example
	         *
	         *     var anded = x64Word.and(anotherX64Word);
	         */
	        // and: function (word) {
	            // var high = this.high & word.high;
	            // var low = this.low & word.low;

	            // return X64Word.create(high, low);
	        // },

	        /**
	         * Bitwise ORs this word with the passed word.
	         *
	         * @param {X64Word} word The x64-Word to OR with this word.
	         *
	         * @return {X64Word} A new x64-Word object after ORing.
	         *
	         * @example
	         *
	         *     var ored = x64Word.or(anotherX64Word);
	         */
	        // or: function (word) {
	            // var high = this.high | word.high;
	            // var low = this.low | word.low;

	            // return X64Word.create(high, low);
	        // },

	        /**
	         * Bitwise XORs this word with the passed word.
	         *
	         * @param {X64Word} word The x64-Word to XOR with this word.
	         *
	         * @return {X64Word} A new x64-Word object after XORing.
	         *
	         * @example
	         *
	         *     var xored = x64Word.xor(anotherX64Word);
	         */
	        // xor: function (word) {
	            // var high = this.high ^ word.high;
	            // var low = this.low ^ word.low;

	            // return X64Word.create(high, low);
	        // },

	        /**
	         * Shifts this word n bits to the left.
	         *
	         * @param {number} n The number of bits to shift.
	         *
	         * @return {X64Word} A new x64-Word object after shifting.
	         *
	         * @example
	         *
	         *     var shifted = x64Word.shiftL(25);
	         */
	        // shiftL: function (n) {
	            // if (n < 32) {
	                // var high = (this.high << n) | (this.low >>> (32 - n));
	                // var low = this.low << n;
	            // } else {
	                // var high = this.low << (n - 32);
	                // var low = 0;
	            // }

	            // return X64Word.create(high, low);
	        // },

	        /**
	         * Shifts this word n bits to the right.
	         *
	         * @param {number} n The number of bits to shift.
	         *
	         * @return {X64Word} A new x64-Word object after shifting.
	         *
	         * @example
	         *
	         *     var shifted = x64Word.shiftR(7);
	         */
	        // shiftR: function (n) {
	            // if (n < 32) {
	                // var low = (this.low >>> n) | (this.high << (32 - n));
	                // var high = this.high >>> n;
	            // } else {
	                // var low = this.high >>> (n - 32);
	                // var high = 0;
	            // }

	            // return X64Word.create(high, low);
	        // },

	        /**
	         * Rotates this word n bits to the left.
	         *
	         * @param {number} n The number of bits to rotate.
	         *
	         * @return {X64Word} A new x64-Word object after rotating.
	         *
	         * @example
	         *
	         *     var rotated = x64Word.rotL(25);
	         */
	        // rotL: function (n) {
	            // return this.shiftL(n).or(this.shiftR(64 - n));
	        // },

	        /**
	         * Rotates this word n bits to the right.
	         *
	         * @param {number} n The number of bits to rotate.
	         *
	         * @return {X64Word} A new x64-Word object after rotating.
	         *
	         * @example
	         *
	         *     var rotated = x64Word.rotR(7);
	         */
	        // rotR: function (n) {
	            // return this.shiftR(n).or(this.shiftL(64 - n));
	        // },

	        /**
	         * Adds this word with the passed word.
	         *
	         * @param {X64Word} word The x64-Word to add with this word.
	         *
	         * @return {X64Word} A new x64-Word object after adding.
	         *
	         * @example
	         *
	         *     var added = x64Word.add(anotherX64Word);
	         */
	        // add: function (word) {
	            // var low = (this.low + word.low) | 0;
	            // var carry = (low >>> 0) < (this.low >>> 0) ? 1 : 0;
	            // var high = (this.high + word.high + carry) | 0;

	            // return X64Word.create(high, low);
	        // }
	    });

	    /**
	     * An array of 64-bit words.
	     *
	     * @property {Array} words The array of CryptoJS.x64.Word objects.
	     * @property {number} sigBytes The number of significant bytes in this word array.
	     */
	    var X64WordArray = C_x64.WordArray = Base.extend({
	        /**
	         * Initializes a newly created word array.
	         *
	         * @param {Array} words (Optional) An array of CryptoJS.x64.Word objects.
	         * @param {number} sigBytes (Optional) The number of significant bytes in the words.
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.x64.WordArray.create();
	         *
	         *     var wordArray = CryptoJS.x64.WordArray.create([
	         *         CryptoJS.x64.Word.create(0x00010203, 0x04050607),
	         *         CryptoJS.x64.Word.create(0x18191a1b, 0x1c1d1e1f)
	         *     ]);
	         *
	         *     var wordArray = CryptoJS.x64.WordArray.create([
	         *         CryptoJS.x64.Word.create(0x00010203, 0x04050607),
	         *         CryptoJS.x64.Word.create(0x18191a1b, 0x1c1d1e1f)
	         *     ], 10);
	         */
	        init: function (words, sigBytes) {
	            words = this.words = words || [];

	            if (sigBytes != undefined) {
	                this.sigBytes = sigBytes;
	            } else {
	                this.sigBytes = words.length * 8;
	            }
	        },

	        /**
	         * Converts this 64-bit word array to a 32-bit word array.
	         *
	         * @return {CryptoJS.lib.WordArray} This word array's data as a 32-bit word array.
	         *
	         * @example
	         *
	         *     var x32WordArray = x64WordArray.toX32();
	         */
	        toX32: function () {
	            // Shortcuts
	            var x64Words = this.words;
	            var x64WordsLength = x64Words.length;

	            // Convert
	            var x32Words = [];
	            for (var i = 0; i < x64WordsLength; i++) {
	                var x64Word = x64Words[i];
	                x32Words.push(x64Word.high);
	                x32Words.push(x64Word.low);
	            }

	            return X32WordArray.create(x32Words, this.sigBytes);
	        },

	        /**
	         * Creates a copy of this word array.
	         *
	         * @return {X64WordArray} The clone.
	         *
	         * @example
	         *
	         *     var clone = x64WordArray.clone();
	         */
	        clone: function () {
	            var clone = Base.clone.call(this);

	            // Clone "words" array
	            var words = clone.words = this.words.slice(0);

	            // Clone each X64Word object
	            var wordsLength = words.length;
	            for (var i = 0; i < wordsLength; i++) {
	                words[i] = words[i].clone();
	            }

	            return clone;
	        }
	    });
	}());


	(function () {
	    // Check if typed arrays are supported
	    if (typeof ArrayBuffer != 'function') {
	        return;
	    }

	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;

	    // Reference original init
	    var superInit = WordArray.init;

	    // Augment WordArray.init to handle typed arrays
	    var subInit = WordArray.init = function (typedArray) {
	        // Convert buffers to uint8
	        if (typedArray instanceof ArrayBuffer) {
	            typedArray = new Uint8Array(typedArray);
	        }

	        // Convert other array views to uint8
	        if (
	            typedArray instanceof Int8Array ||
	            (typeof Uint8ClampedArray !== "undefined" && typedArray instanceof Uint8ClampedArray) ||
	            typedArray instanceof Int16Array ||
	            typedArray instanceof Uint16Array ||
	            typedArray instanceof Int32Array ||
	            typedArray instanceof Uint32Array ||
	            typedArray instanceof Float32Array ||
	            typedArray instanceof Float64Array
	        ) {
	            typedArray = new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
	        }

	        // Handle Uint8Array
	        if (typedArray instanceof Uint8Array) {
	            // Shortcut
	            var typedArrayByteLength = typedArray.byteLength;

	            // Extract bytes
	            var words = [];
	            for (var i = 0; i < typedArrayByteLength; i++) {
	                words[i >>> 2] |= typedArray[i] << (24 - (i % 4) * 8);
	            }

	            // Initialize this word array
	            superInit.call(this, words, typedArrayByteLength);
	        } else {
	            // Else call normal init
	            superInit.apply(this, arguments);
	        }
	    };

	    subInit.prototype = WordArray;
	}());


	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var C_enc = C.enc;

	    /**
	     * UTF-16 BE encoding strategy.
	     */
	    var Utf16BE = C_enc.Utf16 = C_enc.Utf16BE = {
	        /**
	         * Converts a word array to a UTF-16 BE string.
	         *
	         * @param {WordArray} wordArray The word array.
	         *
	         * @return {string} The UTF-16 BE string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var utf16String = CryptoJS.enc.Utf16.stringify(wordArray);
	         */
	        stringify: function (wordArray) {
	            // Shortcuts
	            var words = wordArray.words;
	            var sigBytes = wordArray.sigBytes;

	            // Convert
	            var utf16Chars = [];
	            for (var i = 0; i < sigBytes; i += 2) {
	                var codePoint = (words[i >>> 2] >>> (16 - (i % 4) * 8)) & 0xffff;
	                utf16Chars.push(String.fromCharCode(codePoint));
	            }

	            return utf16Chars.join('');
	        },

	        /**
	         * Converts a UTF-16 BE string to a word array.
	         *
	         * @param {string} utf16Str The UTF-16 BE string.
	         *
	         * @return {WordArray} The word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.enc.Utf16.parse(utf16String);
	         */
	        parse: function (utf16Str) {
	            // Shortcut
	            var utf16StrLength = utf16Str.length;

	            // Convert
	            var words = [];
	            for (var i = 0; i < utf16StrLength; i++) {
	                words[i >>> 1] |= utf16Str.charCodeAt(i) << (16 - (i % 2) * 16);
	            }

	            return WordArray.create(words, utf16StrLength * 2);
	        }
	    };

	    /**
	     * UTF-16 LE encoding strategy.
	     */
	    C_enc.Utf16LE = {
	        /**
	         * Converts a word array to a UTF-16 LE string.
	         *
	         * @param {WordArray} wordArray The word array.
	         *
	         * @return {string} The UTF-16 LE string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var utf16Str = CryptoJS.enc.Utf16LE.stringify(wordArray);
	         */
	        stringify: function (wordArray) {
	            // Shortcuts
	            var words = wordArray.words;
	            var sigBytes = wordArray.sigBytes;

	            // Convert
	            var utf16Chars = [];
	            for (var i = 0; i < sigBytes; i += 2) {
	                var codePoint = swapEndian((words[i >>> 2] >>> (16 - (i % 4) * 8)) & 0xffff);
	                utf16Chars.push(String.fromCharCode(codePoint));
	            }

	            return utf16Chars.join('');
	        },

	        /**
	         * Converts a UTF-16 LE string to a word array.
	         *
	         * @param {string} utf16Str The UTF-16 LE string.
	         *
	         * @return {WordArray} The word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.enc.Utf16LE.parse(utf16Str);
	         */
	        parse: function (utf16Str) {
	            // Shortcut
	            var utf16StrLength = utf16Str.length;

	            // Convert
	            var words = [];
	            for (var i = 0; i < utf16StrLength; i++) {
	                words[i >>> 1] |= swapEndian(utf16Str.charCodeAt(i) << (16 - (i % 2) * 16));
	            }

	            return WordArray.create(words, utf16StrLength * 2);
	        }
	    };

	    function swapEndian(word) {
	        return ((word << 8) & 0xff00ff00) | ((word >>> 8) & 0x00ff00ff);
	    }
	}());


	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var C_enc = C.enc;

	    /**
	     * Base64 encoding strategy.
	     */
	    var Base64 = C_enc.Base64 = {
	        /**
	         * Converts a word array to a Base64 string.
	         *
	         * @param {WordArray} wordArray The word array.
	         *
	         * @return {string} The Base64 string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var base64String = CryptoJS.enc.Base64.stringify(wordArray);
	         */
	        stringify: function (wordArray) {
	            // Shortcuts
	            var words = wordArray.words;
	            var sigBytes = wordArray.sigBytes;
	            var map = this._map;

	            // Clamp excess bits
	            wordArray.clamp();

	            // Convert
	            var base64Chars = [];
	            for (var i = 0; i < sigBytes; i += 3) {
	                var byte1 = (words[i >>> 2]       >>> (24 - (i % 4) * 8))       & 0xff;
	                var byte2 = (words[(i + 1) >>> 2] >>> (24 - ((i + 1) % 4) * 8)) & 0xff;
	                var byte3 = (words[(i + 2) >>> 2] >>> (24 - ((i + 2) % 4) * 8)) & 0xff;

	                var triplet = (byte1 << 16) | (byte2 << 8) | byte3;

	                for (var j = 0; (j < 4) && (i + j * 0.75 < sigBytes); j++) {
	                    base64Chars.push(map.charAt((triplet >>> (6 * (3 - j))) & 0x3f));
	                }
	            }

	            // Add padding
	            var paddingChar = map.charAt(64);
	            if (paddingChar) {
	                while (base64Chars.length % 4) {
	                    base64Chars.push(paddingChar);
	                }
	            }

	            return base64Chars.join('');
	        },

	        /**
	         * Converts a Base64 string to a word array.
	         *
	         * @param {string} base64Str The Base64 string.
	         *
	         * @return {WordArray} The word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.enc.Base64.parse(base64String);
	         */
	        parse: function (base64Str) {
	            // Shortcuts
	            var base64StrLength = base64Str.length;
	            var map = this._map;
	            var reverseMap = this._reverseMap;

	            if (!reverseMap) {
	                    reverseMap = this._reverseMap = [];
	                    for (var j = 0; j < map.length; j++) {
	                        reverseMap[map.charCodeAt(j)] = j;
	                    }
	            }

	            // Ignore padding
	            var paddingChar = map.charAt(64);
	            if (paddingChar) {
	                var paddingIndex = base64Str.indexOf(paddingChar);
	                if (paddingIndex !== -1) {
	                    base64StrLength = paddingIndex;
	                }
	            }

	            // Convert
	            return parseLoop(base64Str, base64StrLength, reverseMap);

	        },

	        _map: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
	    };

	    function parseLoop(base64Str, base64StrLength, reverseMap) {
	      var words = [];
	      var nBytes = 0;
	      for (var i = 0; i < base64StrLength; i++) {
	          if (i % 4) {
	              var bits1 = reverseMap[base64Str.charCodeAt(i - 1)] << ((i % 4) * 2);
	              var bits2 = reverseMap[base64Str.charCodeAt(i)] >>> (6 - (i % 4) * 2);
	              var bitsCombined = bits1 | bits2;
	              words[nBytes >>> 2] |= bitsCombined << (24 - (nBytes % 4) * 8);
	              nBytes++;
	          }
	      }
	      return WordArray.create(words, nBytes);
	    }
	}());


	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var C_enc = C.enc;

	    /**
	     * Base64url encoding strategy.
	     */
	    var Base64url = C_enc.Base64url = {
	        /**
	         * Converts a word array to a Base64url string.
	         *
	         * @param {WordArray} wordArray The word array.
	         *
	         * @param {boolean} urlSafe Whether to use url safe
	         *
	         * @return {string} The Base64url string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var base64String = CryptoJS.enc.Base64url.stringify(wordArray);
	         */
	        stringify: function (wordArray, urlSafe) {
	            if (urlSafe === undefined) {
	                urlSafe = true
	            }
	            // Shortcuts
	            var words = wordArray.words;
	            var sigBytes = wordArray.sigBytes;
	            var map = urlSafe ? this._safe_map : this._map;

	            // Clamp excess bits
	            wordArray.clamp();

	            // Convert
	            var base64Chars = [];
	            for (var i = 0; i < sigBytes; i += 3) {
	                var byte1 = (words[i >>> 2]       >>> (24 - (i % 4) * 8))       & 0xff;
	                var byte2 = (words[(i + 1) >>> 2] >>> (24 - ((i + 1) % 4) * 8)) & 0xff;
	                var byte3 = (words[(i + 2) >>> 2] >>> (24 - ((i + 2) % 4) * 8)) & 0xff;

	                var triplet = (byte1 << 16) | (byte2 << 8) | byte3;

	                for (var j = 0; (j < 4) && (i + j * 0.75 < sigBytes); j++) {
	                    base64Chars.push(map.charAt((triplet >>> (6 * (3 - j))) & 0x3f));
	                }
	            }

	            // Add padding
	            var paddingChar = map.charAt(64);
	            if (paddingChar) {
	                while (base64Chars.length % 4) {
	                    base64Chars.push(paddingChar);
	                }
	            }

	            return base64Chars.join('');
	        },

	        /**
	         * Converts a Base64url string to a word array.
	         *
	         * @param {string} base64Str The Base64url string.
	         *
	         * @param {boolean} urlSafe Whether to use url safe
	         *
	         * @return {WordArray} The word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.enc.Base64url.parse(base64String);
	         */
	        parse: function (base64Str, urlSafe) {
	            if (urlSafe === undefined) {
	                urlSafe = true
	            }

	            // Shortcuts
	            var base64StrLength = base64Str.length;
	            var map = urlSafe ? this._safe_map : this._map;
	            var reverseMap = this._reverseMap;

	            if (!reverseMap) {
	                reverseMap = this._reverseMap = [];
	                for (var j = 0; j < map.length; j++) {
	                    reverseMap[map.charCodeAt(j)] = j;
	                }
	            }

	            // Ignore padding
	            var paddingChar = map.charAt(64);
	            if (paddingChar) {
	                var paddingIndex = base64Str.indexOf(paddingChar);
	                if (paddingIndex !== -1) {
	                    base64StrLength = paddingIndex;
	                }
	            }

	            // Convert
	            return parseLoop(base64Str, base64StrLength, reverseMap);

	        },

	        _map: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
	        _safe_map: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
	    };

	    function parseLoop(base64Str, base64StrLength, reverseMap) {
	        var words = [];
	        var nBytes = 0;
	        for (var i = 0; i < base64StrLength; i++) {
	            if (i % 4) {
	                var bits1 = reverseMap[base64Str.charCodeAt(i - 1)] << ((i % 4) * 2);
	                var bits2 = reverseMap[base64Str.charCodeAt(i)] >>> (6 - (i % 4) * 2);
	                var bitsCombined = bits1 | bits2;
	                words[nBytes >>> 2] |= bitsCombined << (24 - (nBytes % 4) * 8);
	                nBytes++;
	            }
	        }
	        return WordArray.create(words, nBytes);
	    }
	}());


	(function (Math) {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var Hasher = C_lib.Hasher;
	    var C_algo = C.algo;

	    // Constants table
	    var T = [];

	    // Compute constants
	    (function () {
	        for (var i = 0; i < 64; i++) {
	            T[i] = (Math.abs(Math.sin(i + 1)) * 0x100000000) | 0;
	        }
	    }());

	    /**
	     * MD5 hash algorithm.
	     */
	    var MD5 = C_algo.MD5 = Hasher.extend({
	        _doReset: function () {
	            this._hash = new WordArray.init([
	                0x67452301, 0xefcdab89,
	                0x98badcfe, 0x10325476
	            ]);
	        },

	        _doProcessBlock: function (M, offset) {
	            // Swap endian
	            for (var i = 0; i < 16; i++) {
	                // Shortcuts
	                var offset_i = offset + i;
	                var M_offset_i = M[offset_i];

	                M[offset_i] = (
	                    (((M_offset_i << 8)  | (M_offset_i >>> 24)) & 0x00ff00ff) |
	                    (((M_offset_i << 24) | (M_offset_i >>> 8))  & 0xff00ff00)
	                );
	            }

	            // Shortcuts
	            var H = this._hash.words;

	            var M_offset_0  = M[offset + 0];
	            var M_offset_1  = M[offset + 1];
	            var M_offset_2  = M[offset + 2];
	            var M_offset_3  = M[offset + 3];
	            var M_offset_4  = M[offset + 4];
	            var M_offset_5  = M[offset + 5];
	            var M_offset_6  = M[offset + 6];
	            var M_offset_7  = M[offset + 7];
	            var M_offset_8  = M[offset + 8];
	            var M_offset_9  = M[offset + 9];
	            var M_offset_10 = M[offset + 10];
	            var M_offset_11 = M[offset + 11];
	            var M_offset_12 = M[offset + 12];
	            var M_offset_13 = M[offset + 13];
	            var M_offset_14 = M[offset + 14];
	            var M_offset_15 = M[offset + 15];

	            // Working variables
	            var a = H[0];
	            var b = H[1];
	            var c = H[2];
	            var d = H[3];

	            // Computation
	            a = FF(a, b, c, d, M_offset_0,  7,  T[0]);
	            d = FF(d, a, b, c, M_offset_1,  12, T[1]);
	            c = FF(c, d, a, b, M_offset_2,  17, T[2]);
	            b = FF(b, c, d, a, M_offset_3,  22, T[3]);
	            a = FF(a, b, c, d, M_offset_4,  7,  T[4]);
	            d = FF(d, a, b, c, M_offset_5,  12, T[5]);
	            c = FF(c, d, a, b, M_offset_6,  17, T[6]);
	            b = FF(b, c, d, a, M_offset_7,  22, T[7]);
	            a = FF(a, b, c, d, M_offset_8,  7,  T[8]);
	            d = FF(d, a, b, c, M_offset_9,  12, T[9]);
	            c = FF(c, d, a, b, M_offset_10, 17, T[10]);
	            b = FF(b, c, d, a, M_offset_11, 22, T[11]);
	            a = FF(a, b, c, d, M_offset_12, 7,  T[12]);
	            d = FF(d, a, b, c, M_offset_13, 12, T[13]);
	            c = FF(c, d, a, b, M_offset_14, 17, T[14]);
	            b = FF(b, c, d, a, M_offset_15, 22, T[15]);

	            a = GG(a, b, c, d, M_offset_1,  5,  T[16]);
	            d = GG(d, a, b, c, M_offset_6,  9,  T[17]);
	            c = GG(c, d, a, b, M_offset_11, 14, T[18]);
	            b = GG(b, c, d, a, M_offset_0,  20, T[19]);
	            a = GG(a, b, c, d, M_offset_5,  5,  T[20]);
	            d = GG(d, a, b, c, M_offset_10, 9,  T[21]);
	            c = GG(c, d, a, b, M_offset_15, 14, T[22]);
	            b = GG(b, c, d, a, M_offset_4,  20, T[23]);
	            a = GG(a, b, c, d, M_offset_9,  5,  T[24]);
	            d = GG(d, a, b, c, M_offset_14, 9,  T[25]);
	            c = GG(c, d, a, b, M_offset_3,  14, T[26]);
	            b = GG(b, c, d, a, M_offset_8,  20, T[27]);
	            a = GG(a, b, c, d, M_offset_13, 5,  T[28]);
	            d = GG(d, a, b, c, M_offset_2,  9,  T[29]);
	            c = GG(c, d, a, b, M_offset_7,  14, T[30]);
	            b = GG(b, c, d, a, M_offset_12, 20, T[31]);

	            a = HH(a, b, c, d, M_offset_5,  4,  T[32]);
	            d = HH(d, a, b, c, M_offset_8,  11, T[33]);
	            c = HH(c, d, a, b, M_offset_11, 16, T[34]);
	            b = HH(b, c, d, a, M_offset_14, 23, T[35]);
	            a = HH(a, b, c, d, M_offset_1,  4,  T[36]);
	            d = HH(d, a, b, c, M_offset_4,  11, T[37]);
	            c = HH(c, d, a, b, M_offset_7,  16, T[38]);
	            b = HH(b, c, d, a, M_offset_10, 23, T[39]);
	            a = HH(a, b, c, d, M_offset_13, 4,  T[40]);
	            d = HH(d, a, b, c, M_offset_0,  11, T[41]);
	            c = HH(c, d, a, b, M_offset_3,  16, T[42]);
	            b = HH(b, c, d, a, M_offset_6,  23, T[43]);
	            a = HH(a, b, c, d, M_offset_9,  4,  T[44]);
	            d = HH(d, a, b, c, M_offset_12, 11, T[45]);
	            c = HH(c, d, a, b, M_offset_15, 16, T[46]);
	            b = HH(b, c, d, a, M_offset_2,  23, T[47]);

	            a = II(a, b, c, d, M_offset_0,  6,  T[48]);
	            d = II(d, a, b, c, M_offset_7,  10, T[49]);
	            c = II(c, d, a, b, M_offset_14, 15, T[50]);
	            b = II(b, c, d, a, M_offset_5,  21, T[51]);
	            a = II(a, b, c, d, M_offset_12, 6,  T[52]);
	            d = II(d, a, b, c, M_offset_3,  10, T[53]);
	            c = II(c, d, a, b, M_offset_10, 15, T[54]);
	            b = II(b, c, d, a, M_offset_1,  21, T[55]);
	            a = II(a, b, c, d, M_offset_8,  6,  T[56]);
	            d = II(d, a, b, c, M_offset_15, 10, T[57]);
	            c = II(c, d, a, b, M_offset_6,  15, T[58]);
	            b = II(b, c, d, a, M_offset_13, 21, T[59]);
	            a = II(a, b, c, d, M_offset_4,  6,  T[60]);
	            d = II(d, a, b, c, M_offset_11, 10, T[61]);
	            c = II(c, d, a, b, M_offset_2,  15, T[62]);
	            b = II(b, c, d, a, M_offset_9,  21, T[63]);

	            // Intermediate hash value
	            H[0] = (H[0] + a) | 0;
	            H[1] = (H[1] + b) | 0;
	            H[2] = (H[2] + c) | 0;
	            H[3] = (H[3] + d) | 0;
	        },

	        _doFinalize: function () {
	            // Shortcuts
	            var data = this._data;
	            var dataWords = data.words;

	            var nBitsTotal = this._nDataBytes * 8;
	            var nBitsLeft = data.sigBytes * 8;

	            // Add padding
	            dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);

	            var nBitsTotalH = Math.floor(nBitsTotal / 0x100000000);
	            var nBitsTotalL = nBitsTotal;
	            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 15] = (
	                (((nBitsTotalH << 8)  | (nBitsTotalH >>> 24)) & 0x00ff00ff) |
	                (((nBitsTotalH << 24) | (nBitsTotalH >>> 8))  & 0xff00ff00)
	            );
	            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 14] = (
	                (((nBitsTotalL << 8)  | (nBitsTotalL >>> 24)) & 0x00ff00ff) |
	                (((nBitsTotalL << 24) | (nBitsTotalL >>> 8))  & 0xff00ff00)
	            );

	            data.sigBytes = (dataWords.length + 1) * 4;

	            // Hash final blocks
	            this._process();

	            // Shortcuts
	            var hash = this._hash;
	            var H = hash.words;

	            // Swap endian
	            for (var i = 0; i < 4; i++) {
	                // Shortcut
	                var H_i = H[i];

	                H[i] = (((H_i << 8)  | (H_i >>> 24)) & 0x00ff00ff) |
	                       (((H_i << 24) | (H_i >>> 8))  & 0xff00ff00);
	            }

	            // Return final computed hash
	            return hash;
	        },

	        clone: function () {
	            var clone = Hasher.clone.call(this);
	            clone._hash = this._hash.clone();

	            return clone;
	        }
	    });

	    function FF(a, b, c, d, x, s, t) {
	        var n = a + ((b & c) | (~b & d)) + x + t;
	        return ((n << s) | (n >>> (32 - s))) + b;
	    }

	    function GG(a, b, c, d, x, s, t) {
	        var n = a + ((b & d) | (c & ~d)) + x + t;
	        return ((n << s) | (n >>> (32 - s))) + b;
	    }

	    function HH(a, b, c, d, x, s, t) {
	        var n = a + (b ^ c ^ d) + x + t;
	        return ((n << s) | (n >>> (32 - s))) + b;
	    }

	    function II(a, b, c, d, x, s, t) {
	        var n = a + (c ^ (b | ~d)) + x + t;
	        return ((n << s) | (n >>> (32 - s))) + b;
	    }

	    /**
	     * Shortcut function to the hasher's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     *
	     * @return {WordArray} The hash.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hash = CryptoJS.MD5('message');
	     *     var hash = CryptoJS.MD5(wordArray);
	     */
	    C.MD5 = Hasher._createHelper(MD5);

	    /**
	     * Shortcut function to the HMAC's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     * @param {WordArray|string} key The secret key.
	     *
	     * @return {WordArray} The HMAC.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hmac = CryptoJS.HmacMD5(message, key);
	     */
	    C.HmacMD5 = Hasher._createHmacHelper(MD5);
	}(Math));


	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var Hasher = C_lib.Hasher;
	    var C_algo = C.algo;

	    // Reusable object
	    var W = [];

	    /**
	     * SHA-1 hash algorithm.
	     */
	    var SHA1 = C_algo.SHA1 = Hasher.extend({
	        _doReset: function () {
	            this._hash = new WordArray.init([
	                0x67452301, 0xefcdab89,
	                0x98badcfe, 0x10325476,
	                0xc3d2e1f0
	            ]);
	        },

	        _doProcessBlock: function (M, offset) {
	            // Shortcut
	            var H = this._hash.words;

	            // Working variables
	            var a = H[0];
	            var b = H[1];
	            var c = H[2];
	            var d = H[3];
	            var e = H[4];

	            // Computation
	            for (var i = 0; i < 80; i++) {
	                if (i < 16) {
	                    W[i] = M[offset + i] | 0;
	                } else {
	                    var n = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16];
	                    W[i] = (n << 1) | (n >>> 31);
	                }

	                var t = ((a << 5) | (a >>> 27)) + e + W[i];
	                if (i < 20) {
	                    t += ((b & c) | (~b & d)) + 0x5a827999;
	                } else if (i < 40) {
	                    t += (b ^ c ^ d) + 0x6ed9eba1;
	                } else if (i < 60) {
	                    t += ((b & c) | (b & d) | (c & d)) - 0x70e44324;
	                } else /* if (i < 80) */ {
	                    t += (b ^ c ^ d) - 0x359d3e2a;
	                }

	                e = d;
	                d = c;
	                c = (b << 30) | (b >>> 2);
	                b = a;
	                a = t;
	            }

	            // Intermediate hash value
	            H[0] = (H[0] + a) | 0;
	            H[1] = (H[1] + b) | 0;
	            H[2] = (H[2] + c) | 0;
	            H[3] = (H[3] + d) | 0;
	            H[4] = (H[4] + e) | 0;
	        },

	        _doFinalize: function () {
	            // Shortcuts
	            var data = this._data;
	            var dataWords = data.words;

	            var nBitsTotal = this._nDataBytes * 8;
	            var nBitsLeft = data.sigBytes * 8;

	            // Add padding
	            dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
	            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 14] = Math.floor(nBitsTotal / 0x100000000);
	            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 15] = nBitsTotal;
	            data.sigBytes = dataWords.length * 4;

	            // Hash final blocks
	            this._process();

	            // Return final computed hash
	            return this._hash;
	        },

	        clone: function () {
	            var clone = Hasher.clone.call(this);
	            clone._hash = this._hash.clone();

	            return clone;
	        }
	    });

	    /**
	     * Shortcut function to the hasher's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     *
	     * @return {WordArray} The hash.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hash = CryptoJS.SHA1('message');
	     *     var hash = CryptoJS.SHA1(wordArray);
	     */
	    C.SHA1 = Hasher._createHelper(SHA1);

	    /**
	     * Shortcut function to the HMAC's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     * @param {WordArray|string} key The secret key.
	     *
	     * @return {WordArray} The HMAC.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hmac = CryptoJS.HmacSHA1(message, key);
	     */
	    C.HmacSHA1 = Hasher._createHmacHelper(SHA1);
	}());


	(function (Math) {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var Hasher = C_lib.Hasher;
	    var C_algo = C.algo;

	    // Initialization and round constants tables
	    var H = [];
	    var K = [];

	    // Compute constants
	    (function () {
	        function isPrime(n) {
	            var sqrtN = Math.sqrt(n);
	            for (var factor = 2; factor <= sqrtN; factor++) {
	                if (!(n % factor)) {
	                    return false;
	                }
	            }

	            return true;
	        }

	        function getFractionalBits(n) {
	            return ((n - (n | 0)) * 0x100000000) | 0;
	        }

	        var n = 2;
	        var nPrime = 0;
	        while (nPrime < 64) {
	            if (isPrime(n)) {
	                if (nPrime < 8) {
	                    H[nPrime] = getFractionalBits(Math.pow(n, 1 / 2));
	                }
	                K[nPrime] = getFractionalBits(Math.pow(n, 1 / 3));

	                nPrime++;
	            }

	            n++;
	        }
	    }());

	    // Reusable object
	    var W = [];

	    /**
	     * SHA-256 hash algorithm.
	     */
	    var SHA256 = C_algo.SHA256 = Hasher.extend({
	        _doReset: function () {
	            this._hash = new WordArray.init(H.slice(0));
	        },

	        _doProcessBlock: function (M, offset) {
	            // Shortcut
	            var H = this._hash.words;

	            // Working variables
	            var a = H[0];
	            var b = H[1];
	            var c = H[2];
	            var d = H[3];
	            var e = H[4];
	            var f = H[5];
	            var g = H[6];
	            var h = H[7];

	            // Computation
	            for (var i = 0; i < 64; i++) {
	                if (i < 16) {
	                    W[i] = M[offset + i] | 0;
	                } else {
	                    var gamma0x = W[i - 15];
	                    var gamma0  = ((gamma0x << 25) | (gamma0x >>> 7))  ^
	                                  ((gamma0x << 14) | (gamma0x >>> 18)) ^
	                                   (gamma0x >>> 3);

	                    var gamma1x = W[i - 2];
	                    var gamma1  = ((gamma1x << 15) | (gamma1x >>> 17)) ^
	                                  ((gamma1x << 13) | (gamma1x >>> 19)) ^
	                                   (gamma1x >>> 10);

	                    W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16];
	                }

	                var ch  = (e & f) ^ (~e & g);
	                var maj = (a & b) ^ (a & c) ^ (b & c);

	                var sigma0 = ((a << 30) | (a >>> 2)) ^ ((a << 19) | (a >>> 13)) ^ ((a << 10) | (a >>> 22));
	                var sigma1 = ((e << 26) | (e >>> 6)) ^ ((e << 21) | (e >>> 11)) ^ ((e << 7)  | (e >>> 25));

	                var t1 = h + sigma1 + ch + K[i] + W[i];
	                var t2 = sigma0 + maj;

	                h = g;
	                g = f;
	                f = e;
	                e = (d + t1) | 0;
	                d = c;
	                c = b;
	                b = a;
	                a = (t1 + t2) | 0;
	            }

	            // Intermediate hash value
	            H[0] = (H[0] + a) | 0;
	            H[1] = (H[1] + b) | 0;
	            H[2] = (H[2] + c) | 0;
	            H[3] = (H[3] + d) | 0;
	            H[4] = (H[4] + e) | 0;
	            H[5] = (H[5] + f) | 0;
	            H[6] = (H[6] + g) | 0;
	            H[7] = (H[7] + h) | 0;
	        },

	        _doFinalize: function () {
	            // Shortcuts
	            var data = this._data;
	            var dataWords = data.words;

	            var nBitsTotal = this._nDataBytes * 8;
	            var nBitsLeft = data.sigBytes * 8;

	            // Add padding
	            dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
	            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 14] = Math.floor(nBitsTotal / 0x100000000);
	            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 15] = nBitsTotal;
	            data.sigBytes = dataWords.length * 4;

	            // Hash final blocks
	            this._process();

	            // Return final computed hash
	            return this._hash;
	        },

	        clone: function () {
	            var clone = Hasher.clone.call(this);
	            clone._hash = this._hash.clone();

	            return clone;
	        }
	    });

	    /**
	     * Shortcut function to the hasher's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     *
	     * @return {WordArray} The hash.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hash = CryptoJS.SHA256('message');
	     *     var hash = CryptoJS.SHA256(wordArray);
	     */
	    C.SHA256 = Hasher._createHelper(SHA256);

	    /**
	     * Shortcut function to the HMAC's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     * @param {WordArray|string} key The secret key.
	     *
	     * @return {WordArray} The HMAC.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hmac = CryptoJS.HmacSHA256(message, key);
	     */
	    C.HmacSHA256 = Hasher._createHmacHelper(SHA256);
	}(Math));


	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var C_algo = C.algo;
	    var SHA256 = C_algo.SHA256;

	    /**
	     * SHA-224 hash algorithm.
	     */
	    var SHA224 = C_algo.SHA224 = SHA256.extend({
	        _doReset: function () {
	            this._hash = new WordArray.init([
	                0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939,
	                0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4
	            ]);
	        },

	        _doFinalize: function () {
	            var hash = SHA256._doFinalize.call(this);

	            hash.sigBytes -= 4;

	            return hash;
	        }
	    });

	    /**
	     * Shortcut function to the hasher's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     *
	     * @return {WordArray} The hash.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hash = CryptoJS.SHA224('message');
	     *     var hash = CryptoJS.SHA224(wordArray);
	     */
	    C.SHA224 = SHA256._createHelper(SHA224);

	    /**
	     * Shortcut function to the HMAC's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     * @param {WordArray|string} key The secret key.
	     *
	     * @return {WordArray} The HMAC.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hmac = CryptoJS.HmacSHA224(message, key);
	     */
	    C.HmacSHA224 = SHA256._createHmacHelper(SHA224);
	}());


	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var Hasher = C_lib.Hasher;
	    var C_x64 = C.x64;
	    var X64Word = C_x64.Word;
	    var X64WordArray = C_x64.WordArray;
	    var C_algo = C.algo;

	    function X64Word_create() {
	        return X64Word.create.apply(X64Word, arguments);
	    }

	    // Constants
	    var K = [
	        X64Word_create(0x428a2f98, 0xd728ae22), X64Word_create(0x71374491, 0x23ef65cd),
	        X64Word_create(0xb5c0fbcf, 0xec4d3b2f), X64Word_create(0xe9b5dba5, 0x8189dbbc),
	        X64Word_create(0x3956c25b, 0xf348b538), X64Word_create(0x59f111f1, 0xb605d019),
	        X64Word_create(0x923f82a4, 0xaf194f9b), X64Word_create(0xab1c5ed5, 0xda6d8118),
	        X64Word_create(0xd807aa98, 0xa3030242), X64Word_create(0x12835b01, 0x45706fbe),
	        X64Word_create(0x243185be, 0x4ee4b28c), X64Word_create(0x550c7dc3, 0xd5ffb4e2),
	        X64Word_create(0x72be5d74, 0xf27b896f), X64Word_create(0x80deb1fe, 0x3b1696b1),
	        X64Word_create(0x9bdc06a7, 0x25c71235), X64Word_create(0xc19bf174, 0xcf692694),
	        X64Word_create(0xe49b69c1, 0x9ef14ad2), X64Word_create(0xefbe4786, 0x384f25e3),
	        X64Word_create(0x0fc19dc6, 0x8b8cd5b5), X64Word_create(0x240ca1cc, 0x77ac9c65),
	        X64Word_create(0x2de92c6f, 0x592b0275), X64Word_create(0x4a7484aa, 0x6ea6e483),
	        X64Word_create(0x5cb0a9dc, 0xbd41fbd4), X64Word_create(0x76f988da, 0x831153b5),
	        X64Word_create(0x983e5152, 0xee66dfab), X64Word_create(0xa831c66d, 0x2db43210),
	        X64Word_create(0xb00327c8, 0x98fb213f), X64Word_create(0xbf597fc7, 0xbeef0ee4),
	        X64Word_create(0xc6e00bf3, 0x3da88fc2), X64Word_create(0xd5a79147, 0x930aa725),
	        X64Word_create(0x06ca6351, 0xe003826f), X64Word_create(0x14292967, 0x0a0e6e70),
	        X64Word_create(0x27b70a85, 0x46d22ffc), X64Word_create(0x2e1b2138, 0x5c26c926),
	        X64Word_create(0x4d2c6dfc, 0x5ac42aed), X64Word_create(0x53380d13, 0x9d95b3df),
	        X64Word_create(0x650a7354, 0x8baf63de), X64Word_create(0x766a0abb, 0x3c77b2a8),
	        X64Word_create(0x81c2c92e, 0x47edaee6), X64Word_create(0x92722c85, 0x1482353b),
	        X64Word_create(0xa2bfe8a1, 0x4cf10364), X64Word_create(0xa81a664b, 0xbc423001),
	        X64Word_create(0xc24b8b70, 0xd0f89791), X64Word_create(0xc76c51a3, 0x0654be30),
	        X64Word_create(0xd192e819, 0xd6ef5218), X64Word_create(0xd6990624, 0x5565a910),
	        X64Word_create(0xf40e3585, 0x5771202a), X64Word_create(0x106aa070, 0x32bbd1b8),
	        X64Word_create(0x19a4c116, 0xb8d2d0c8), X64Word_create(0x1e376c08, 0x5141ab53),
	        X64Word_create(0x2748774c, 0xdf8eeb99), X64Word_create(0x34b0bcb5, 0xe19b48a8),
	        X64Word_create(0x391c0cb3, 0xc5c95a63), X64Word_create(0x4ed8aa4a, 0xe3418acb),
	        X64Word_create(0x5b9cca4f, 0x7763e373), X64Word_create(0x682e6ff3, 0xd6b2b8a3),
	        X64Word_create(0x748f82ee, 0x5defb2fc), X64Word_create(0x78a5636f, 0x43172f60),
	        X64Word_create(0x84c87814, 0xa1f0ab72), X64Word_create(0x8cc70208, 0x1a6439ec),
	        X64Word_create(0x90befffa, 0x23631e28), X64Word_create(0xa4506ceb, 0xde82bde9),
	        X64Word_create(0xbef9a3f7, 0xb2c67915), X64Word_create(0xc67178f2, 0xe372532b),
	        X64Word_create(0xca273ece, 0xea26619c), X64Word_create(0xd186b8c7, 0x21c0c207),
	        X64Word_create(0xeada7dd6, 0xcde0eb1e), X64Word_create(0xf57d4f7f, 0xee6ed178),
	        X64Word_create(0x06f067aa, 0x72176fba), X64Word_create(0x0a637dc5, 0xa2c898a6),
	        X64Word_create(0x113f9804, 0xbef90dae), X64Word_create(0x1b710b35, 0x131c471b),
	        X64Word_create(0x28db77f5, 0x23047d84), X64Word_create(0x32caab7b, 0x40c72493),
	        X64Word_create(0x3c9ebe0a, 0x15c9bebc), X64Word_create(0x431d67c4, 0x9c100d4c),
	        X64Word_create(0x4cc5d4be, 0xcb3e42b6), X64Word_create(0x597f299c, 0xfc657e2a),
	        X64Word_create(0x5fcb6fab, 0x3ad6faec), X64Word_create(0x6c44198c, 0x4a475817)
	    ];

	    // Reusable objects
	    var W = [];
	    (function () {
	        for (var i = 0; i < 80; i++) {
	            W[i] = X64Word_create();
	        }
	    }());

	    /**
	     * SHA-512 hash algorithm.
	     */
	    var SHA512 = C_algo.SHA512 = Hasher.extend({
	        _doReset: function () {
	            this._hash = new X64WordArray.init([
	                new X64Word.init(0x6a09e667, 0xf3bcc908), new X64Word.init(0xbb67ae85, 0x84caa73b),
	                new X64Word.init(0x3c6ef372, 0xfe94f82b), new X64Word.init(0xa54ff53a, 0x5f1d36f1),
	                new X64Word.init(0x510e527f, 0xade682d1), new X64Word.init(0x9b05688c, 0x2b3e6c1f),
	                new X64Word.init(0x1f83d9ab, 0xfb41bd6b), new X64Word.init(0x5be0cd19, 0x137e2179)
	            ]);
	        },

	        _doProcessBlock: function (M, offset) {
	            // Shortcuts
	            var H = this._hash.words;

	            var H0 = H[0];
	            var H1 = H[1];
	            var H2 = H[2];
	            var H3 = H[3];
	            var H4 = H[4];
	            var H5 = H[5];
	            var H6 = H[6];
	            var H7 = H[7];

	            var H0h = H0.high;
	            var H0l = H0.low;
	            var H1h = H1.high;
	            var H1l = H1.low;
	            var H2h = H2.high;
	            var H2l = H2.low;
	            var H3h = H3.high;
	            var H3l = H3.low;
	            var H4h = H4.high;
	            var H4l = H4.low;
	            var H5h = H5.high;
	            var H5l = H5.low;
	            var H6h = H6.high;
	            var H6l = H6.low;
	            var H7h = H7.high;
	            var H7l = H7.low;

	            // Working variables
	            var ah = H0h;
	            var al = H0l;
	            var bh = H1h;
	            var bl = H1l;
	            var ch = H2h;
	            var cl = H2l;
	            var dh = H3h;
	            var dl = H3l;
	            var eh = H4h;
	            var el = H4l;
	            var fh = H5h;
	            var fl = H5l;
	            var gh = H6h;
	            var gl = H6l;
	            var hh = H7h;
	            var hl = H7l;

	            // Rounds
	            for (var i = 0; i < 80; i++) {
	                var Wil;
	                var Wih;

	                // Shortcut
	                var Wi = W[i];

	                // Extend message
	                if (i < 16) {
	                    Wih = Wi.high = M[offset + i * 2]     | 0;
	                    Wil = Wi.low  = M[offset + i * 2 + 1] | 0;
	                } else {
	                    // Gamma0
	                    var gamma0x  = W[i - 15];
	                    var gamma0xh = gamma0x.high;
	                    var gamma0xl = gamma0x.low;
	                    var gamma0h  = ((gamma0xh >>> 1) | (gamma0xl << 31)) ^ ((gamma0xh >>> 8) | (gamma0xl << 24)) ^ (gamma0xh >>> 7);
	                    var gamma0l  = ((gamma0xl >>> 1) | (gamma0xh << 31)) ^ ((gamma0xl >>> 8) | (gamma0xh << 24)) ^ ((gamma0xl >>> 7) | (gamma0xh << 25));

	                    // Gamma1
	                    var gamma1x  = W[i - 2];
	                    var gamma1xh = gamma1x.high;
	                    var gamma1xl = gamma1x.low;
	                    var gamma1h  = ((gamma1xh >>> 19) | (gamma1xl << 13)) ^ ((gamma1xh << 3) | (gamma1xl >>> 29)) ^ (gamma1xh >>> 6);
	                    var gamma1l  = ((gamma1xl >>> 19) | (gamma1xh << 13)) ^ ((gamma1xl << 3) | (gamma1xh >>> 29)) ^ ((gamma1xl >>> 6) | (gamma1xh << 26));

	                    // W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16]
	                    var Wi7  = W[i - 7];
	                    var Wi7h = Wi7.high;
	                    var Wi7l = Wi7.low;

	                    var Wi16  = W[i - 16];
	                    var Wi16h = Wi16.high;
	                    var Wi16l = Wi16.low;

	                    Wil = gamma0l + Wi7l;
	                    Wih = gamma0h + Wi7h + ((Wil >>> 0) < (gamma0l >>> 0) ? 1 : 0);
	                    Wil = Wil + gamma1l;
	                    Wih = Wih + gamma1h + ((Wil >>> 0) < (gamma1l >>> 0) ? 1 : 0);
	                    Wil = Wil + Wi16l;
	                    Wih = Wih + Wi16h + ((Wil >>> 0) < (Wi16l >>> 0) ? 1 : 0);

	                    Wi.high = Wih;
	                    Wi.low  = Wil;
	                }

	                var chh  = (eh & fh) ^ (~eh & gh);
	                var chl  = (el & fl) ^ (~el & gl);
	                var majh = (ah & bh) ^ (ah & ch) ^ (bh & ch);
	                var majl = (al & bl) ^ (al & cl) ^ (bl & cl);

	                var sigma0h = ((ah >>> 28) | (al << 4))  ^ ((ah << 30)  | (al >>> 2)) ^ ((ah << 25) | (al >>> 7));
	                var sigma0l = ((al >>> 28) | (ah << 4))  ^ ((al << 30)  | (ah >>> 2)) ^ ((al << 25) | (ah >>> 7));
	                var sigma1h = ((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9));
	                var sigma1l = ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9));

	                // t1 = h + sigma1 + ch + K[i] + W[i]
	                var Ki  = K[i];
	                var Kih = Ki.high;
	                var Kil = Ki.low;

	                var t1l = hl + sigma1l;
	                var t1h = hh + sigma1h + ((t1l >>> 0) < (hl >>> 0) ? 1 : 0);
	                var t1l = t1l + chl;
	                var t1h = t1h + chh + ((t1l >>> 0) < (chl >>> 0) ? 1 : 0);
	                var t1l = t1l + Kil;
	                var t1h = t1h + Kih + ((t1l >>> 0) < (Kil >>> 0) ? 1 : 0);
	                var t1l = t1l + Wil;
	                var t1h = t1h + Wih + ((t1l >>> 0) < (Wil >>> 0) ? 1 : 0);

	                // t2 = sigma0 + maj
	                var t2l = sigma0l + majl;
	                var t2h = sigma0h + majh + ((t2l >>> 0) < (sigma0l >>> 0) ? 1 : 0);

	                // Update working variables
	                hh = gh;
	                hl = gl;
	                gh = fh;
	                gl = fl;
	                fh = eh;
	                fl = el;
	                el = (dl + t1l) | 0;
	                eh = (dh + t1h + ((el >>> 0) < (dl >>> 0) ? 1 : 0)) | 0;
	                dh = ch;
	                dl = cl;
	                ch = bh;
	                cl = bl;
	                bh = ah;
	                bl = al;
	                al = (t1l + t2l) | 0;
	                ah = (t1h + t2h + ((al >>> 0) < (t1l >>> 0) ? 1 : 0)) | 0;
	            }

	            // Intermediate hash value
	            H0l = H0.low  = (H0l + al);
	            H0.high = (H0h + ah + ((H0l >>> 0) < (al >>> 0) ? 1 : 0));
	            H1l = H1.low  = (H1l + bl);
	            H1.high = (H1h + bh + ((H1l >>> 0) < (bl >>> 0) ? 1 : 0));
	            H2l = H2.low  = (H2l + cl);
	            H2.high = (H2h + ch + ((H2l >>> 0) < (cl >>> 0) ? 1 : 0));
	            H3l = H3.low  = (H3l + dl);
	            H3.high = (H3h + dh + ((H3l >>> 0) < (dl >>> 0) ? 1 : 0));
	            H4l = H4.low  = (H4l + el);
	            H4.high = (H4h + eh + ((H4l >>> 0) < (el >>> 0) ? 1 : 0));
	            H5l = H5.low  = (H5l + fl);
	            H5.high = (H5h + fh + ((H5l >>> 0) < (fl >>> 0) ? 1 : 0));
	            H6l = H6.low  = (H6l + gl);
	            H6.high = (H6h + gh + ((H6l >>> 0) < (gl >>> 0) ? 1 : 0));
	            H7l = H7.low  = (H7l + hl);
	            H7.high = (H7h + hh + ((H7l >>> 0) < (hl >>> 0) ? 1 : 0));
	        },

	        _doFinalize: function () {
	            // Shortcuts
	            var data = this._data;
	            var dataWords = data.words;

	            var nBitsTotal = this._nDataBytes * 8;
	            var nBitsLeft = data.sigBytes * 8;

	            // Add padding
	            dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
	            dataWords[(((nBitsLeft + 128) >>> 10) << 5) + 30] = Math.floor(nBitsTotal / 0x100000000);
	            dataWords[(((nBitsLeft + 128) >>> 10) << 5) + 31] = nBitsTotal;
	            data.sigBytes = dataWords.length * 4;

	            // Hash final blocks
	            this._process();

	            // Convert hash to 32-bit word array before returning
	            var hash = this._hash.toX32();

	            // Return final computed hash
	            return hash;
	        },

	        clone: function () {
	            var clone = Hasher.clone.call(this);
	            clone._hash = this._hash.clone();

	            return clone;
	        },

	        blockSize: 1024/32
	    });

	    /**
	     * Shortcut function to the hasher's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     *
	     * @return {WordArray} The hash.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hash = CryptoJS.SHA512('message');
	     *     var hash = CryptoJS.SHA512(wordArray);
	     */
	    C.SHA512 = Hasher._createHelper(SHA512);

	    /**
	     * Shortcut function to the HMAC's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     * @param {WordArray|string} key The secret key.
	     *
	     * @return {WordArray} The HMAC.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hmac = CryptoJS.HmacSHA512(message, key);
	     */
	    C.HmacSHA512 = Hasher._createHmacHelper(SHA512);
	}());


	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_x64 = C.x64;
	    var X64Word = C_x64.Word;
	    var X64WordArray = C_x64.WordArray;
	    var C_algo = C.algo;
	    var SHA512 = C_algo.SHA512;

	    /**
	     * SHA-384 hash algorithm.
	     */
	    var SHA384 = C_algo.SHA384 = SHA512.extend({
	        _doReset: function () {
	            this._hash = new X64WordArray.init([
	                new X64Word.init(0xcbbb9d5d, 0xc1059ed8), new X64Word.init(0x629a292a, 0x367cd507),
	                new X64Word.init(0x9159015a, 0x3070dd17), new X64Word.init(0x152fecd8, 0xf70e5939),
	                new X64Word.init(0x67332667, 0xffc00b31), new X64Word.init(0x8eb44a87, 0x68581511),
	                new X64Word.init(0xdb0c2e0d, 0x64f98fa7), new X64Word.init(0x47b5481d, 0xbefa4fa4)
	            ]);
	        },

	        _doFinalize: function () {
	            var hash = SHA512._doFinalize.call(this);

	            hash.sigBytes -= 16;

	            return hash;
	        }
	    });

	    /**
	     * Shortcut function to the hasher's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     *
	     * @return {WordArray} The hash.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hash = CryptoJS.SHA384('message');
	     *     var hash = CryptoJS.SHA384(wordArray);
	     */
	    C.SHA384 = SHA512._createHelper(SHA384);

	    /**
	     * Shortcut function to the HMAC's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     * @param {WordArray|string} key The secret key.
	     *
	     * @return {WordArray} The HMAC.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hmac = CryptoJS.HmacSHA384(message, key);
	     */
	    C.HmacSHA384 = SHA512._createHmacHelper(SHA384);
	}());


	(function (Math) {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var Hasher = C_lib.Hasher;
	    var C_x64 = C.x64;
	    var X64Word = C_x64.Word;
	    var C_algo = C.algo;

	    // Constants tables
	    var RHO_OFFSETS = [];
	    var PI_INDEXES  = [];
	    var ROUND_CONSTANTS = [];

	    // Compute Constants
	    (function () {
	        // Compute rho offset constants
	        var x = 1, y = 0;
	        for (var t = 0; t < 24; t++) {
	            RHO_OFFSETS[x + 5 * y] = ((t + 1) * (t + 2) / 2) % 64;

	            var newX = y % 5;
	            var newY = (2 * x + 3 * y) % 5;
	            x = newX;
	            y = newY;
	        }

	        // Compute pi index constants
	        for (var x = 0; x < 5; x++) {
	            for (var y = 0; y < 5; y++) {
	                PI_INDEXES[x + 5 * y] = y + ((2 * x + 3 * y) % 5) * 5;
	            }
	        }

	        // Compute round constants
	        var LFSR = 0x01;
	        for (var i = 0; i < 24; i++) {
	            var roundConstantMsw = 0;
	            var roundConstantLsw = 0;

	            for (var j = 0; j < 7; j++) {
	                if (LFSR & 0x01) {
	                    var bitPosition = (1 << j) - 1;
	                    if (bitPosition < 32) {
	                        roundConstantLsw ^= 1 << bitPosition;
	                    } else /* if (bitPosition >= 32) */ {
	                        roundConstantMsw ^= 1 << (bitPosition - 32);
	                    }
	                }

	                // Compute next LFSR
	                if (LFSR & 0x80) {
	                    // Primitive polynomial over GF(2): x^8 + x^6 + x^5 + x^4 + 1
	                    LFSR = (LFSR << 1) ^ 0x71;
	                } else {
	                    LFSR <<= 1;
	                }
	            }

	            ROUND_CONSTANTS[i] = X64Word.create(roundConstantMsw, roundConstantLsw);
	        }
	    }());

	    // Reusable objects for temporary values
	    var T = [];
	    (function () {
	        for (var i = 0; i < 25; i++) {
	            T[i] = X64Word.create();
	        }
	    }());

	    /**
	     * SHA-3 hash algorithm.
	     */
	    var SHA3 = C_algo.SHA3 = Hasher.extend({
	        /**
	         * Configuration options.
	         *
	         * @property {number} outputLength
	         *   The desired number of bits in the output hash.
	         *   Only values permitted are: 224, 256, 384, 512.
	         *   Default: 512
	         */
	        cfg: Hasher.cfg.extend({
	            outputLength: 512
	        }),

	        _doReset: function () {
	            var state = this._state = []
	            for (var i = 0; i < 25; i++) {
	                state[i] = new X64Word.init();
	            }

	            this.blockSize = (1600 - 2 * this.cfg.outputLength) / 32;
	        },

	        _doProcessBlock: function (M, offset) {
	            // Shortcuts
	            var state = this._state;
	            var nBlockSizeLanes = this.blockSize / 2;

	            // Absorb
	            for (var i = 0; i < nBlockSizeLanes; i++) {
	                // Shortcuts
	                var M2i  = M[offset + 2 * i];
	                var M2i1 = M[offset + 2 * i + 1];

	                // Swap endian
	                M2i = (
	                    (((M2i << 8)  | (M2i >>> 24)) & 0x00ff00ff) |
	                    (((M2i << 24) | (M2i >>> 8))  & 0xff00ff00)
	                );
	                M2i1 = (
	                    (((M2i1 << 8)  | (M2i1 >>> 24)) & 0x00ff00ff) |
	                    (((M2i1 << 24) | (M2i1 >>> 8))  & 0xff00ff00)
	                );

	                // Absorb message into state
	                var lane = state[i];
	                lane.high ^= M2i1;
	                lane.low  ^= M2i;
	            }

	            // Rounds
	            for (var round = 0; round < 24; round++) {
	                // Theta
	                for (var x = 0; x < 5; x++) {
	                    // Mix column lanes
	                    var tMsw = 0, tLsw = 0;
	                    for (var y = 0; y < 5; y++) {
	                        var lane = state[x + 5 * y];
	                        tMsw ^= lane.high;
	                        tLsw ^= lane.low;
	                    }

	                    // Temporary values
	                    var Tx = T[x];
	                    Tx.high = tMsw;
	                    Tx.low  = tLsw;
	                }
	                for (var x = 0; x < 5; x++) {
	                    // Shortcuts
	                    var Tx4 = T[(x + 4) % 5];
	                    var Tx1 = T[(x + 1) % 5];
	                    var Tx1Msw = Tx1.high;
	                    var Tx1Lsw = Tx1.low;

	                    // Mix surrounding columns
	                    var tMsw = Tx4.high ^ ((Tx1Msw << 1) | (Tx1Lsw >>> 31));
	                    var tLsw = Tx4.low  ^ ((Tx1Lsw << 1) | (Tx1Msw >>> 31));
	                    for (var y = 0; y < 5; y++) {
	                        var lane = state[x + 5 * y];
	                        lane.high ^= tMsw;
	                        lane.low  ^= tLsw;
	                    }
	                }

	                // Rho Pi
	                for (var laneIndex = 1; laneIndex < 25; laneIndex++) {
	                    var tMsw;
	                    var tLsw;

	                    // Shortcuts
	                    var lane = state[laneIndex];
	                    var laneMsw = lane.high;
	                    var laneLsw = lane.low;
	                    var rhoOffset = RHO_OFFSETS[laneIndex];

	                    // Rotate lanes
	                    if (rhoOffset < 32) {
	                        tMsw = (laneMsw << rhoOffset) | (laneLsw >>> (32 - rhoOffset));
	                        tLsw = (laneLsw << rhoOffset) | (laneMsw >>> (32 - rhoOffset));
	                    } else /* if (rhoOffset >= 32) */ {
	                        tMsw = (laneLsw << (rhoOffset - 32)) | (laneMsw >>> (64 - rhoOffset));
	                        tLsw = (laneMsw << (rhoOffset - 32)) | (laneLsw >>> (64 - rhoOffset));
	                    }

	                    // Transpose lanes
	                    var TPiLane = T[PI_INDEXES[laneIndex]];
	                    TPiLane.high = tMsw;
	                    TPiLane.low  = tLsw;
	                }

	                // Rho pi at x = y = 0
	                var T0 = T[0];
	                var state0 = state[0];
	                T0.high = state0.high;
	                T0.low  = state0.low;

	                // Chi
	                for (var x = 0; x < 5; x++) {
	                    for (var y = 0; y < 5; y++) {
	                        // Shortcuts
	                        var laneIndex = x + 5 * y;
	                        var lane = state[laneIndex];
	                        var TLane = T[laneIndex];
	                        var Tx1Lane = T[((x + 1) % 5) + 5 * y];
	                        var Tx2Lane = T[((x + 2) % 5) + 5 * y];

	                        // Mix rows
	                        lane.high = TLane.high ^ (~Tx1Lane.high & Tx2Lane.high);
	                        lane.low  = TLane.low  ^ (~Tx1Lane.low  & Tx2Lane.low);
	                    }
	                }

	                // Iota
	                var lane = state[0];
	                var roundConstant = ROUND_CONSTANTS[round];
	                lane.high ^= roundConstant.high;
	                lane.low  ^= roundConstant.low;
	            }
	        },

	        _doFinalize: function () {
	            // Shortcuts
	            var data = this._data;
	            var dataWords = data.words;
	            var nBitsTotal = this._nDataBytes * 8;
	            var nBitsLeft = data.sigBytes * 8;
	            var blockSizeBits = this.blockSize * 32;

	            // Add padding
	            dataWords[nBitsLeft >>> 5] |= 0x1 << (24 - nBitsLeft % 32);
	            dataWords[((Math.ceil((nBitsLeft + 1) / blockSizeBits) * blockSizeBits) >>> 5) - 1] |= 0x80;
	            data.sigBytes = dataWords.length * 4;

	            // Hash final blocks
	            this._process();

	            // Shortcuts
	            var state = this._state;
	            var outputLengthBytes = this.cfg.outputLength / 8;
	            var outputLengthLanes = outputLengthBytes / 8;

	            // Squeeze
	            var hashWords = [];
	            for (var i = 0; i < outputLengthLanes; i++) {
	                // Shortcuts
	                var lane = state[i];
	                var laneMsw = lane.high;
	                var laneLsw = lane.low;

	                // Swap endian
	                laneMsw = (
	                    (((laneMsw << 8)  | (laneMsw >>> 24)) & 0x00ff00ff) |
	                    (((laneMsw << 24) | (laneMsw >>> 8))  & 0xff00ff00)
	                );
	                laneLsw = (
	                    (((laneLsw << 8)  | (laneLsw >>> 24)) & 0x00ff00ff) |
	                    (((laneLsw << 24) | (laneLsw >>> 8))  & 0xff00ff00)
	                );

	                // Squeeze state to retrieve hash
	                hashWords.push(laneLsw);
	                hashWords.push(laneMsw);
	            }

	            // Return final computed hash
	            return new WordArray.init(hashWords, outputLengthBytes);
	        },

	        clone: function () {
	            var clone = Hasher.clone.call(this);

	            var state = clone._state = this._state.slice(0);
	            for (var i = 0; i < 25; i++) {
	                state[i] = state[i].clone();
	            }

	            return clone;
	        }
	    });

	    /**
	     * Shortcut function to the hasher's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     *
	     * @return {WordArray} The hash.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hash = CryptoJS.SHA3('message');
	     *     var hash = CryptoJS.SHA3(wordArray);
	     */
	    C.SHA3 = Hasher._createHelper(SHA3);

	    /**
	     * Shortcut function to the HMAC's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     * @param {WordArray|string} key The secret key.
	     *
	     * @return {WordArray} The HMAC.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hmac = CryptoJS.HmacSHA3(message, key);
	     */
	    C.HmacSHA3 = Hasher._createHmacHelper(SHA3);
	}(Math));


	/** @preserve
	(c) 2012 by Cédric Mesnil. All rights reserved.

	Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

	    - Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
	    - Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

	THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	*/

	(function (Math) {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var Hasher = C_lib.Hasher;
	    var C_algo = C.algo;

	    // Constants table
	    var _zl = WordArray.create([
	        0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15,
	        7,  4, 13,  1, 10,  6, 15,  3, 12,  0,  9,  5,  2, 14, 11,  8,
	        3, 10, 14,  4,  9, 15,  8,  1,  2,  7,  0,  6, 13, 11,  5, 12,
	        1,  9, 11, 10,  0,  8, 12,  4, 13,  3,  7, 15, 14,  5,  6,  2,
	        4,  0,  5,  9,  7, 12,  2, 10, 14,  1,  3,  8, 11,  6, 15, 13]);
	    var _zr = WordArray.create([
	        5, 14,  7,  0,  9,  2, 11,  4, 13,  6, 15,  8,  1, 10,  3, 12,
	        6, 11,  3,  7,  0, 13,  5, 10, 14, 15,  8, 12,  4,  9,  1,  2,
	        15,  5,  1,  3,  7, 14,  6,  9, 11,  8, 12,  2, 10,  0,  4, 13,
	        8,  6,  4,  1,  3, 11, 15,  0,  5, 12,  2, 13,  9,  7, 10, 14,
	        12, 15, 10,  4,  1,  5,  8,  7,  6,  2, 13, 14,  0,  3,  9, 11]);
	    var _sl = WordArray.create([
	         11, 14, 15, 12,  5,  8,  7,  9, 11, 13, 14, 15,  6,  7,  9,  8,
	        7, 6,   8, 13, 11,  9,  7, 15,  7, 12, 15,  9, 11,  7, 13, 12,
	        11, 13,  6,  7, 14,  9, 13, 15, 14,  8, 13,  6,  5, 12,  7,  5,
	          11, 12, 14, 15, 14, 15,  9,  8,  9, 14,  5,  6,  8,  6,  5, 12,
	        9, 15,  5, 11,  6,  8, 13, 12,  5, 12, 13, 14, 11,  8,  5,  6 ]);
	    var _sr = WordArray.create([
	        8,  9,  9, 11, 13, 15, 15,  5,  7,  7,  8, 11, 14, 14, 12,  6,
	        9, 13, 15,  7, 12,  8,  9, 11,  7,  7, 12,  7,  6, 15, 13, 11,
	        9,  7, 15, 11,  8,  6,  6, 14, 12, 13,  5, 14, 13, 13,  7,  5,
	        15,  5,  8, 11, 14, 14,  6, 14,  6,  9, 12,  9, 12,  5, 15,  8,
	        8,  5, 12,  9, 12,  5, 14,  6,  8, 13,  6,  5, 15, 13, 11, 11 ]);

	    var _hl =  WordArray.create([ 0x00000000, 0x5A827999, 0x6ED9EBA1, 0x8F1BBCDC, 0xA953FD4E]);
	    var _hr =  WordArray.create([ 0x50A28BE6, 0x5C4DD124, 0x6D703EF3, 0x7A6D76E9, 0x00000000]);

	    /**
	     * RIPEMD160 hash algorithm.
	     */
	    var RIPEMD160 = C_algo.RIPEMD160 = Hasher.extend({
	        _doReset: function () {
	            this._hash  = WordArray.create([0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0]);
	        },

	        _doProcessBlock: function (M, offset) {

	            // Swap endian
	            for (var i = 0; i < 16; i++) {
	                // Shortcuts
	                var offset_i = offset + i;
	                var M_offset_i = M[offset_i];

	                // Swap
	                M[offset_i] = (
	                    (((M_offset_i << 8)  | (M_offset_i >>> 24)) & 0x00ff00ff) |
	                    (((M_offset_i << 24) | (M_offset_i >>> 8))  & 0xff00ff00)
	                );
	            }
	            // Shortcut
	            var H  = this._hash.words;
	            var hl = _hl.words;
	            var hr = _hr.words;
	            var zl = _zl.words;
	            var zr = _zr.words;
	            var sl = _sl.words;
	            var sr = _sr.words;

	            // Working variables
	            var al, bl, cl, dl, el;
	            var ar, br, cr, dr, er;

	            ar = al = H[0];
	            br = bl = H[1];
	            cr = cl = H[2];
	            dr = dl = H[3];
	            er = el = H[4];
	            // Computation
	            var t;
	            for (var i = 0; i < 80; i += 1) {
	                t = (al +  M[offset+zl[i]])|0;
	                if (i<16){
		            t +=  f1(bl,cl,dl) + hl[0];
	                } else if (i<32) {
		            t +=  f2(bl,cl,dl) + hl[1];
	                } else if (i<48) {
		            t +=  f3(bl,cl,dl) + hl[2];
	                } else if (i<64) {
		            t +=  f4(bl,cl,dl) + hl[3];
	                } else {// if (i<80) {
		            t +=  f5(bl,cl,dl) + hl[4];
	                }
	                t = t|0;
	                t =  rotl(t,sl[i]);
	                t = (t+el)|0;
	                al = el;
	                el = dl;
	                dl = rotl(cl, 10);
	                cl = bl;
	                bl = t;

	                t = (ar + M[offset+zr[i]])|0;
	                if (i<16){
		            t +=  f5(br,cr,dr) + hr[0];
	                } else if (i<32) {
		            t +=  f4(br,cr,dr) + hr[1];
	                } else if (i<48) {
		            t +=  f3(br,cr,dr) + hr[2];
	                } else if (i<64) {
		            t +=  f2(br,cr,dr) + hr[3];
	                } else {// if (i<80) {
		            t +=  f1(br,cr,dr) + hr[4];
	                }
	                t = t|0;
	                t =  rotl(t,sr[i]) ;
	                t = (t+er)|0;
	                ar = er;
	                er = dr;
	                dr = rotl(cr, 10);
	                cr = br;
	                br = t;
	            }
	            // Intermediate hash value
	            t    = (H[1] + cl + dr)|0;
	            H[1] = (H[2] + dl + er)|0;
	            H[2] = (H[3] + el + ar)|0;
	            H[3] = (H[4] + al + br)|0;
	            H[4] = (H[0] + bl + cr)|0;
	            H[0] =  t;
	        },

	        _doFinalize: function () {
	            // Shortcuts
	            var data = this._data;
	            var dataWords = data.words;

	            var nBitsTotal = this._nDataBytes * 8;
	            var nBitsLeft = data.sigBytes * 8;

	            // Add padding
	            dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
	            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 14] = (
	                (((nBitsTotal << 8)  | (nBitsTotal >>> 24)) & 0x00ff00ff) |
	                (((nBitsTotal << 24) | (nBitsTotal >>> 8))  & 0xff00ff00)
	            );
	            data.sigBytes = (dataWords.length + 1) * 4;

	            // Hash final blocks
	            this._process();

	            // Shortcuts
	            var hash = this._hash;
	            var H = hash.words;

	            // Swap endian
	            for (var i = 0; i < 5; i++) {
	                // Shortcut
	                var H_i = H[i];

	                // Swap
	                H[i] = (((H_i << 8)  | (H_i >>> 24)) & 0x00ff00ff) |
	                       (((H_i << 24) | (H_i >>> 8))  & 0xff00ff00);
	            }

	            // Return final computed hash
	            return hash;
	        },

	        clone: function () {
	            var clone = Hasher.clone.call(this);
	            clone._hash = this._hash.clone();

	            return clone;
	        }
	    });


	    function f1(x, y, z) {
	        return ((x) ^ (y) ^ (z));

	    }

	    function f2(x, y, z) {
	        return (((x)&(y)) | ((~x)&(z)));
	    }

	    function f3(x, y, z) {
	        return (((x) | (~(y))) ^ (z));
	    }

	    function f4(x, y, z) {
	        return (((x) & (z)) | ((y)&(~(z))));
	    }

	    function f5(x, y, z) {
	        return ((x) ^ ((y) |(~(z))));

	    }

	    function rotl(x,n) {
	        return (x<<n) | (x>>>(32-n));
	    }


	    /**
	     * Shortcut function to the hasher's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     *
	     * @return {WordArray} The hash.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hash = CryptoJS.RIPEMD160('message');
	     *     var hash = CryptoJS.RIPEMD160(wordArray);
	     */
	    C.RIPEMD160 = Hasher._createHelper(RIPEMD160);

	    /**
	     * Shortcut function to the HMAC's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     * @param {WordArray|string} key The secret key.
	     *
	     * @return {WordArray} The HMAC.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hmac = CryptoJS.HmacRIPEMD160(message, key);
	     */
	    C.HmacRIPEMD160 = Hasher._createHmacHelper(RIPEMD160);
	}(Math));


	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var Base = C_lib.Base;
	    var C_enc = C.enc;
	    var Utf8 = C_enc.Utf8;
	    var C_algo = C.algo;

	    /**
	     * HMAC algorithm.
	     */
	    var HMAC = C_algo.HMAC = Base.extend({
	        /**
	         * Initializes a newly created HMAC.
	         *
	         * @param {Hasher} hasher The hash algorithm to use.
	         * @param {WordArray|string} key The secret key.
	         *
	         * @example
	         *
	         *     var hmacHasher = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, key);
	         */
	        init: function (hasher, key) {
	            // Init hasher
	            hasher = this._hasher = new hasher.init();

	            // Convert string to WordArray, else assume WordArray already
	            if (typeof key == 'string') {
	                key = Utf8.parse(key);
	            }

	            // Shortcuts
	            var hasherBlockSize = hasher.blockSize;
	            var hasherBlockSizeBytes = hasherBlockSize * 4;

	            // Allow arbitrary length keys
	            if (key.sigBytes > hasherBlockSizeBytes) {
	                key = hasher.finalize(key);
	            }

	            // Clamp excess bits
	            key.clamp();

	            // Clone key for inner and outer pads
	            var oKey = this._oKey = key.clone();
	            var iKey = this._iKey = key.clone();

	            // Shortcuts
	            var oKeyWords = oKey.words;
	            var iKeyWords = iKey.words;

	            // XOR keys with pad constants
	            for (var i = 0; i < hasherBlockSize; i++) {
	                oKeyWords[i] ^= 0x5c5c5c5c;
	                iKeyWords[i] ^= 0x36363636;
	            }
	            oKey.sigBytes = iKey.sigBytes = hasherBlockSizeBytes;

	            // Set initial values
	            this.reset();
	        },

	        /**
	         * Resets this HMAC to its initial state.
	         *
	         * @example
	         *
	         *     hmacHasher.reset();
	         */
	        reset: function () {
	            // Shortcut
	            var hasher = this._hasher;

	            // Reset
	            hasher.reset();
	            hasher.update(this._iKey);
	        },

	        /**
	         * Updates this HMAC with a message.
	         *
	         * @param {WordArray|string} messageUpdate The message to append.
	         *
	         * @return {HMAC} This HMAC instance.
	         *
	         * @example
	         *
	         *     hmacHasher.update('message');
	         *     hmacHasher.update(wordArray);
	         */
	        update: function (messageUpdate) {
	            this._hasher.update(messageUpdate);

	            // Chainable
	            return this;
	        },

	        /**
	         * Finalizes the HMAC computation.
	         * Note that the finalize operation is effectively a destructive, read-once operation.
	         *
	         * @param {WordArray|string} messageUpdate (Optional) A final message update.
	         *
	         * @return {WordArray} The HMAC.
	         *
	         * @example
	         *
	         *     var hmac = hmacHasher.finalize();
	         *     var hmac = hmacHasher.finalize('message');
	         *     var hmac = hmacHasher.finalize(wordArray);
	         */
	        finalize: function (messageUpdate) {
	            // Shortcut
	            var hasher = this._hasher;

	            // Compute HMAC
	            var innerHash = hasher.finalize(messageUpdate);
	            hasher.reset();
	            var hmac = hasher.finalize(this._oKey.clone().concat(innerHash));

	            return hmac;
	        }
	    });
	}());


	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var Base = C_lib.Base;
	    var WordArray = C_lib.WordArray;
	    var C_algo = C.algo;
	    var SHA256 = C_algo.SHA256;
	    var HMAC = C_algo.HMAC;

	    /**
	     * Password-Based Key Derivation Function 2 algorithm.
	     */
	    var PBKDF2 = C_algo.PBKDF2 = Base.extend({
	        /**
	         * Configuration options.
	         *
	         * @property {number} keySize The key size in words to generate. Default: 4 (128 bits)
	         * @property {Hasher} hasher The hasher to use. Default: SHA256
	         * @property {number} iterations The number of iterations to perform. Default: 250000
	         */
	        cfg: Base.extend({
	            keySize: 128/32,
	            hasher: SHA256,
	            iterations: 250000
	        }),

	        /**
	         * Initializes a newly created key derivation function.
	         *
	         * @param {Object} cfg (Optional) The configuration options to use for the derivation.
	         *
	         * @example
	         *
	         *     var kdf = CryptoJS.algo.PBKDF2.create();
	         *     var kdf = CryptoJS.algo.PBKDF2.create({ keySize: 8 });
	         *     var kdf = CryptoJS.algo.PBKDF2.create({ keySize: 8, iterations: 1000 });
	         */
	        init: function (cfg) {
	            this.cfg = this.cfg.extend(cfg);
	        },

	        /**
	         * Computes the Password-Based Key Derivation Function 2.
	         *
	         * @param {WordArray|string} password The password.
	         * @param {WordArray|string} salt A salt.
	         *
	         * @return {WordArray} The derived key.
	         *
	         * @example
	         *
	         *     var key = kdf.compute(password, salt);
	         */
	        compute: function (password, salt) {
	            // Shortcut
	            var cfg = this.cfg;

	            // Init HMAC
	            var hmac = HMAC.create(cfg.hasher, password);

	            // Initial values
	            var derivedKey = WordArray.create();
	            var blockIndex = WordArray.create([0x00000001]);

	            // Shortcuts
	            var derivedKeyWords = derivedKey.words;
	            var blockIndexWords = blockIndex.words;
	            var keySize = cfg.keySize;
	            var iterations = cfg.iterations;

	            // Generate key
	            while (derivedKeyWords.length < keySize) {
	                var block = hmac.update(salt).finalize(blockIndex);
	                hmac.reset();

	                // Shortcuts
	                var blockWords = block.words;
	                var blockWordsLength = blockWords.length;

	                // Iterations
	                var intermediate = block;
	                for (var i = 1; i < iterations; i++) {
	                    intermediate = hmac.finalize(intermediate);
	                    hmac.reset();

	                    // Shortcut
	                    var intermediateWords = intermediate.words;

	                    // XOR intermediate with block
	                    for (var j = 0; j < blockWordsLength; j++) {
	                        blockWords[j] ^= intermediateWords[j];
	                    }
	                }

	                derivedKey.concat(block);
	                blockIndexWords[0]++;
	            }
	            derivedKey.sigBytes = keySize * 4;

	            return derivedKey;
	        }
	    });

	    /**
	     * Computes the Password-Based Key Derivation Function 2.
	     *
	     * @param {WordArray|string} password The password.
	     * @param {WordArray|string} salt A salt.
	     * @param {Object} cfg (Optional) The configuration options to use for this computation.
	     *
	     * @return {WordArray} The derived key.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var key = CryptoJS.PBKDF2(password, salt);
	     *     var key = CryptoJS.PBKDF2(password, salt, { keySize: 8 });
	     *     var key = CryptoJS.PBKDF2(password, salt, { keySize: 8, iterations: 1000 });
	     */
	    C.PBKDF2 = function (password, salt, cfg) {
	        return PBKDF2.create(cfg).compute(password, salt);
	    };
	}());


	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var Base = C_lib.Base;
	    var WordArray = C_lib.WordArray;
	    var C_algo = C.algo;
	    var MD5 = C_algo.MD5;

	    /**
	     * This key derivation function is meant to conform with EVP_BytesToKey.
	     * www.openssl.org/docs/crypto/EVP_BytesToKey.html
	     */
	    var EvpKDF = C_algo.EvpKDF = Base.extend({
	        /**
	         * Configuration options.
	         *
	         * @property {number} keySize The key size in words to generate. Default: 4 (128 bits)
	         * @property {Hasher} hasher The hash algorithm to use. Default: MD5
	         * @property {number} iterations The number of iterations to perform. Default: 1
	         */
	        cfg: Base.extend({
	            keySize: 128/32,
	            hasher: MD5,
	            iterations: 1
	        }),

	        /**
	         * Initializes a newly created key derivation function.
	         *
	         * @param {Object} cfg (Optional) The configuration options to use for the derivation.
	         *
	         * @example
	         *
	         *     var kdf = CryptoJS.algo.EvpKDF.create();
	         *     var kdf = CryptoJS.algo.EvpKDF.create({ keySize: 8 });
	         *     var kdf = CryptoJS.algo.EvpKDF.create({ keySize: 8, iterations: 1000 });
	         */
	        init: function (cfg) {
	            this.cfg = this.cfg.extend(cfg);
	        },

	        /**
	         * Derives a key from a password.
	         *
	         * @param {WordArray|string} password The password.
	         * @param {WordArray|string} salt A salt.
	         *
	         * @return {WordArray} The derived key.
	         *
	         * @example
	         *
	         *     var key = kdf.compute(password, salt);
	         */
	        compute: function (password, salt) {
	            var block;

	            // Shortcut
	            var cfg = this.cfg;

	            // Init hasher
	            var hasher = cfg.hasher.create();

	            // Initial values
	            var derivedKey = WordArray.create();

	            // Shortcuts
	            var derivedKeyWords = derivedKey.words;
	            var keySize = cfg.keySize;
	            var iterations = cfg.iterations;

	            // Generate key
	            while (derivedKeyWords.length < keySize) {
	                if (block) {
	                    hasher.update(block);
	                }
	                block = hasher.update(password).finalize(salt);
	                hasher.reset();

	                // Iterations
	                for (var i = 1; i < iterations; i++) {
	                    block = hasher.finalize(block);
	                    hasher.reset();
	                }

	                derivedKey.concat(block);
	            }
	            derivedKey.sigBytes = keySize * 4;

	            return derivedKey;
	        }
	    });

	    /**
	     * Derives a key from a password.
	     *
	     * @param {WordArray|string} password The password.
	     * @param {WordArray|string} salt A salt.
	     * @param {Object} cfg (Optional) The configuration options to use for this computation.
	     *
	     * @return {WordArray} The derived key.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var key = CryptoJS.EvpKDF(password, salt);
	     *     var key = CryptoJS.EvpKDF(password, salt, { keySize: 8 });
	     *     var key = CryptoJS.EvpKDF(password, salt, { keySize: 8, iterations: 1000 });
	     */
	    C.EvpKDF = function (password, salt, cfg) {
	        return EvpKDF.create(cfg).compute(password, salt);
	    };
	}());


	/**
	 * Cipher core components.
	 */
	CryptoJS.lib.Cipher || (function (undefined) {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var Base = C_lib.Base;
	    var WordArray = C_lib.WordArray;
	    var BufferedBlockAlgorithm = C_lib.BufferedBlockAlgorithm;
	    var C_enc = C.enc;
	    var Utf8 = C_enc.Utf8;
	    var Base64 = C_enc.Base64;
	    var C_algo = C.algo;
	    var EvpKDF = C_algo.EvpKDF;

	    /**
	     * Abstract base cipher template.
	     *
	     * @property {number} keySize This cipher's key size. Default: 4 (128 bits)
	     * @property {number} ivSize This cipher's IV size. Default: 4 (128 bits)
	     * @property {number} _ENC_XFORM_MODE A constant representing encryption mode.
	     * @property {number} _DEC_XFORM_MODE A constant representing decryption mode.
	     */
	    var Cipher = C_lib.Cipher = BufferedBlockAlgorithm.extend({
	        /**
	         * Configuration options.
	         *
	         * @property {WordArray} iv The IV to use for this operation.
	         */
	        cfg: Base.extend(),

	        /**
	         * Creates this cipher in encryption mode.
	         *
	         * @param {WordArray} key The key.
	         * @param {Object} cfg (Optional) The configuration options to use for this operation.
	         *
	         * @return {Cipher} A cipher instance.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var cipher = CryptoJS.algo.AES.createEncryptor(keyWordArray, { iv: ivWordArray });
	         */
	        createEncryptor: function (key, cfg) {
	            return this.create(this._ENC_XFORM_MODE, key, cfg);
	        },

	        /**
	         * Creates this cipher in decryption mode.
	         *
	         * @param {WordArray} key The key.
	         * @param {Object} cfg (Optional) The configuration options to use for this operation.
	         *
	         * @return {Cipher} A cipher instance.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var cipher = CryptoJS.algo.AES.createDecryptor(keyWordArray, { iv: ivWordArray });
	         */
	        createDecryptor: function (key, cfg) {
	            return this.create(this._DEC_XFORM_MODE, key, cfg);
	        },

	        /**
	         * Initializes a newly created cipher.
	         *
	         * @param {number} xformMode Either the encryption or decryption transormation mode constant.
	         * @param {WordArray} key The key.
	         * @param {Object} cfg (Optional) The configuration options to use for this operation.
	         *
	         * @example
	         *
	         *     var cipher = CryptoJS.algo.AES.create(CryptoJS.algo.AES._ENC_XFORM_MODE, keyWordArray, { iv: ivWordArray });
	         */
	        init: function (xformMode, key, cfg) {
	            // Apply config defaults
	            this.cfg = this.cfg.extend(cfg);

	            // Store transform mode and key
	            this._xformMode = xformMode;
	            this._key = key;

	            // Set initial values
	            this.reset();
	        },

	        /**
	         * Resets this cipher to its initial state.
	         *
	         * @example
	         *
	         *     cipher.reset();
	         */
	        reset: function () {
	            // Reset data buffer
	            BufferedBlockAlgorithm.reset.call(this);

	            // Perform concrete-cipher logic
	            this._doReset();
	        },

	        /**
	         * Adds data to be encrypted or decrypted.
	         *
	         * @param {WordArray|string} dataUpdate The data to encrypt or decrypt.
	         *
	         * @return {WordArray} The data after processing.
	         *
	         * @example
	         *
	         *     var encrypted = cipher.process('data');
	         *     var encrypted = cipher.process(wordArray);
	         */
	        process: function (dataUpdate) {
	            // Append
	            this._append(dataUpdate);

	            // Process available blocks
	            return this._process();
	        },

	        /**
	         * Finalizes the encryption or decryption process.
	         * Note that the finalize operation is effectively a destructive, read-once operation.
	         *
	         * @param {WordArray|string} dataUpdate The final data to encrypt or decrypt.
	         *
	         * @return {WordArray} The data after final processing.
	         *
	         * @example
	         *
	         *     var encrypted = cipher.finalize();
	         *     var encrypted = cipher.finalize('data');
	         *     var encrypted = cipher.finalize(wordArray);
	         */
	        finalize: function (dataUpdate) {
	            // Final data update
	            if (dataUpdate) {
	                this._append(dataUpdate);
	            }

	            // Perform concrete-cipher logic
	            var finalProcessedData = this._doFinalize();

	            return finalProcessedData;
	        },

	        keySize: 128/32,

	        ivSize: 128/32,

	        _ENC_XFORM_MODE: 1,

	        _DEC_XFORM_MODE: 2,

	        /**
	         * Creates shortcut functions to a cipher's object interface.
	         *
	         * @param {Cipher} cipher The cipher to create a helper for.
	         *
	         * @return {Object} An object with encrypt and decrypt shortcut functions.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var AES = CryptoJS.lib.Cipher._createHelper(CryptoJS.algo.AES);
	         */
	        _createHelper: (function () {
	            function selectCipherStrategy(key) {
	                if (typeof key == 'string') {
	                    return PasswordBasedCipher;
	                } else {
	                    return SerializableCipher;
	                }
	            }

	            return function (cipher) {
	                return {
	                    encrypt: function (message, key, cfg) {
	                        return selectCipherStrategy(key).encrypt(cipher, message, key, cfg);
	                    },

	                    decrypt: function (ciphertext, key, cfg) {
	                        return selectCipherStrategy(key).decrypt(cipher, ciphertext, key, cfg);
	                    }
	                };
	            };
	        }())
	    });

	    /**
	     * Abstract base stream cipher template.
	     *
	     * @property {number} blockSize The number of 32-bit words this cipher operates on. Default: 1 (32 bits)
	     */
	    var StreamCipher = C_lib.StreamCipher = Cipher.extend({
	        _doFinalize: function () {
	            // Process partial blocks
	            var finalProcessedBlocks = this._process(!!'flush');

	            return finalProcessedBlocks;
	        },

	        blockSize: 1
	    });

	    /**
	     * Mode namespace.
	     */
	    var C_mode = C.mode = {};

	    /**
	     * Abstract base block cipher mode template.
	     */
	    var BlockCipherMode = C_lib.BlockCipherMode = Base.extend({
	        /**
	         * Creates this mode for encryption.
	         *
	         * @param {Cipher} cipher A block cipher instance.
	         * @param {Array} iv The IV words.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var mode = CryptoJS.mode.CBC.createEncryptor(cipher, iv.words);
	         */
	        createEncryptor: function (cipher, iv) {
	            return this.Encryptor.create(cipher, iv);
	        },

	        /**
	         * Creates this mode for decryption.
	         *
	         * @param {Cipher} cipher A block cipher instance.
	         * @param {Array} iv The IV words.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var mode = CryptoJS.mode.CBC.createDecryptor(cipher, iv.words);
	         */
	        createDecryptor: function (cipher, iv) {
	            return this.Decryptor.create(cipher, iv);
	        },

	        /**
	         * Initializes a newly created mode.
	         *
	         * @param {Cipher} cipher A block cipher instance.
	         * @param {Array} iv The IV words.
	         *
	         * @example
	         *
	         *     var mode = CryptoJS.mode.CBC.Encryptor.create(cipher, iv.words);
	         */
	        init: function (cipher, iv) {
	            this._cipher = cipher;
	            this._iv = iv;
	        }
	    });

	    /**
	     * Cipher Block Chaining mode.
	     */
	    var CBC = C_mode.CBC = (function () {
	        /**
	         * Abstract base CBC mode.
	         */
	        var CBC = BlockCipherMode.extend();

	        /**
	         * CBC encryptor.
	         */
	        CBC.Encryptor = CBC.extend({
	            /**
	             * Processes the data block at offset.
	             *
	             * @param {Array} words The data words to operate on.
	             * @param {number} offset The offset where the block starts.
	             *
	             * @example
	             *
	             *     mode.processBlock(data.words, offset);
	             */
	            processBlock: function (words, offset) {
	                // Shortcuts
	                var cipher = this._cipher;
	                var blockSize = cipher.blockSize;

	                // XOR and encrypt
	                xorBlock.call(this, words, offset, blockSize);
	                cipher.encryptBlock(words, offset);

	                // Remember this block to use with next block
	                this._prevBlock = words.slice(offset, offset + blockSize);
	            }
	        });

	        /**
	         * CBC decryptor.
	         */
	        CBC.Decryptor = CBC.extend({
	            /**
	             * Processes the data block at offset.
	             *
	             * @param {Array} words The data words to operate on.
	             * @param {number} offset The offset where the block starts.
	             *
	             * @example
	             *
	             *     mode.processBlock(data.words, offset);
	             */
	            processBlock: function (words, offset) {
	                // Shortcuts
	                var cipher = this._cipher;
	                var blockSize = cipher.blockSize;

	                // Remember this block to use with next block
	                var thisBlock = words.slice(offset, offset + blockSize);

	                // Decrypt and XOR
	                cipher.decryptBlock(words, offset);
	                xorBlock.call(this, words, offset, blockSize);

	                // This block becomes the previous block
	                this._prevBlock = thisBlock;
	            }
	        });

	        function xorBlock(words, offset, blockSize) {
	            var block;

	            // Shortcut
	            var iv = this._iv;

	            // Choose mixing block
	            if (iv) {
	                block = iv;

	                // Remove IV for subsequent blocks
	                this._iv = undefined;
	            } else {
	                block = this._prevBlock;
	            }

	            // XOR blocks
	            for (var i = 0; i < blockSize; i++) {
	                words[offset + i] ^= block[i];
	            }
	        }

	        return CBC;
	    }());

	    /**
	     * Padding namespace.
	     */
	    var C_pad = C.pad = {};

	    /**
	     * PKCS #5/7 padding strategy.
	     */
	    var Pkcs7 = C_pad.Pkcs7 = {
	        /**
	         * Pads data using the algorithm defined in PKCS #5/7.
	         *
	         * @param {WordArray} data The data to pad.
	         * @param {number} blockSize The multiple that the data should be padded to.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     CryptoJS.pad.Pkcs7.pad(wordArray, 4);
	         */
	        pad: function (data, blockSize) {
	            // Shortcut
	            var blockSizeBytes = blockSize * 4;

	            // Count padding bytes
	            var nPaddingBytes = blockSizeBytes - data.sigBytes % blockSizeBytes;

	            // Create padding word
	            var paddingWord = (nPaddingBytes << 24) | (nPaddingBytes << 16) | (nPaddingBytes << 8) | nPaddingBytes;

	            // Create padding
	            var paddingWords = [];
	            for (var i = 0; i < nPaddingBytes; i += 4) {
	                paddingWords.push(paddingWord);
	            }
	            var padding = WordArray.create(paddingWords, nPaddingBytes);

	            // Add padding
	            data.concat(padding);
	        },

	        /**
	         * Unpads data that had been padded using the algorithm defined in PKCS #5/7.
	         *
	         * @param {WordArray} data The data to unpad.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     CryptoJS.pad.Pkcs7.unpad(wordArray);
	         */
	        unpad: function (data) {
	            // Get number of padding bytes from last byte
	            var nPaddingBytes = data.words[(data.sigBytes - 1) >>> 2] & 0xff;

	            // Remove padding
	            data.sigBytes -= nPaddingBytes;
	        }
	    };

	    /**
	     * Abstract base block cipher template.
	     *
	     * @property {number} blockSize The number of 32-bit words this cipher operates on. Default: 4 (128 bits)
	     */
	    var BlockCipher = C_lib.BlockCipher = Cipher.extend({
	        /**
	         * Configuration options.
	         *
	         * @property {Mode} mode The block mode to use. Default: CBC
	         * @property {Padding} padding The padding strategy to use. Default: Pkcs7
	         */
	        cfg: Cipher.cfg.extend({
	            mode: CBC,
	            padding: Pkcs7
	        }),

	        reset: function () {
	            var modeCreator;

	            // Reset cipher
	            Cipher.reset.call(this);

	            // Shortcuts
	            var cfg = this.cfg;
	            var iv = cfg.iv;
	            var mode = cfg.mode;

	            // Reset block mode
	            if (this._xformMode == this._ENC_XFORM_MODE) {
	                modeCreator = mode.createEncryptor;
	            } else /* if (this._xformMode == this._DEC_XFORM_MODE) */ {
	                modeCreator = mode.createDecryptor;
	                // Keep at least one block in the buffer for unpadding
	                this._minBufferSize = 1;
	            }

	            if (this._mode && this._mode.__creator == modeCreator) {
	                this._mode.init(this, iv && iv.words);
	            } else {
	                this._mode = modeCreator.call(mode, this, iv && iv.words);
	                this._mode.__creator = modeCreator;
	            }
	        },

	        _doProcessBlock: function (words, offset) {
	            this._mode.processBlock(words, offset);
	        },

	        _doFinalize: function () {
	            var finalProcessedBlocks;

	            // Shortcut
	            var padding = this.cfg.padding;

	            // Finalize
	            if (this._xformMode == this._ENC_XFORM_MODE) {
	                // Pad data
	                padding.pad(this._data, this.blockSize);

	                // Process final blocks
	                finalProcessedBlocks = this._process(!!'flush');
	            } else /* if (this._xformMode == this._DEC_XFORM_MODE) */ {
	                // Process final blocks
	                finalProcessedBlocks = this._process(!!'flush');

	                // Unpad data
	                padding.unpad(finalProcessedBlocks);
	            }

	            return finalProcessedBlocks;
	        },

	        blockSize: 128/32
	    });

	    /**
	     * A collection of cipher parameters.
	     *
	     * @property {WordArray} ciphertext The raw ciphertext.
	     * @property {WordArray} key The key to this ciphertext.
	     * @property {WordArray} iv The IV used in the ciphering operation.
	     * @property {WordArray} salt The salt used with a key derivation function.
	     * @property {Cipher} algorithm The cipher algorithm.
	     * @property {Mode} mode The block mode used in the ciphering operation.
	     * @property {Padding} padding The padding scheme used in the ciphering operation.
	     * @property {number} blockSize The block size of the cipher.
	     * @property {Format} formatter The default formatting strategy to convert this cipher params object to a string.
	     */
	    var CipherParams = C_lib.CipherParams = Base.extend({
	        /**
	         * Initializes a newly created cipher params object.
	         *
	         * @param {Object} cipherParams An object with any of the possible cipher parameters.
	         *
	         * @example
	         *
	         *     var cipherParams = CryptoJS.lib.CipherParams.create({
	         *         ciphertext: ciphertextWordArray,
	         *         key: keyWordArray,
	         *         iv: ivWordArray,
	         *         salt: saltWordArray,
	         *         algorithm: CryptoJS.algo.AES,
	         *         mode: CryptoJS.mode.CBC,
	         *         padding: CryptoJS.pad.PKCS7,
	         *         blockSize: 4,
	         *         formatter: CryptoJS.format.OpenSSL
	         *     });
	         */
	        init: function (cipherParams) {
	            this.mixIn(cipherParams);
	        },

	        /**
	         * Converts this cipher params object to a string.
	         *
	         * @param {Format} formatter (Optional) The formatting strategy to use.
	         *
	         * @return {string} The stringified cipher params.
	         *
	         * @throws Error If neither the formatter nor the default formatter is set.
	         *
	         * @example
	         *
	         *     var string = cipherParams + '';
	         *     var string = cipherParams.toString();
	         *     var string = cipherParams.toString(CryptoJS.format.OpenSSL);
	         */
	        toString: function (formatter) {
	            return (formatter || this.formatter).stringify(this);
	        }
	    });

	    /**
	     * Format namespace.
	     */
	    var C_format = C.format = {};

	    /**
	     * OpenSSL formatting strategy.
	     */
	    var OpenSSLFormatter = C_format.OpenSSL = {
	        /**
	         * Converts a cipher params object to an OpenSSL-compatible string.
	         *
	         * @param {CipherParams} cipherParams The cipher params object.
	         *
	         * @return {string} The OpenSSL-compatible string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var openSSLString = CryptoJS.format.OpenSSL.stringify(cipherParams);
	         */
	        stringify: function (cipherParams) {
	            var wordArray;

	            // Shortcuts
	            var ciphertext = cipherParams.ciphertext;
	            var salt = cipherParams.salt;

	            // Format
	            if (salt) {
	                wordArray = WordArray.create([0x53616c74, 0x65645f5f]).concat(salt).concat(ciphertext);
	            } else {
	                wordArray = ciphertext;
	            }

	            return wordArray.toString(Base64);
	        },

	        /**
	         * Converts an OpenSSL-compatible string to a cipher params object.
	         *
	         * @param {string} openSSLStr The OpenSSL-compatible string.
	         *
	         * @return {CipherParams} The cipher params object.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var cipherParams = CryptoJS.format.OpenSSL.parse(openSSLString);
	         */
	        parse: function (openSSLStr) {
	            var salt;

	            // Parse base64
	            var ciphertext = Base64.parse(openSSLStr);

	            // Shortcut
	            var ciphertextWords = ciphertext.words;

	            // Test for salt
	            if (ciphertextWords[0] == 0x53616c74 && ciphertextWords[1] == 0x65645f5f) {
	                // Extract salt
	                salt = WordArray.create(ciphertextWords.slice(2, 4));

	                // Remove salt from ciphertext
	                ciphertextWords.splice(0, 4);
	                ciphertext.sigBytes -= 16;
	            }

	            return CipherParams.create({ ciphertext: ciphertext, salt: salt });
	        }
	    };

	    /**
	     * A cipher wrapper that returns ciphertext as a serializable cipher params object.
	     */
	    var SerializableCipher = C_lib.SerializableCipher = Base.extend({
	        /**
	         * Configuration options.
	         *
	         * @property {Formatter} format The formatting strategy to convert cipher param objects to and from a string. Default: OpenSSL
	         */
	        cfg: Base.extend({
	            format: OpenSSLFormatter
	        }),

	        /**
	         * Encrypts a message.
	         *
	         * @param {Cipher} cipher The cipher algorithm to use.
	         * @param {WordArray|string} message The message to encrypt.
	         * @param {WordArray} key The key.
	         * @param {Object} cfg (Optional) The configuration options to use for this operation.
	         *
	         * @return {CipherParams} A cipher params object.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var ciphertextParams = CryptoJS.lib.SerializableCipher.encrypt(CryptoJS.algo.AES, message, key);
	         *     var ciphertextParams = CryptoJS.lib.SerializableCipher.encrypt(CryptoJS.algo.AES, message, key, { iv: iv });
	         *     var ciphertextParams = CryptoJS.lib.SerializableCipher.encrypt(CryptoJS.algo.AES, message, key, { iv: iv, format: CryptoJS.format.OpenSSL });
	         */
	        encrypt: function (cipher, message, key, cfg) {
	            // Apply config defaults
	            cfg = this.cfg.extend(cfg);

	            // Encrypt
	            var encryptor = cipher.createEncryptor(key, cfg);
	            var ciphertext = encryptor.finalize(message);

	            // Shortcut
	            var cipherCfg = encryptor.cfg;

	            // Create and return serializable cipher params
	            return CipherParams.create({
	                ciphertext: ciphertext,
	                key: key,
	                iv: cipherCfg.iv,
	                algorithm: cipher,
	                mode: cipherCfg.mode,
	                padding: cipherCfg.padding,
	                blockSize: cipher.blockSize,
	                formatter: cfg.format
	            });
	        },

	        /**
	         * Decrypts serialized ciphertext.
	         *
	         * @param {Cipher} cipher The cipher algorithm to use.
	         * @param {CipherParams|string} ciphertext The ciphertext to decrypt.
	         * @param {WordArray} key The key.
	         * @param {Object} cfg (Optional) The configuration options to use for this operation.
	         *
	         * @return {WordArray} The plaintext.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var plaintext = CryptoJS.lib.SerializableCipher.decrypt(CryptoJS.algo.AES, formattedCiphertext, key, { iv: iv, format: CryptoJS.format.OpenSSL });
	         *     var plaintext = CryptoJS.lib.SerializableCipher.decrypt(CryptoJS.algo.AES, ciphertextParams, key, { iv: iv, format: CryptoJS.format.OpenSSL });
	         */
	        decrypt: function (cipher, ciphertext, key, cfg) {
	            // Apply config defaults
	            cfg = this.cfg.extend(cfg);

	            // Convert string to CipherParams
	            ciphertext = this._parse(ciphertext, cfg.format);

	            // Decrypt
	            var plaintext = cipher.createDecryptor(key, cfg).finalize(ciphertext.ciphertext);

	            return plaintext;
	        },

	        /**
	         * Converts serialized ciphertext to CipherParams,
	         * else assumed CipherParams already and returns ciphertext unchanged.
	         *
	         * @param {CipherParams|string} ciphertext The ciphertext.
	         * @param {Formatter} format The formatting strategy to use to parse serialized ciphertext.
	         *
	         * @return {CipherParams} The unserialized ciphertext.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var ciphertextParams = CryptoJS.lib.SerializableCipher._parse(ciphertextStringOrParams, format);
	         */
	        _parse: function (ciphertext, format) {
	            if (typeof ciphertext == 'string') {
	                return format.parse(ciphertext, this);
	            } else {
	                return ciphertext;
	            }
	        }
	    });

	    /**
	     * Key derivation function namespace.
	     */
	    var C_kdf = C.kdf = {};

	    /**
	     * OpenSSL key derivation function.
	     */
	    var OpenSSLKdf = C_kdf.OpenSSL = {
	        /**
	         * Derives a key and IV from a password.
	         *
	         * @param {string} password The password to derive from.
	         * @param {number} keySize The size in words of the key to generate.
	         * @param {number} ivSize The size in words of the IV to generate.
	         * @param {WordArray|string} salt (Optional) A 64-bit salt to use. If omitted, a salt will be generated randomly.
	         *
	         * @return {CipherParams} A cipher params object with the key, IV, and salt.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var derivedParams = CryptoJS.kdf.OpenSSL.execute('Password', 256/32, 128/32);
	         *     var derivedParams = CryptoJS.kdf.OpenSSL.execute('Password', 256/32, 128/32, 'saltsalt');
	         */
	        execute: function (password, keySize, ivSize, salt, hasher) {
	            // Generate random salt
	            if (!salt) {
	                salt = WordArray.random(64/8);
	            }

	            // Derive key and IV
	            if (!hasher) {
	                var key = EvpKDF.create({ keySize: keySize + ivSize }).compute(password, salt);
	            } else {
	                var key = EvpKDF.create({ keySize: keySize + ivSize, hasher: hasher }).compute(password, salt);
	            }


	            // Separate key and IV
	            var iv = WordArray.create(key.words.slice(keySize), ivSize * 4);
	            key.sigBytes = keySize * 4;

	            // Return params
	            return CipherParams.create({ key: key, iv: iv, salt: salt });
	        }
	    };

	    /**
	     * A serializable cipher wrapper that derives the key from a password,
	     * and returns ciphertext as a serializable cipher params object.
	     */
	    var PasswordBasedCipher = C_lib.PasswordBasedCipher = SerializableCipher.extend({
	        /**
	         * Configuration options.
	         *
	         * @property {KDF} kdf The key derivation function to use to generate a key and IV from a password. Default: OpenSSL
	         */
	        cfg: SerializableCipher.cfg.extend({
	            kdf: OpenSSLKdf
	        }),

	        /**
	         * Encrypts a message using a password.
	         *
	         * @param {Cipher} cipher The cipher algorithm to use.
	         * @param {WordArray|string} message The message to encrypt.
	         * @param {string} password The password.
	         * @param {Object} cfg (Optional) The configuration options to use for this operation.
	         *
	         * @return {CipherParams} A cipher params object.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var ciphertextParams = CryptoJS.lib.PasswordBasedCipher.encrypt(CryptoJS.algo.AES, message, 'password');
	         *     var ciphertextParams = CryptoJS.lib.PasswordBasedCipher.encrypt(CryptoJS.algo.AES, message, 'password', { format: CryptoJS.format.OpenSSL });
	         */
	        encrypt: function (cipher, message, password, cfg) {
	            // Apply config defaults
	            cfg = this.cfg.extend(cfg);

	            // Derive key and other params
	            var derivedParams = cfg.kdf.execute(password, cipher.keySize, cipher.ivSize, cfg.salt, cfg.hasher);

	            // Add IV to config
	            cfg.iv = derivedParams.iv;

	            // Encrypt
	            var ciphertext = SerializableCipher.encrypt.call(this, cipher, message, derivedParams.key, cfg);

	            // Mix in derived params
	            ciphertext.mixIn(derivedParams);

	            return ciphertext;
	        },

	        /**
	         * Decrypts serialized ciphertext using a password.
	         *
	         * @param {Cipher} cipher The cipher algorithm to use.
	         * @param {CipherParams|string} ciphertext The ciphertext to decrypt.
	         * @param {string} password The password.
	         * @param {Object} cfg (Optional) The configuration options to use for this operation.
	         *
	         * @return {WordArray} The plaintext.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var plaintext = CryptoJS.lib.PasswordBasedCipher.decrypt(CryptoJS.algo.AES, formattedCiphertext, 'password', { format: CryptoJS.format.OpenSSL });
	         *     var plaintext = CryptoJS.lib.PasswordBasedCipher.decrypt(CryptoJS.algo.AES, ciphertextParams, 'password', { format: CryptoJS.format.OpenSSL });
	         */
	        decrypt: function (cipher, ciphertext, password, cfg) {
	            // Apply config defaults
	            cfg = this.cfg.extend(cfg);

	            // Convert string to CipherParams
	            ciphertext = this._parse(ciphertext, cfg.format);

	            // Derive key and other params
	            var derivedParams = cfg.kdf.execute(password, cipher.keySize, cipher.ivSize, ciphertext.salt, cfg.hasher);

	            // Add IV to config
	            cfg.iv = derivedParams.iv;

	            // Decrypt
	            var plaintext = SerializableCipher.decrypt.call(this, cipher, ciphertext, derivedParams.key, cfg);

	            return plaintext;
	        }
	    });
	}());


	/**
	 * Cipher Feedback block mode.
	 */
	CryptoJS.mode.CFB = (function () {
	    var CFB = CryptoJS.lib.BlockCipherMode.extend();

	    CFB.Encryptor = CFB.extend({
	        processBlock: function (words, offset) {
	            // Shortcuts
	            var cipher = this._cipher;
	            var blockSize = cipher.blockSize;

	            generateKeystreamAndEncrypt.call(this, words, offset, blockSize, cipher);

	            // Remember this block to use with next block
	            this._prevBlock = words.slice(offset, offset + blockSize);
	        }
	    });

	    CFB.Decryptor = CFB.extend({
	        processBlock: function (words, offset) {
	            // Shortcuts
	            var cipher = this._cipher;
	            var blockSize = cipher.blockSize;

	            // Remember this block to use with next block
	            var thisBlock = words.slice(offset, offset + blockSize);

	            generateKeystreamAndEncrypt.call(this, words, offset, blockSize, cipher);

	            // This block becomes the previous block
	            this._prevBlock = thisBlock;
	        }
	    });

	    function generateKeystreamAndEncrypt(words, offset, blockSize, cipher) {
	        var keystream;

	        // Shortcut
	        var iv = this._iv;

	        // Generate keystream
	        if (iv) {
	            keystream = iv.slice(0);

	            // Remove IV for subsequent blocks
	            this._iv = undefined;
	        } else {
	            keystream = this._prevBlock;
	        }
	        cipher.encryptBlock(keystream, 0);

	        // Encrypt
	        for (var i = 0; i < blockSize; i++) {
	            words[offset + i] ^= keystream[i];
	        }
	    }

	    return CFB;
	}());


	/**
	 * Counter block mode.
	 */
	CryptoJS.mode.CTR = (function () {
	    var CTR = CryptoJS.lib.BlockCipherMode.extend();

	    var Encryptor = CTR.Encryptor = CTR.extend({
	        processBlock: function (words, offset) {
	            // Shortcuts
	            var cipher = this._cipher
	            var blockSize = cipher.blockSize;
	            var iv = this._iv;
	            var counter = this._counter;

	            // Generate keystream
	            if (iv) {
	                counter = this._counter = iv.slice(0);

	                // Remove IV for subsequent blocks
	                this._iv = undefined;
	            }
	            var keystream = counter.slice(0);
	            cipher.encryptBlock(keystream, 0);

	            // Increment counter
	            counter[blockSize - 1] = (counter[blockSize - 1] + 1) | 0

	            // Encrypt
	            for (var i = 0; i < blockSize; i++) {
	                words[offset + i] ^= keystream[i];
	            }
	        }
	    });

	    CTR.Decryptor = Encryptor;

	    return CTR;
	}());


	/** @preserve
	 * Counter block mode compatible with  Dr Brian Gladman fileenc.c
	 * derived from CryptoJS.mode.CTR
	 * Jan Hruby jhruby.web@gmail.com
	 */
	CryptoJS.mode.CTRGladman = (function () {
	    var CTRGladman = CryptoJS.lib.BlockCipherMode.extend();

		function incWord(word)
		{
			if (((word >> 24) & 0xff) === 0xff) { //overflow
			var b1 = (word >> 16)&0xff;
			var b2 = (word >> 8)&0xff;
			var b3 = word & 0xff;

			if (b1 === 0xff) // overflow b1
			{
			b1 = 0;
			if (b2 === 0xff)
			{
				b2 = 0;
				if (b3 === 0xff)
				{
					b3 = 0;
				}
				else
				{
					++b3;
				}
			}
			else
			{
				++b2;
			}
			}
			else
			{
			++b1;
			}

			word = 0;
			word += (b1 << 16);
			word += (b2 << 8);
			word += b3;
			}
			else
			{
			word += (0x01 << 24);
			}
			return word;
		}

		function incCounter(counter)
		{
			if ((counter[0] = incWord(counter[0])) === 0)
			{
				// encr_data in fileenc.c from  Dr Brian Gladman's counts only with DWORD j < 8
				counter[1] = incWord(counter[1]);
			}
			return counter;
		}

	    var Encryptor = CTRGladman.Encryptor = CTRGladman.extend({
	        processBlock: function (words, offset) {
	            // Shortcuts
	            var cipher = this._cipher
	            var blockSize = cipher.blockSize;
	            var iv = this._iv;
	            var counter = this._counter;

	            // Generate keystream
	            if (iv) {
	                counter = this._counter = iv.slice(0);

	                // Remove IV for subsequent blocks
	                this._iv = undefined;
	            }

				incCounter(counter);

				var keystream = counter.slice(0);
	            cipher.encryptBlock(keystream, 0);

	            // Encrypt
	            for (var i = 0; i < blockSize; i++) {
	                words[offset + i] ^= keystream[i];
	            }
	        }
	    });

	    CTRGladman.Decryptor = Encryptor;

	    return CTRGladman;
	}());




	/**
	 * Output Feedback block mode.
	 */
	CryptoJS.mode.OFB = (function () {
	    var OFB = CryptoJS.lib.BlockCipherMode.extend();

	    var Encryptor = OFB.Encryptor = OFB.extend({
	        processBlock: function (words, offset) {
	            // Shortcuts
	            var cipher = this._cipher
	            var blockSize = cipher.blockSize;
	            var iv = this._iv;
	            var keystream = this._keystream;

	            // Generate keystream
	            if (iv) {
	                keystream = this._keystream = iv.slice(0);

	                // Remove IV for subsequent blocks
	                this._iv = undefined;
	            }
	            cipher.encryptBlock(keystream, 0);

	            // Encrypt
	            for (var i = 0; i < blockSize; i++) {
	                words[offset + i] ^= keystream[i];
	            }
	        }
	    });

	    OFB.Decryptor = Encryptor;

	    return OFB;
	}());


	/**
	 * Electronic Codebook block mode.
	 */
	CryptoJS.mode.ECB = (function () {
	    var ECB = CryptoJS.lib.BlockCipherMode.extend();

	    ECB.Encryptor = ECB.extend({
	        processBlock: function (words, offset) {
	            this._cipher.encryptBlock(words, offset);
	        }
	    });

	    ECB.Decryptor = ECB.extend({
	        processBlock: function (words, offset) {
	            this._cipher.decryptBlock(words, offset);
	        }
	    });

	    return ECB;
	}());


	/**
	 * ANSI X.923 padding strategy.
	 */
	CryptoJS.pad.AnsiX923 = {
	    pad: function (data, blockSize) {
	        // Shortcuts
	        var dataSigBytes = data.sigBytes;
	        var blockSizeBytes = blockSize * 4;

	        // Count padding bytes
	        var nPaddingBytes = blockSizeBytes - dataSigBytes % blockSizeBytes;

	        // Compute last byte position
	        var lastBytePos = dataSigBytes + nPaddingBytes - 1;

	        // Pad
	        data.clamp();
	        data.words[lastBytePos >>> 2] |= nPaddingBytes << (24 - (lastBytePos % 4) * 8);
	        data.sigBytes += nPaddingBytes;
	    },

	    unpad: function (data) {
	        // Get number of padding bytes from last byte
	        var nPaddingBytes = data.words[(data.sigBytes - 1) >>> 2] & 0xff;

	        // Remove padding
	        data.sigBytes -= nPaddingBytes;
	    }
	};


	/**
	 * ISO 10126 padding strategy.
	 */
	CryptoJS.pad.Iso10126 = {
	    pad: function (data, blockSize) {
	        // Shortcut
	        var blockSizeBytes = blockSize * 4;

	        // Count padding bytes
	        var nPaddingBytes = blockSizeBytes - data.sigBytes % blockSizeBytes;

	        // Pad
	        data.concat(CryptoJS.lib.WordArray.random(nPaddingBytes - 1)).
	             concat(CryptoJS.lib.WordArray.create([nPaddingBytes << 24], 1));
	    },

	    unpad: function (data) {
	        // Get number of padding bytes from last byte
	        var nPaddingBytes = data.words[(data.sigBytes - 1) >>> 2] & 0xff;

	        // Remove padding
	        data.sigBytes -= nPaddingBytes;
	    }
	};


	/**
	 * ISO/IEC 9797-1 Padding Method 2.
	 */
	CryptoJS.pad.Iso97971 = {
	    pad: function (data, blockSize) {
	        // Add 0x80 byte
	        data.concat(CryptoJS.lib.WordArray.create([0x80000000], 1));

	        // Zero pad the rest
	        CryptoJS.pad.ZeroPadding.pad(data, blockSize);
	    },

	    unpad: function (data) {
	        // Remove zero padding
	        CryptoJS.pad.ZeroPadding.unpad(data);

	        // Remove one more byte -- the 0x80 byte
	        data.sigBytes--;
	    }
	};


	/**
	 * Zero padding strategy.
	 */
	CryptoJS.pad.ZeroPadding = {
	    pad: function (data, blockSize) {
	        // Shortcut
	        var blockSizeBytes = blockSize * 4;

	        // Pad
	        data.clamp();
	        data.sigBytes += blockSizeBytes - ((data.sigBytes % blockSizeBytes) || blockSizeBytes);
	    },

	    unpad: function (data) {
	        // Shortcut
	        var dataWords = data.words;

	        // Unpad
	        var i = data.sigBytes - 1;
	        for (var i = data.sigBytes - 1; i >= 0; i--) {
	            if (((dataWords[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff)) {
	                data.sigBytes = i + 1;
	                break;
	            }
	        }
	    }
	};


	/**
	 * A noop padding strategy.
	 */
	CryptoJS.pad.NoPadding = {
	    pad: function () {
	    },

	    unpad: function () {
	    }
	};


	(function (undefined) {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var CipherParams = C_lib.CipherParams;
	    var C_enc = C.enc;
	    var Hex = C_enc.Hex;
	    var C_format = C.format;

	    var HexFormatter = C_format.Hex = {
	        /**
	         * Converts the ciphertext of a cipher params object to a hexadecimally encoded string.
	         *
	         * @param {CipherParams} cipherParams The cipher params object.
	         *
	         * @return {string} The hexadecimally encoded string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var hexString = CryptoJS.format.Hex.stringify(cipherParams);
	         */
	        stringify: function (cipherParams) {
	            return cipherParams.ciphertext.toString(Hex);
	        },

	        /**
	         * Converts a hexadecimally encoded ciphertext string to a cipher params object.
	         *
	         * @param {string} input The hexadecimally encoded string.
	         *
	         * @return {CipherParams} The cipher params object.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var cipherParams = CryptoJS.format.Hex.parse(hexString);
	         */
	        parse: function (input) {
	            var ciphertext = Hex.parse(input);
	            return CipherParams.create({ ciphertext: ciphertext });
	        }
	    };
	}());


	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var BlockCipher = C_lib.BlockCipher;
	    var C_algo = C.algo;

	    // Lookup tables
	    var SBOX = [];
	    var INV_SBOX = [];
	    var SUB_MIX_0 = [];
	    var SUB_MIX_1 = [];
	    var SUB_MIX_2 = [];
	    var SUB_MIX_3 = [];
	    var INV_SUB_MIX_0 = [];
	    var INV_SUB_MIX_1 = [];
	    var INV_SUB_MIX_2 = [];
	    var INV_SUB_MIX_3 = [];

	    // Compute lookup tables
	    (function () {
	        // Compute double table
	        var d = [];
	        for (var i = 0; i < 256; i++) {
	            if (i < 128) {
	                d[i] = i << 1;
	            } else {
	                d[i] = (i << 1) ^ 0x11b;
	            }
	        }

	        // Walk GF(2^8)
	        var x = 0;
	        var xi = 0;
	        for (var i = 0; i < 256; i++) {
	            // Compute sbox
	            var sx = xi ^ (xi << 1) ^ (xi << 2) ^ (xi << 3) ^ (xi << 4);
	            sx = (sx >>> 8) ^ (sx & 0xff) ^ 0x63;
	            SBOX[x] = sx;
	            INV_SBOX[sx] = x;

	            // Compute multiplication
	            var x2 = d[x];
	            var x4 = d[x2];
	            var x8 = d[x4];

	            // Compute sub bytes, mix columns tables
	            var t = (d[sx] * 0x101) ^ (sx * 0x1010100);
	            SUB_MIX_0[x] = (t << 24) | (t >>> 8);
	            SUB_MIX_1[x] = (t << 16) | (t >>> 16);
	            SUB_MIX_2[x] = (t << 8)  | (t >>> 24);
	            SUB_MIX_3[x] = t;

	            // Compute inv sub bytes, inv mix columns tables
	            var t = (x8 * 0x1010101) ^ (x4 * 0x10001) ^ (x2 * 0x101) ^ (x * 0x1010100);
	            INV_SUB_MIX_0[sx] = (t << 24) | (t >>> 8);
	            INV_SUB_MIX_1[sx] = (t << 16) | (t >>> 16);
	            INV_SUB_MIX_2[sx] = (t << 8)  | (t >>> 24);
	            INV_SUB_MIX_3[sx] = t;

	            // Compute next counter
	            if (!x) {
	                x = xi = 1;
	            } else {
	                x = x2 ^ d[d[d[x8 ^ x2]]];
	                xi ^= d[d[xi]];
	            }
	        }
	    }());

	    // Precomputed Rcon lookup
	    var RCON = [0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

	    /**
	     * AES block cipher algorithm.
	     */
	    var AES = C_algo.AES = BlockCipher.extend({
	        _doReset: function () {
	            var t;

	            // Skip reset of nRounds has been set before and key did not change
	            if (this._nRounds && this._keyPriorReset === this._key) {
	                return;
	            }

	            // Shortcuts
	            var key = this._keyPriorReset = this._key;
	            var keyWords = key.words;
	            var keySize = key.sigBytes / 4;

	            // Compute number of rounds
	            var nRounds = this._nRounds = keySize + 6;

	            // Compute number of key schedule rows
	            var ksRows = (nRounds + 1) * 4;

	            // Compute key schedule
	            var keySchedule = this._keySchedule = [];
	            for (var ksRow = 0; ksRow < ksRows; ksRow++) {
	                if (ksRow < keySize) {
	                    keySchedule[ksRow] = keyWords[ksRow];
	                } else {
	                    t = keySchedule[ksRow - 1];

	                    if (!(ksRow % keySize)) {
	                        // Rot word
	                        t = (t << 8) | (t >>> 24);

	                        // Sub word
	                        t = (SBOX[t >>> 24] << 24) | (SBOX[(t >>> 16) & 0xff] << 16) | (SBOX[(t >>> 8) & 0xff] << 8) | SBOX[t & 0xff];

	                        // Mix Rcon
	                        t ^= RCON[(ksRow / keySize) | 0] << 24;
	                    } else if (keySize > 6 && ksRow % keySize == 4) {
	                        // Sub word
	                        t = (SBOX[t >>> 24] << 24) | (SBOX[(t >>> 16) & 0xff] << 16) | (SBOX[(t >>> 8) & 0xff] << 8) | SBOX[t & 0xff];
	                    }

	                    keySchedule[ksRow] = keySchedule[ksRow - keySize] ^ t;
	                }
	            }

	            // Compute inv key schedule
	            var invKeySchedule = this._invKeySchedule = [];
	            for (var invKsRow = 0; invKsRow < ksRows; invKsRow++) {
	                var ksRow = ksRows - invKsRow;

	                if (invKsRow % 4) {
	                    var t = keySchedule[ksRow];
	                } else {
	                    var t = keySchedule[ksRow - 4];
	                }

	                if (invKsRow < 4 || ksRow <= 4) {
	                    invKeySchedule[invKsRow] = t;
	                } else {
	                    invKeySchedule[invKsRow] = INV_SUB_MIX_0[SBOX[t >>> 24]] ^ INV_SUB_MIX_1[SBOX[(t >>> 16) & 0xff]] ^
	                                               INV_SUB_MIX_2[SBOX[(t >>> 8) & 0xff]] ^ INV_SUB_MIX_3[SBOX[t & 0xff]];
	                }
	            }
	        },

	        encryptBlock: function (M, offset) {
	            this._doCryptBlock(M, offset, this._keySchedule, SUB_MIX_0, SUB_MIX_1, SUB_MIX_2, SUB_MIX_3, SBOX);
	        },

	        decryptBlock: function (M, offset) {
	            // Swap 2nd and 4th rows
	            var t = M[offset + 1];
	            M[offset + 1] = M[offset + 3];
	            M[offset + 3] = t;

	            this._doCryptBlock(M, offset, this._invKeySchedule, INV_SUB_MIX_0, INV_SUB_MIX_1, INV_SUB_MIX_2, INV_SUB_MIX_3, INV_SBOX);

	            // Inv swap 2nd and 4th rows
	            var t = M[offset + 1];
	            M[offset + 1] = M[offset + 3];
	            M[offset + 3] = t;
	        },

	        _doCryptBlock: function (M, offset, keySchedule, SUB_MIX_0, SUB_MIX_1, SUB_MIX_2, SUB_MIX_3, SBOX) {
	            // Shortcut
	            var nRounds = this._nRounds;

	            // Get input, add round key
	            var s0 = M[offset]     ^ keySchedule[0];
	            var s1 = M[offset + 1] ^ keySchedule[1];
	            var s2 = M[offset + 2] ^ keySchedule[2];
	            var s3 = M[offset + 3] ^ keySchedule[3];

	            // Key schedule row counter
	            var ksRow = 4;

	            // Rounds
	            for (var round = 1; round < nRounds; round++) {
	                // Shift rows, sub bytes, mix columns, add round key
	                var t0 = SUB_MIX_0[s0 >>> 24] ^ SUB_MIX_1[(s1 >>> 16) & 0xff] ^ SUB_MIX_2[(s2 >>> 8) & 0xff] ^ SUB_MIX_3[s3 & 0xff] ^ keySchedule[ksRow++];
	                var t1 = SUB_MIX_0[s1 >>> 24] ^ SUB_MIX_1[(s2 >>> 16) & 0xff] ^ SUB_MIX_2[(s3 >>> 8) & 0xff] ^ SUB_MIX_3[s0 & 0xff] ^ keySchedule[ksRow++];
	                var t2 = SUB_MIX_0[s2 >>> 24] ^ SUB_MIX_1[(s3 >>> 16) & 0xff] ^ SUB_MIX_2[(s0 >>> 8) & 0xff] ^ SUB_MIX_3[s1 & 0xff] ^ keySchedule[ksRow++];
	                var t3 = SUB_MIX_0[s3 >>> 24] ^ SUB_MIX_1[(s0 >>> 16) & 0xff] ^ SUB_MIX_2[(s1 >>> 8) & 0xff] ^ SUB_MIX_3[s2 & 0xff] ^ keySchedule[ksRow++];

	                // Update state
	                s0 = t0;
	                s1 = t1;
	                s2 = t2;
	                s3 = t3;
	            }

	            // Shift rows, sub bytes, add round key
	            var t0 = ((SBOX[s0 >>> 24] << 24) | (SBOX[(s1 >>> 16) & 0xff] << 16) | (SBOX[(s2 >>> 8) & 0xff] << 8) | SBOX[s3 & 0xff]) ^ keySchedule[ksRow++];
	            var t1 = ((SBOX[s1 >>> 24] << 24) | (SBOX[(s2 >>> 16) & 0xff] << 16) | (SBOX[(s3 >>> 8) & 0xff] << 8) | SBOX[s0 & 0xff]) ^ keySchedule[ksRow++];
	            var t2 = ((SBOX[s2 >>> 24] << 24) | (SBOX[(s3 >>> 16) & 0xff] << 16) | (SBOX[(s0 >>> 8) & 0xff] << 8) | SBOX[s1 & 0xff]) ^ keySchedule[ksRow++];
	            var t3 = ((SBOX[s3 >>> 24] << 24) | (SBOX[(s0 >>> 16) & 0xff] << 16) | (SBOX[(s1 >>> 8) & 0xff] << 8) | SBOX[s2 & 0xff]) ^ keySchedule[ksRow++];

	            // Set output
	            M[offset]     = t0;
	            M[offset + 1] = t1;
	            M[offset + 2] = t2;
	            M[offset + 3] = t3;
	        },

	        keySize: 256/32
	    });

	    /**
	     * Shortcut functions to the cipher's object interface.
	     *
	     * @example
	     *
	     *     var ciphertext = CryptoJS.AES.encrypt(message, key, cfg);
	     *     var plaintext  = CryptoJS.AES.decrypt(ciphertext, key, cfg);
	     */
	    C.AES = BlockCipher._createHelper(AES);
	}());


	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var BlockCipher = C_lib.BlockCipher;
	    var C_algo = C.algo;

	    // Permuted Choice 1 constants
	    var PC1 = [
	        57, 49, 41, 33, 25, 17, 9,  1,
	        58, 50, 42, 34, 26, 18, 10, 2,
	        59, 51, 43, 35, 27, 19, 11, 3,
	        60, 52, 44, 36, 63, 55, 47, 39,
	        31, 23, 15, 7,  62, 54, 46, 38,
	        30, 22, 14, 6,  61, 53, 45, 37,
	        29, 21, 13, 5,  28, 20, 12, 4
	    ];

	    // Permuted Choice 2 constants
	    var PC2 = [
	        14, 17, 11, 24, 1,  5,
	        3,  28, 15, 6,  21, 10,
	        23, 19, 12, 4,  26, 8,
	        16, 7,  27, 20, 13, 2,
	        41, 52, 31, 37, 47, 55,
	        30, 40, 51, 45, 33, 48,
	        44, 49, 39, 56, 34, 53,
	        46, 42, 50, 36, 29, 32
	    ];

	    // Cumulative bit shift constants
	    var BIT_SHIFTS = [1,  2,  4,  6,  8,  10, 12, 14, 15, 17, 19, 21, 23, 25, 27, 28];

	    // SBOXes and round permutation constants
	    var SBOX_P = [
	        {
	            0x0: 0x808200,
	            0x10000000: 0x8000,
	            0x20000000: 0x808002,
	            0x30000000: 0x2,
	            0x40000000: 0x200,
	            0x50000000: 0x808202,
	            0x60000000: 0x800202,
	            0x70000000: 0x800000,
	            0x80000000: 0x202,
	            0x90000000: 0x800200,
	            0xa0000000: 0x8200,
	            0xb0000000: 0x808000,
	            0xc0000000: 0x8002,
	            0xd0000000: 0x800002,
	            0xe0000000: 0x0,
	            0xf0000000: 0x8202,
	            0x8000000: 0x0,
	            0x18000000: 0x808202,
	            0x28000000: 0x8202,
	            0x38000000: 0x8000,
	            0x48000000: 0x808200,
	            0x58000000: 0x200,
	            0x68000000: 0x808002,
	            0x78000000: 0x2,
	            0x88000000: 0x800200,
	            0x98000000: 0x8200,
	            0xa8000000: 0x808000,
	            0xb8000000: 0x800202,
	            0xc8000000: 0x800002,
	            0xd8000000: 0x8002,
	            0xe8000000: 0x202,
	            0xf8000000: 0x800000,
	            0x1: 0x8000,
	            0x10000001: 0x2,
	            0x20000001: 0x808200,
	            0x30000001: 0x800000,
	            0x40000001: 0x808002,
	            0x50000001: 0x8200,
	            0x60000001: 0x200,
	            0x70000001: 0x800202,
	            0x80000001: 0x808202,
	            0x90000001: 0x808000,
	            0xa0000001: 0x800002,
	            0xb0000001: 0x8202,
	            0xc0000001: 0x202,
	            0xd0000001: 0x800200,
	            0xe0000001: 0x8002,
	            0xf0000001: 0x0,
	            0x8000001: 0x808202,
	            0x18000001: 0x808000,
	            0x28000001: 0x800000,
	            0x38000001: 0x200,
	            0x48000001: 0x8000,
	            0x58000001: 0x800002,
	            0x68000001: 0x2,
	            0x78000001: 0x8202,
	            0x88000001: 0x8002,
	            0x98000001: 0x800202,
	            0xa8000001: 0x202,
	            0xb8000001: 0x808200,
	            0xc8000001: 0x800200,
	            0xd8000001: 0x0,
	            0xe8000001: 0x8200,
	            0xf8000001: 0x808002
	        },
	        {
	            0x0: 0x40084010,
	            0x1000000: 0x4000,
	            0x2000000: 0x80000,
	            0x3000000: 0x40080010,
	            0x4000000: 0x40000010,
	            0x5000000: 0x40084000,
	            0x6000000: 0x40004000,
	            0x7000000: 0x10,
	            0x8000000: 0x84000,
	            0x9000000: 0x40004010,
	            0xa000000: 0x40000000,
	            0xb000000: 0x84010,
	            0xc000000: 0x80010,
	            0xd000000: 0x0,
	            0xe000000: 0x4010,
	            0xf000000: 0x40080000,
	            0x800000: 0x40004000,
	            0x1800000: 0x84010,
	            0x2800000: 0x10,
	            0x3800000: 0x40004010,
	            0x4800000: 0x40084010,
	            0x5800000: 0x40000000,
	            0x6800000: 0x80000,
	            0x7800000: 0x40080010,
	            0x8800000: 0x80010,
	            0x9800000: 0x0,
	            0xa800000: 0x4000,
	            0xb800000: 0x40080000,
	            0xc800000: 0x40000010,
	            0xd800000: 0x84000,
	            0xe800000: 0x40084000,
	            0xf800000: 0x4010,
	            0x10000000: 0x0,
	            0x11000000: 0x40080010,
	            0x12000000: 0x40004010,
	            0x13000000: 0x40084000,
	            0x14000000: 0x40080000,
	            0x15000000: 0x10,
	            0x16000000: 0x84010,
	            0x17000000: 0x4000,
	            0x18000000: 0x4010,
	            0x19000000: 0x80000,
	            0x1a000000: 0x80010,
	            0x1b000000: 0x40000010,
	            0x1c000000: 0x84000,
	            0x1d000000: 0x40004000,
	            0x1e000000: 0x40000000,
	            0x1f000000: 0x40084010,
	            0x10800000: 0x84010,
	            0x11800000: 0x80000,
	            0x12800000: 0x40080000,
	            0x13800000: 0x4000,
	            0x14800000: 0x40004000,
	            0x15800000: 0x40084010,
	            0x16800000: 0x10,
	            0x17800000: 0x40000000,
	            0x18800000: 0x40084000,
	            0x19800000: 0x40000010,
	            0x1a800000: 0x40004010,
	            0x1b800000: 0x80010,
	            0x1c800000: 0x0,
	            0x1d800000: 0x4010,
	            0x1e800000: 0x40080010,
	            0x1f800000: 0x84000
	        },
	        {
	            0x0: 0x104,
	            0x100000: 0x0,
	            0x200000: 0x4000100,
	            0x300000: 0x10104,
	            0x400000: 0x10004,
	            0x500000: 0x4000004,
	            0x600000: 0x4010104,
	            0x700000: 0x4010000,
	            0x800000: 0x4000000,
	            0x900000: 0x4010100,
	            0xa00000: 0x10100,
	            0xb00000: 0x4010004,
	            0xc00000: 0x4000104,
	            0xd00000: 0x10000,
	            0xe00000: 0x4,
	            0xf00000: 0x100,
	            0x80000: 0x4010100,
	            0x180000: 0x4010004,
	            0x280000: 0x0,
	            0x380000: 0x4000100,
	            0x480000: 0x4000004,
	            0x580000: 0x10000,
	            0x680000: 0x10004,
	            0x780000: 0x104,
	            0x880000: 0x4,
	            0x980000: 0x100,
	            0xa80000: 0x4010000,
	            0xb80000: 0x10104,
	            0xc80000: 0x10100,
	            0xd80000: 0x4000104,
	            0xe80000: 0x4010104,
	            0xf80000: 0x4000000,
	            0x1000000: 0x4010100,
	            0x1100000: 0x10004,
	            0x1200000: 0x10000,
	            0x1300000: 0x4000100,
	            0x1400000: 0x100,
	            0x1500000: 0x4010104,
	            0x1600000: 0x4000004,
	            0x1700000: 0x0,
	            0x1800000: 0x4000104,
	            0x1900000: 0x4000000,
	            0x1a00000: 0x4,
	            0x1b00000: 0x10100,
	            0x1c00000: 0x4010000,
	            0x1d00000: 0x104,
	            0x1e00000: 0x10104,
	            0x1f00000: 0x4010004,
	            0x1080000: 0x4000000,
	            0x1180000: 0x104,
	            0x1280000: 0x4010100,
	            0x1380000: 0x0,
	            0x1480000: 0x10004,
	            0x1580000: 0x4000100,
	            0x1680000: 0x100,
	            0x1780000: 0x4010004,
	            0x1880000: 0x10000,
	            0x1980000: 0x4010104,
	            0x1a80000: 0x10104,
	            0x1b80000: 0x4000004,
	            0x1c80000: 0x4000104,
	            0x1d80000: 0x4010000,
	            0x1e80000: 0x4,
	            0x1f80000: 0x10100
	        },
	        {
	            0x0: 0x80401000,
	            0x10000: 0x80001040,
	            0x20000: 0x401040,
	            0x30000: 0x80400000,
	            0x40000: 0x0,
	            0x50000: 0x401000,
	            0x60000: 0x80000040,
	            0x70000: 0x400040,
	            0x80000: 0x80000000,
	            0x90000: 0x400000,
	            0xa0000: 0x40,
	            0xb0000: 0x80001000,
	            0xc0000: 0x80400040,
	            0xd0000: 0x1040,
	            0xe0000: 0x1000,
	            0xf0000: 0x80401040,
	            0x8000: 0x80001040,
	            0x18000: 0x40,
	            0x28000: 0x80400040,
	            0x38000: 0x80001000,
	            0x48000: 0x401000,
	            0x58000: 0x80401040,
	            0x68000: 0x0,
	            0x78000: 0x80400000,
	            0x88000: 0x1000,
	            0x98000: 0x80401000,
	            0xa8000: 0x400000,
	            0xb8000: 0x1040,
	            0xc8000: 0x80000000,
	            0xd8000: 0x400040,
	            0xe8000: 0x401040,
	            0xf8000: 0x80000040,
	            0x100000: 0x400040,
	            0x110000: 0x401000,
	            0x120000: 0x80000040,
	            0x130000: 0x0,
	            0x140000: 0x1040,
	            0x150000: 0x80400040,
	            0x160000: 0x80401000,
	            0x170000: 0x80001040,
	            0x180000: 0x80401040,
	            0x190000: 0x80000000,
	            0x1a0000: 0x80400000,
	            0x1b0000: 0x401040,
	            0x1c0000: 0x80001000,
	            0x1d0000: 0x400000,
	            0x1e0000: 0x40,
	            0x1f0000: 0x1000,
	            0x108000: 0x80400000,
	            0x118000: 0x80401040,
	            0x128000: 0x0,
	            0x138000: 0x401000,
	            0x148000: 0x400040,
	            0x158000: 0x80000000,
	            0x168000: 0x80001040,
	            0x178000: 0x40,
	            0x188000: 0x80000040,
	            0x198000: 0x1000,
	            0x1a8000: 0x80001000,
	            0x1b8000: 0x80400040,
	            0x1c8000: 0x1040,
	            0x1d8000: 0x80401000,
	            0x1e8000: 0x400000,
	            0x1f8000: 0x401040
	        },
	        {
	            0x0: 0x80,
	            0x1000: 0x1040000,
	            0x2000: 0x40000,
	            0x3000: 0x20000000,
	            0x4000: 0x20040080,
	            0x5000: 0x1000080,
	            0x6000: 0x21000080,
	            0x7000: 0x40080,
	            0x8000: 0x1000000,
	            0x9000: 0x20040000,
	            0xa000: 0x20000080,
	            0xb000: 0x21040080,
	            0xc000: 0x21040000,
	            0xd000: 0x0,
	            0xe000: 0x1040080,
	            0xf000: 0x21000000,
	            0x800: 0x1040080,
	            0x1800: 0x21000080,
	            0x2800: 0x80,
	            0x3800: 0x1040000,
	            0x4800: 0x40000,
	            0x5800: 0x20040080,
	            0x6800: 0x21040000,
	            0x7800: 0x20000000,
	            0x8800: 0x20040000,
	            0x9800: 0x0,
	            0xa800: 0x21040080,
	            0xb800: 0x1000080,
	            0xc800: 0x20000080,
	            0xd800: 0x21000000,
	            0xe800: 0x1000000,
	            0xf800: 0x40080,
	            0x10000: 0x40000,
	            0x11000: 0x80,
	            0x12000: 0x20000000,
	            0x13000: 0x21000080,
	            0x14000: 0x1000080,
	            0x15000: 0x21040000,
	            0x16000: 0x20040080,
	            0x17000: 0x1000000,
	            0x18000: 0x21040080,
	            0x19000: 0x21000000,
	            0x1a000: 0x1040000,
	            0x1b000: 0x20040000,
	            0x1c000: 0x40080,
	            0x1d000: 0x20000080,
	            0x1e000: 0x0,
	            0x1f000: 0x1040080,
	            0x10800: 0x21000080,
	            0x11800: 0x1000000,
	            0x12800: 0x1040000,
	            0x13800: 0x20040080,
	            0x14800: 0x20000000,
	            0x15800: 0x1040080,
	            0x16800: 0x80,
	            0x17800: 0x21040000,
	            0x18800: 0x40080,
	            0x19800: 0x21040080,
	            0x1a800: 0x0,
	            0x1b800: 0x21000000,
	            0x1c800: 0x1000080,
	            0x1d800: 0x40000,
	            0x1e800: 0x20040000,
	            0x1f800: 0x20000080
	        },
	        {
	            0x0: 0x10000008,
	            0x100: 0x2000,
	            0x200: 0x10200000,
	            0x300: 0x10202008,
	            0x400: 0x10002000,
	            0x500: 0x200000,
	            0x600: 0x200008,
	            0x700: 0x10000000,
	            0x800: 0x0,
	            0x900: 0x10002008,
	            0xa00: 0x202000,
	            0xb00: 0x8,
	            0xc00: 0x10200008,
	            0xd00: 0x202008,
	            0xe00: 0x2008,
	            0xf00: 0x10202000,
	            0x80: 0x10200000,
	            0x180: 0x10202008,
	            0x280: 0x8,
	            0x380: 0x200000,
	            0x480: 0x202008,
	            0x580: 0x10000008,
	            0x680: 0x10002000,
	            0x780: 0x2008,
	            0x880: 0x200008,
	            0x980: 0x2000,
	            0xa80: 0x10002008,
	            0xb80: 0x10200008,
	            0xc80: 0x0,
	            0xd80: 0x10202000,
	            0xe80: 0x202000,
	            0xf80: 0x10000000,
	            0x1000: 0x10002000,
	            0x1100: 0x10200008,
	            0x1200: 0x10202008,
	            0x1300: 0x2008,
	            0x1400: 0x200000,
	            0x1500: 0x10000000,
	            0x1600: 0x10000008,
	            0x1700: 0x202000,
	            0x1800: 0x202008,
	            0x1900: 0x0,
	            0x1a00: 0x8,
	            0x1b00: 0x10200000,
	            0x1c00: 0x2000,
	            0x1d00: 0x10002008,
	            0x1e00: 0x10202000,
	            0x1f00: 0x200008,
	            0x1080: 0x8,
	            0x1180: 0x202000,
	            0x1280: 0x200000,
	            0x1380: 0x10000008,
	            0x1480: 0x10002000,
	            0x1580: 0x2008,
	            0x1680: 0x10202008,
	            0x1780: 0x10200000,
	            0x1880: 0x10202000,
	            0x1980: 0x10200008,
	            0x1a80: 0x2000,
	            0x1b80: 0x202008,
	            0x1c80: 0x200008,
	            0x1d80: 0x0,
	            0x1e80: 0x10000000,
	            0x1f80: 0x10002008
	        },
	        {
	            0x0: 0x100000,
	            0x10: 0x2000401,
	            0x20: 0x400,
	            0x30: 0x100401,
	            0x40: 0x2100401,
	            0x50: 0x0,
	            0x60: 0x1,
	            0x70: 0x2100001,
	            0x80: 0x2000400,
	            0x90: 0x100001,
	            0xa0: 0x2000001,
	            0xb0: 0x2100400,
	            0xc0: 0x2100000,
	            0xd0: 0x401,
	            0xe0: 0x100400,
	            0xf0: 0x2000000,
	            0x8: 0x2100001,
	            0x18: 0x0,
	            0x28: 0x2000401,
	            0x38: 0x2100400,
	            0x48: 0x100000,
	            0x58: 0x2000001,
	            0x68: 0x2000000,
	            0x78: 0x401,
	            0x88: 0x100401,
	            0x98: 0x2000400,
	            0xa8: 0x2100000,
	            0xb8: 0x100001,
	            0xc8: 0x400,
	            0xd8: 0x2100401,
	            0xe8: 0x1,
	            0xf8: 0x100400,
	            0x100: 0x2000000,
	            0x110: 0x100000,
	            0x120: 0x2000401,
	            0x130: 0x2100001,
	            0x140: 0x100001,
	            0x150: 0x2000400,
	            0x160: 0x2100400,
	            0x170: 0x100401,
	            0x180: 0x401,
	            0x190: 0x2100401,
	            0x1a0: 0x100400,
	            0x1b0: 0x1,
	            0x1c0: 0x0,
	            0x1d0: 0x2100000,
	            0x1e0: 0x2000001,
	            0x1f0: 0x400,
	            0x108: 0x100400,
	            0x118: 0x2000401,
	            0x128: 0x2100001,
	            0x138: 0x1,
	            0x148: 0x2000000,
	            0x158: 0x100000,
	            0x168: 0x401,
	            0x178: 0x2100400,
	            0x188: 0x2000001,
	            0x198: 0x2100000,
	            0x1a8: 0x0,
	            0x1b8: 0x2100401,
	            0x1c8: 0x100401,
	            0x1d8: 0x400,
	            0x1e8: 0x2000400,
	            0x1f8: 0x100001
	        },
	        {
	            0x0: 0x8000820,
	            0x1: 0x20000,
	            0x2: 0x8000000,
	            0x3: 0x20,
	            0x4: 0x20020,
	            0x5: 0x8020820,
	            0x6: 0x8020800,
	            0x7: 0x800,
	            0x8: 0x8020000,
	            0x9: 0x8000800,
	            0xa: 0x20800,
	            0xb: 0x8020020,
	            0xc: 0x820,
	            0xd: 0x0,
	            0xe: 0x8000020,
	            0xf: 0x20820,
	            0x80000000: 0x800,
	            0x80000001: 0x8020820,
	            0x80000002: 0x8000820,
	            0x80000003: 0x8000000,
	            0x80000004: 0x8020000,
	            0x80000005: 0x20800,
	            0x80000006: 0x20820,
	            0x80000007: 0x20,
	            0x80000008: 0x8000020,
	            0x80000009: 0x820,
	            0x8000000a: 0x20020,
	            0x8000000b: 0x8020800,
	            0x8000000c: 0x0,
	            0x8000000d: 0x8020020,
	            0x8000000e: 0x8000800,
	            0x8000000f: 0x20000,
	            0x10: 0x20820,
	            0x11: 0x8020800,
	            0x12: 0x20,
	            0x13: 0x800,
	            0x14: 0x8000800,
	            0x15: 0x8000020,
	            0x16: 0x8020020,
	            0x17: 0x20000,
	            0x18: 0x0,
	            0x19: 0x20020,
	            0x1a: 0x8020000,
	            0x1b: 0x8000820,
	            0x1c: 0x8020820,
	            0x1d: 0x20800,
	            0x1e: 0x820,
	            0x1f: 0x8000000,
	            0x80000010: 0x20000,
	            0x80000011: 0x800,
	            0x80000012: 0x8020020,
	            0x80000013: 0x20820,
	            0x80000014: 0x20,
	            0x80000015: 0x8020000,
	            0x80000016: 0x8000000,
	            0x80000017: 0x8000820,
	            0x80000018: 0x8020820,
	            0x80000019: 0x8000020,
	            0x8000001a: 0x8000800,
	            0x8000001b: 0x0,
	            0x8000001c: 0x20800,
	            0x8000001d: 0x820,
	            0x8000001e: 0x20020,
	            0x8000001f: 0x8020800
	        }
	    ];

	    // Masks that select the SBOX input
	    var SBOX_MASK = [
	        0xf8000001, 0x1f800000, 0x01f80000, 0x001f8000,
	        0x0001f800, 0x00001f80, 0x000001f8, 0x8000001f
	    ];

	    /**
	     * DES block cipher algorithm.
	     */
	    var DES = C_algo.DES = BlockCipher.extend({
	        _doReset: function () {
	            // Shortcuts
	            var key = this._key;
	            var keyWords = key.words;

	            // Select 56 bits according to PC1
	            var keyBits = [];
	            for (var i = 0; i < 56; i++) {
	                var keyBitPos = PC1[i] - 1;
	                keyBits[i] = (keyWords[keyBitPos >>> 5] >>> (31 - keyBitPos % 32)) & 1;
	            }

	            // Assemble 16 subkeys
	            var subKeys = this._subKeys = [];
	            for (var nSubKey = 0; nSubKey < 16; nSubKey++) {
	                // Create subkey
	                var subKey = subKeys[nSubKey] = [];

	                // Shortcut
	                var bitShift = BIT_SHIFTS[nSubKey];

	                // Select 48 bits according to PC2
	                for (var i = 0; i < 24; i++) {
	                    // Select from the left 28 key bits
	                    subKey[(i / 6) | 0] |= keyBits[((PC2[i] - 1) + bitShift) % 28] << (31 - i % 6);

	                    // Select from the right 28 key bits
	                    subKey[4 + ((i / 6) | 0)] |= keyBits[28 + (((PC2[i + 24] - 1) + bitShift) % 28)] << (31 - i % 6);
	                }

	                // Since each subkey is applied to an expanded 32-bit input,
	                // the subkey can be broken into 8 values scaled to 32-bits,
	                // which allows the key to be used without expansion
	                subKey[0] = (subKey[0] << 1) | (subKey[0] >>> 31);
	                for (var i = 1; i < 7; i++) {
	                    subKey[i] = subKey[i] >>> ((i - 1) * 4 + 3);
	                }
	                subKey[7] = (subKey[7] << 5) | (subKey[7] >>> 27);
	            }

	            // Compute inverse subkeys
	            var invSubKeys = this._invSubKeys = [];
	            for (var i = 0; i < 16; i++) {
	                invSubKeys[i] = subKeys[15 - i];
	            }
	        },

	        encryptBlock: function (M, offset) {
	            this._doCryptBlock(M, offset, this._subKeys);
	        },

	        decryptBlock: function (M, offset) {
	            this._doCryptBlock(M, offset, this._invSubKeys);
	        },

	        _doCryptBlock: function (M, offset, subKeys) {
	            // Get input
	            this._lBlock = M[offset];
	            this._rBlock = M[offset + 1];

	            // Initial permutation
	            exchangeLR.call(this, 4,  0x0f0f0f0f);
	            exchangeLR.call(this, 16, 0x0000ffff);
	            exchangeRL.call(this, 2,  0x33333333);
	            exchangeRL.call(this, 8,  0x00ff00ff);
	            exchangeLR.call(this, 1,  0x55555555);

	            // Rounds
	            for (var round = 0; round < 16; round++) {
	                // Shortcuts
	                var subKey = subKeys[round];
	                var lBlock = this._lBlock;
	                var rBlock = this._rBlock;

	                // Feistel function
	                var f = 0;
	                for (var i = 0; i < 8; i++) {
	                    f |= SBOX_P[i][((rBlock ^ subKey[i]) & SBOX_MASK[i]) >>> 0];
	                }
	                this._lBlock = rBlock;
	                this._rBlock = lBlock ^ f;
	            }

	            // Undo swap from last round
	            var t = this._lBlock;
	            this._lBlock = this._rBlock;
	            this._rBlock = t;

	            // Final permutation
	            exchangeLR.call(this, 1,  0x55555555);
	            exchangeRL.call(this, 8,  0x00ff00ff);
	            exchangeRL.call(this, 2,  0x33333333);
	            exchangeLR.call(this, 16, 0x0000ffff);
	            exchangeLR.call(this, 4,  0x0f0f0f0f);

	            // Set output
	            M[offset] = this._lBlock;
	            M[offset + 1] = this._rBlock;
	        },

	        keySize: 64/32,

	        ivSize: 64/32,

	        blockSize: 64/32
	    });

	    // Swap bits across the left and right words
	    function exchangeLR(offset, mask) {
	        var t = ((this._lBlock >>> offset) ^ this._rBlock) & mask;
	        this._rBlock ^= t;
	        this._lBlock ^= t << offset;
	    }

	    function exchangeRL(offset, mask) {
	        var t = ((this._rBlock >>> offset) ^ this._lBlock) & mask;
	        this._lBlock ^= t;
	        this._rBlock ^= t << offset;
	    }

	    /**
	     * Shortcut functions to the cipher's object interface.
	     *
	     * @example
	     *
	     *     var ciphertext = CryptoJS.DES.encrypt(message, key, cfg);
	     *     var plaintext  = CryptoJS.DES.decrypt(ciphertext, key, cfg);
	     */
	    C.DES = BlockCipher._createHelper(DES);

	    /**
	     * Triple-DES block cipher algorithm.
	     */
	    var TripleDES = C_algo.TripleDES = BlockCipher.extend({
	        _doReset: function () {
	            // Shortcuts
	            var key = this._key;
	            var keyWords = key.words;
	            // Make sure the key length is valid (64, 128 or >= 192 bit)
	            if (keyWords.length !== 2 && keyWords.length !== 4 && keyWords.length < 6) {
	                throw new Error('Invalid key length - 3DES requires the key length to be 64, 128, 192 or >192.');
	            }

	            // Extend the key according to the keying options defined in 3DES standard
	            var key1 = keyWords.slice(0, 2);
	            var key2 = keyWords.length < 4 ? keyWords.slice(0, 2) : keyWords.slice(2, 4);
	            var key3 = keyWords.length < 6 ? keyWords.slice(0, 2) : keyWords.slice(4, 6);

	            // Create DES instances
	            this._des1 = DES.createEncryptor(WordArray.create(key1));
	            this._des2 = DES.createEncryptor(WordArray.create(key2));
	            this._des3 = DES.createEncryptor(WordArray.create(key3));
	        },

	        encryptBlock: function (M, offset) {
	            this._des1.encryptBlock(M, offset);
	            this._des2.decryptBlock(M, offset);
	            this._des3.encryptBlock(M, offset);
	        },

	        decryptBlock: function (M, offset) {
	            this._des3.decryptBlock(M, offset);
	            this._des2.encryptBlock(M, offset);
	            this._des1.decryptBlock(M, offset);
	        },

	        keySize: 192/32,

	        ivSize: 64/32,

	        blockSize: 64/32
	    });

	    /**
	     * Shortcut functions to the cipher's object interface.
	     *
	     * @example
	     *
	     *     var ciphertext = CryptoJS.TripleDES.encrypt(message, key, cfg);
	     *     var plaintext  = CryptoJS.TripleDES.decrypt(ciphertext, key, cfg);
	     */
	    C.TripleDES = BlockCipher._createHelper(TripleDES);
	}());


	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var StreamCipher = C_lib.StreamCipher;
	    var C_algo = C.algo;

	    /**
	     * RC4 stream cipher algorithm.
	     */
	    var RC4 = C_algo.RC4 = StreamCipher.extend({
	        _doReset: function () {
	            // Shortcuts
	            var key = this._key;
	            var keyWords = key.words;
	            var keySigBytes = key.sigBytes;

	            // Init sbox
	            var S = this._S = [];
	            for (var i = 0; i < 256; i++) {
	                S[i] = i;
	            }

	            // Key setup
	            for (var i = 0, j = 0; i < 256; i++) {
	                var keyByteIndex = i % keySigBytes;
	                var keyByte = (keyWords[keyByteIndex >>> 2] >>> (24 - (keyByteIndex % 4) * 8)) & 0xff;

	                j = (j + S[i] + keyByte) % 256;

	                // Swap
	                var t = S[i];
	                S[i] = S[j];
	                S[j] = t;
	            }

	            // Counters
	            this._i = this._j = 0;
	        },

	        _doProcessBlock: function (M, offset) {
	            M[offset] ^= generateKeystreamWord.call(this);
	        },

	        keySize: 256/32,

	        ivSize: 0
	    });

	    function generateKeystreamWord() {
	        // Shortcuts
	        var S = this._S;
	        var i = this._i;
	        var j = this._j;

	        // Generate keystream word
	        var keystreamWord = 0;
	        for (var n = 0; n < 4; n++) {
	            i = (i + 1) % 256;
	            j = (j + S[i]) % 256;

	            // Swap
	            var t = S[i];
	            S[i] = S[j];
	            S[j] = t;

	            keystreamWord |= S[(S[i] + S[j]) % 256] << (24 - n * 8);
	        }

	        // Update counters
	        this._i = i;
	        this._j = j;

	        return keystreamWord;
	    }

	    /**
	     * Shortcut functions to the cipher's object interface.
	     *
	     * @example
	     *
	     *     var ciphertext = CryptoJS.RC4.encrypt(message, key, cfg);
	     *     var plaintext  = CryptoJS.RC4.decrypt(ciphertext, key, cfg);
	     */
	    C.RC4 = StreamCipher._createHelper(RC4);

	    /**
	     * Modified RC4 stream cipher algorithm.
	     */
	    var RC4Drop = C_algo.RC4Drop = RC4.extend({
	        /**
	         * Configuration options.
	         *
	         * @property {number} drop The number of keystream words to drop. Default 192
	         */
	        cfg: RC4.cfg.extend({
	            drop: 192
	        }),

	        _doReset: function () {
	            RC4._doReset.call(this);

	            // Drop
	            for (var i = this.cfg.drop; i > 0; i--) {
	                generateKeystreamWord.call(this);
	            }
	        }
	    });

	    /**
	     * Shortcut functions to the cipher's object interface.
	     *
	     * @example
	     *
	     *     var ciphertext = CryptoJS.RC4Drop.encrypt(message, key, cfg);
	     *     var plaintext  = CryptoJS.RC4Drop.decrypt(ciphertext, key, cfg);
	     */
	    C.RC4Drop = StreamCipher._createHelper(RC4Drop);
	}());


	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var StreamCipher = C_lib.StreamCipher;
	    var C_algo = C.algo;

	    // Reusable objects
	    var S  = [];
	    var C_ = [];
	    var G  = [];

	    /**
	     * Rabbit stream cipher algorithm
	     */
	    var Rabbit = C_algo.Rabbit = StreamCipher.extend({
	        _doReset: function () {
	            // Shortcuts
	            var K = this._key.words;
	            var iv = this.cfg.iv;

	            // Swap endian
	            for (var i = 0; i < 4; i++) {
	                K[i] = (((K[i] << 8)  | (K[i] >>> 24)) & 0x00ff00ff) |
	                       (((K[i] << 24) | (K[i] >>> 8))  & 0xff00ff00);
	            }

	            // Generate initial state values
	            var X = this._X = [
	                K[0], (K[3] << 16) | (K[2] >>> 16),
	                K[1], (K[0] << 16) | (K[3] >>> 16),
	                K[2], (K[1] << 16) | (K[0] >>> 16),
	                K[3], (K[2] << 16) | (K[1] >>> 16)
	            ];

	            // Generate initial counter values
	            var C = this._C = [
	                (K[2] << 16) | (K[2] >>> 16), (K[0] & 0xffff0000) | (K[1] & 0x0000ffff),
	                (K[3] << 16) | (K[3] >>> 16), (K[1] & 0xffff0000) | (K[2] & 0x0000ffff),
	                (K[0] << 16) | (K[0] >>> 16), (K[2] & 0xffff0000) | (K[3] & 0x0000ffff),
	                (K[1] << 16) | (K[1] >>> 16), (K[3] & 0xffff0000) | (K[0] & 0x0000ffff)
	            ];

	            // Carry bit
	            this._b = 0;

	            // Iterate the system four times
	            for (var i = 0; i < 4; i++) {
	                nextState.call(this);
	            }

	            // Modify the counters
	            for (var i = 0; i < 8; i++) {
	                C[i] ^= X[(i + 4) & 7];
	            }

	            // IV setup
	            if (iv) {
	                // Shortcuts
	                var IV = iv.words;
	                var IV_0 = IV[0];
	                var IV_1 = IV[1];

	                // Generate four subvectors
	                var i0 = (((IV_0 << 8) | (IV_0 >>> 24)) & 0x00ff00ff) | (((IV_0 << 24) | (IV_0 >>> 8)) & 0xff00ff00);
	                var i2 = (((IV_1 << 8) | (IV_1 >>> 24)) & 0x00ff00ff) | (((IV_1 << 24) | (IV_1 >>> 8)) & 0xff00ff00);
	                var i1 = (i0 >>> 16) | (i2 & 0xffff0000);
	                var i3 = (i2 << 16)  | (i0 & 0x0000ffff);

	                // Modify counter values
	                C[0] ^= i0;
	                C[1] ^= i1;
	                C[2] ^= i2;
	                C[3] ^= i3;
	                C[4] ^= i0;
	                C[5] ^= i1;
	                C[6] ^= i2;
	                C[7] ^= i3;

	                // Iterate the system four times
	                for (var i = 0; i < 4; i++) {
	                    nextState.call(this);
	                }
	            }
	        },

	        _doProcessBlock: function (M, offset) {
	            // Shortcut
	            var X = this._X;

	            // Iterate the system
	            nextState.call(this);

	            // Generate four keystream words
	            S[0] = X[0] ^ (X[5] >>> 16) ^ (X[3] << 16);
	            S[1] = X[2] ^ (X[7] >>> 16) ^ (X[5] << 16);
	            S[2] = X[4] ^ (X[1] >>> 16) ^ (X[7] << 16);
	            S[3] = X[6] ^ (X[3] >>> 16) ^ (X[1] << 16);

	            for (var i = 0; i < 4; i++) {
	                // Swap endian
	                S[i] = (((S[i] << 8)  | (S[i] >>> 24)) & 0x00ff00ff) |
	                       (((S[i] << 24) | (S[i] >>> 8))  & 0xff00ff00);

	                // Encrypt
	                M[offset + i] ^= S[i];
	            }
	        },

	        blockSize: 128/32,

	        ivSize: 64/32
	    });

	    function nextState() {
	        // Shortcuts
	        var X = this._X;
	        var C = this._C;

	        // Save old counter values
	        for (var i = 0; i < 8; i++) {
	            C_[i] = C[i];
	        }

	        // Calculate new counter values
	        C[0] = (C[0] + 0x4d34d34d + this._b) | 0;
	        C[1] = (C[1] + 0xd34d34d3 + ((C[0] >>> 0) < (C_[0] >>> 0) ? 1 : 0)) | 0;
	        C[2] = (C[2] + 0x34d34d34 + ((C[1] >>> 0) < (C_[1] >>> 0) ? 1 : 0)) | 0;
	        C[3] = (C[3] + 0x4d34d34d + ((C[2] >>> 0) < (C_[2] >>> 0) ? 1 : 0)) | 0;
	        C[4] = (C[4] + 0xd34d34d3 + ((C[3] >>> 0) < (C_[3] >>> 0) ? 1 : 0)) | 0;
	        C[5] = (C[5] + 0x34d34d34 + ((C[4] >>> 0) < (C_[4] >>> 0) ? 1 : 0)) | 0;
	        C[6] = (C[6] + 0x4d34d34d + ((C[5] >>> 0) < (C_[5] >>> 0) ? 1 : 0)) | 0;
	        C[7] = (C[7] + 0xd34d34d3 + ((C[6] >>> 0) < (C_[6] >>> 0) ? 1 : 0)) | 0;
	        this._b = (C[7] >>> 0) < (C_[7] >>> 0) ? 1 : 0;

	        // Calculate the g-values
	        for (var i = 0; i < 8; i++) {
	            var gx = X[i] + C[i];

	            // Construct high and low argument for squaring
	            var ga = gx & 0xffff;
	            var gb = gx >>> 16;

	            // Calculate high and low result of squaring
	            var gh = ((((ga * ga) >>> 17) + ga * gb) >>> 15) + gb * gb;
	            var gl = (((gx & 0xffff0000) * gx) | 0) + (((gx & 0x0000ffff) * gx) | 0);

	            // High XOR low
	            G[i] = gh ^ gl;
	        }

	        // Calculate new state values
	        X[0] = (G[0] + ((G[7] << 16) | (G[7] >>> 16)) + ((G[6] << 16) | (G[6] >>> 16))) | 0;
	        X[1] = (G[1] + ((G[0] << 8)  | (G[0] >>> 24)) + G[7]) | 0;
	        X[2] = (G[2] + ((G[1] << 16) | (G[1] >>> 16)) + ((G[0] << 16) | (G[0] >>> 16))) | 0;
	        X[3] = (G[3] + ((G[2] << 8)  | (G[2] >>> 24)) + G[1]) | 0;
	        X[4] = (G[4] + ((G[3] << 16) | (G[3] >>> 16)) + ((G[2] << 16) | (G[2] >>> 16))) | 0;
	        X[5] = (G[5] + ((G[4] << 8)  | (G[4] >>> 24)) + G[3]) | 0;
	        X[6] = (G[6] + ((G[5] << 16) | (G[5] >>> 16)) + ((G[4] << 16) | (G[4] >>> 16))) | 0;
	        X[7] = (G[7] + ((G[6] << 8)  | (G[6] >>> 24)) + G[5]) | 0;
	    }

	    /**
	     * Shortcut functions to the cipher's object interface.
	     *
	     * @example
	     *
	     *     var ciphertext = CryptoJS.Rabbit.encrypt(message, key, cfg);
	     *     var plaintext  = CryptoJS.Rabbit.decrypt(ciphertext, key, cfg);
	     */
	    C.Rabbit = StreamCipher._createHelper(Rabbit);
	}());


	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var StreamCipher = C_lib.StreamCipher;
	    var C_algo = C.algo;

	    // Reusable objects
	    var S  = [];
	    var C_ = [];
	    var G  = [];

	    /**
	     * Rabbit stream cipher algorithm.
	     *
	     * This is a legacy version that neglected to convert the key to little-endian.
	     * This error doesn't affect the cipher's security,
	     * but it does affect its compatibility with other implementations.
	     */
	    var RabbitLegacy = C_algo.RabbitLegacy = StreamCipher.extend({
	        _doReset: function () {
	            // Shortcuts
	            var K = this._key.words;
	            var iv = this.cfg.iv;

	            // Generate initial state values
	            var X = this._X = [
	                K[0], (K[3] << 16) | (K[2] >>> 16),
	                K[1], (K[0] << 16) | (K[3] >>> 16),
	                K[2], (K[1] << 16) | (K[0] >>> 16),
	                K[3], (K[2] << 16) | (K[1] >>> 16)
	            ];

	            // Generate initial counter values
	            var C = this._C = [
	                (K[2] << 16) | (K[2] >>> 16), (K[0] & 0xffff0000) | (K[1] & 0x0000ffff),
	                (K[3] << 16) | (K[3] >>> 16), (K[1] & 0xffff0000) | (K[2] & 0x0000ffff),
	                (K[0] << 16) | (K[0] >>> 16), (K[2] & 0xffff0000) | (K[3] & 0x0000ffff),
	                (K[1] << 16) | (K[1] >>> 16), (K[3] & 0xffff0000) | (K[0] & 0x0000ffff)
	            ];

	            // Carry bit
	            this._b = 0;

	            // Iterate the system four times
	            for (var i = 0; i < 4; i++) {
	                nextState.call(this);
	            }

	            // Modify the counters
	            for (var i = 0; i < 8; i++) {
	                C[i] ^= X[(i + 4) & 7];
	            }

	            // IV setup
	            if (iv) {
	                // Shortcuts
	                var IV = iv.words;
	                var IV_0 = IV[0];
	                var IV_1 = IV[1];

	                // Generate four subvectors
	                var i0 = (((IV_0 << 8) | (IV_0 >>> 24)) & 0x00ff00ff) | (((IV_0 << 24) | (IV_0 >>> 8)) & 0xff00ff00);
	                var i2 = (((IV_1 << 8) | (IV_1 >>> 24)) & 0x00ff00ff) | (((IV_1 << 24) | (IV_1 >>> 8)) & 0xff00ff00);
	                var i1 = (i0 >>> 16) | (i2 & 0xffff0000);
	                var i3 = (i2 << 16)  | (i0 & 0x0000ffff);

	                // Modify counter values
	                C[0] ^= i0;
	                C[1] ^= i1;
	                C[2] ^= i2;
	                C[3] ^= i3;
	                C[4] ^= i0;
	                C[5] ^= i1;
	                C[6] ^= i2;
	                C[7] ^= i3;

	                // Iterate the system four times
	                for (var i = 0; i < 4; i++) {
	                    nextState.call(this);
	                }
	            }
	        },

	        _doProcessBlock: function (M, offset) {
	            // Shortcut
	            var X = this._X;

	            // Iterate the system
	            nextState.call(this);

	            // Generate four keystream words
	            S[0] = X[0] ^ (X[5] >>> 16) ^ (X[3] << 16);
	            S[1] = X[2] ^ (X[7] >>> 16) ^ (X[5] << 16);
	            S[2] = X[4] ^ (X[1] >>> 16) ^ (X[7] << 16);
	            S[3] = X[6] ^ (X[3] >>> 16) ^ (X[1] << 16);

	            for (var i = 0; i < 4; i++) {
	                // Swap endian
	                S[i] = (((S[i] << 8)  | (S[i] >>> 24)) & 0x00ff00ff) |
	                       (((S[i] << 24) | (S[i] >>> 8))  & 0xff00ff00);

	                // Encrypt
	                M[offset + i] ^= S[i];
	            }
	        },

	        blockSize: 128/32,

	        ivSize: 64/32
	    });

	    function nextState() {
	        // Shortcuts
	        var X = this._X;
	        var C = this._C;

	        // Save old counter values
	        for (var i = 0; i < 8; i++) {
	            C_[i] = C[i];
	        }

	        // Calculate new counter values
	        C[0] = (C[0] + 0x4d34d34d + this._b) | 0;
	        C[1] = (C[1] + 0xd34d34d3 + ((C[0] >>> 0) < (C_[0] >>> 0) ? 1 : 0)) | 0;
	        C[2] = (C[2] + 0x34d34d34 + ((C[1] >>> 0) < (C_[1] >>> 0) ? 1 : 0)) | 0;
	        C[3] = (C[3] + 0x4d34d34d + ((C[2] >>> 0) < (C_[2] >>> 0) ? 1 : 0)) | 0;
	        C[4] = (C[4] + 0xd34d34d3 + ((C[3] >>> 0) < (C_[3] >>> 0) ? 1 : 0)) | 0;
	        C[5] = (C[5] + 0x34d34d34 + ((C[4] >>> 0) < (C_[4] >>> 0) ? 1 : 0)) | 0;
	        C[6] = (C[6] + 0x4d34d34d + ((C[5] >>> 0) < (C_[5] >>> 0) ? 1 : 0)) | 0;
	        C[7] = (C[7] + 0xd34d34d3 + ((C[6] >>> 0) < (C_[6] >>> 0) ? 1 : 0)) | 0;
	        this._b = (C[7] >>> 0) < (C_[7] >>> 0) ? 1 : 0;

	        // Calculate the g-values
	        for (var i = 0; i < 8; i++) {
	            var gx = X[i] + C[i];

	            // Construct high and low argument for squaring
	            var ga = gx & 0xffff;
	            var gb = gx >>> 16;

	            // Calculate high and low result of squaring
	            var gh = ((((ga * ga) >>> 17) + ga * gb) >>> 15) + gb * gb;
	            var gl = (((gx & 0xffff0000) * gx) | 0) + (((gx & 0x0000ffff) * gx) | 0);

	            // High XOR low
	            G[i] = gh ^ gl;
	        }

	        // Calculate new state values
	        X[0] = (G[0] + ((G[7] << 16) | (G[7] >>> 16)) + ((G[6] << 16) | (G[6] >>> 16))) | 0;
	        X[1] = (G[1] + ((G[0] << 8)  | (G[0] >>> 24)) + G[7]) | 0;
	        X[2] = (G[2] + ((G[1] << 16) | (G[1] >>> 16)) + ((G[0] << 16) | (G[0] >>> 16))) | 0;
	        X[3] = (G[3] + ((G[2] << 8)  | (G[2] >>> 24)) + G[1]) | 0;
	        X[4] = (G[4] + ((G[3] << 16) | (G[3] >>> 16)) + ((G[2] << 16) | (G[2] >>> 16))) | 0;
	        X[5] = (G[5] + ((G[4] << 8)  | (G[4] >>> 24)) + G[3]) | 0;
	        X[6] = (G[6] + ((G[5] << 16) | (G[5] >>> 16)) + ((G[4] << 16) | (G[4] >>> 16))) | 0;
	        X[7] = (G[7] + ((G[6] << 8)  | (G[6] >>> 24)) + G[5]) | 0;
	    }

	    /**
	     * Shortcut functions to the cipher's object interface.
	     *
	     * @example
	     *
	     *     var ciphertext = CryptoJS.RabbitLegacy.encrypt(message, key, cfg);
	     *     var plaintext  = CryptoJS.RabbitLegacy.decrypt(ciphertext, key, cfg);
	     */
	    C.RabbitLegacy = StreamCipher._createHelper(RabbitLegacy);
	}());


	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var BlockCipher = C_lib.BlockCipher;
	    var C_algo = C.algo;

	    const N = 16;

	    //Origin pbox and sbox, derived from PI
	    const ORIG_P = [
	        0x243F6A88, 0x85A308D3, 0x13198A2E, 0x03707344,
	        0xA4093822, 0x299F31D0, 0x082EFA98, 0xEC4E6C89,
	        0x452821E6, 0x38D01377, 0xBE5466CF, 0x34E90C6C,
	        0xC0AC29B7, 0xC97C50DD, 0x3F84D5B5, 0xB5470917,
	        0x9216D5D9, 0x8979FB1B
	    ];

	    const ORIG_S = [
	        [   0xD1310BA6, 0x98DFB5AC, 0x2FFD72DB, 0xD01ADFB7,
	            0xB8E1AFED, 0x6A267E96, 0xBA7C9045, 0xF12C7F99,
	            0x24A19947, 0xB3916CF7, 0x0801F2E2, 0x858EFC16,
	            0x636920D8, 0x71574E69, 0xA458FEA3, 0xF4933D7E,
	            0x0D95748F, 0x728EB658, 0x718BCD58, 0x82154AEE,
	            0x7B54A41D, 0xC25A59B5, 0x9C30D539, 0x2AF26013,
	            0xC5D1B023, 0x286085F0, 0xCA417918, 0xB8DB38EF,
	            0x8E79DCB0, 0x603A180E, 0x6C9E0E8B, 0xB01E8A3E,
	            0xD71577C1, 0xBD314B27, 0x78AF2FDA, 0x55605C60,
	            0xE65525F3, 0xAA55AB94, 0x57489862, 0x63E81440,
	            0x55CA396A, 0x2AAB10B6, 0xB4CC5C34, 0x1141E8CE,
	            0xA15486AF, 0x7C72E993, 0xB3EE1411, 0x636FBC2A,
	            0x2BA9C55D, 0x741831F6, 0xCE5C3E16, 0x9B87931E,
	            0xAFD6BA33, 0x6C24CF5C, 0x7A325381, 0x28958677,
	            0x3B8F4898, 0x6B4BB9AF, 0xC4BFE81B, 0x66282193,
	            0x61D809CC, 0xFB21A991, 0x487CAC60, 0x5DEC8032,
	            0xEF845D5D, 0xE98575B1, 0xDC262302, 0xEB651B88,
	            0x23893E81, 0xD396ACC5, 0x0F6D6FF3, 0x83F44239,
	            0x2E0B4482, 0xA4842004, 0x69C8F04A, 0x9E1F9B5E,
	            0x21C66842, 0xF6E96C9A, 0x670C9C61, 0xABD388F0,
	            0x6A51A0D2, 0xD8542F68, 0x960FA728, 0xAB5133A3,
	            0x6EEF0B6C, 0x137A3BE4, 0xBA3BF050, 0x7EFB2A98,
	            0xA1F1651D, 0x39AF0176, 0x66CA593E, 0x82430E88,
	            0x8CEE8619, 0x456F9FB4, 0x7D84A5C3, 0x3B8B5EBE,
	            0xE06F75D8, 0x85C12073, 0x401A449F, 0x56C16AA6,
	            0x4ED3AA62, 0x363F7706, 0x1BFEDF72, 0x429B023D,
	            0x37D0D724, 0xD00A1248, 0xDB0FEAD3, 0x49F1C09B,
	            0x075372C9, 0x80991B7B, 0x25D479D8, 0xF6E8DEF7,
	            0xE3FE501A, 0xB6794C3B, 0x976CE0BD, 0x04C006BA,
	            0xC1A94FB6, 0x409F60C4, 0x5E5C9EC2, 0x196A2463,
	            0x68FB6FAF, 0x3E6C53B5, 0x1339B2EB, 0x3B52EC6F,
	            0x6DFC511F, 0x9B30952C, 0xCC814544, 0xAF5EBD09,
	            0xBEE3D004, 0xDE334AFD, 0x660F2807, 0x192E4BB3,
	            0xC0CBA857, 0x45C8740F, 0xD20B5F39, 0xB9D3FBDB,
	            0x5579C0BD, 0x1A60320A, 0xD6A100C6, 0x402C7279,
	            0x679F25FE, 0xFB1FA3CC, 0x8EA5E9F8, 0xDB3222F8,
	            0x3C7516DF, 0xFD616B15, 0x2F501EC8, 0xAD0552AB,
	            0x323DB5FA, 0xFD238760, 0x53317B48, 0x3E00DF82,
	            0x9E5C57BB, 0xCA6F8CA0, 0x1A87562E, 0xDF1769DB,
	            0xD542A8F6, 0x287EFFC3, 0xAC6732C6, 0x8C4F5573,
	            0x695B27B0, 0xBBCA58C8, 0xE1FFA35D, 0xB8F011A0,
	            0x10FA3D98, 0xFD2183B8, 0x4AFCB56C, 0x2DD1D35B,
	            0x9A53E479, 0xB6F84565, 0xD28E49BC, 0x4BFB9790,
	            0xE1DDF2DA, 0xA4CB7E33, 0x62FB1341, 0xCEE4C6E8,
	            0xEF20CADA, 0x36774C01, 0xD07E9EFE, 0x2BF11FB4,
	            0x95DBDA4D, 0xAE909198, 0xEAAD8E71, 0x6B93D5A0,
	            0xD08ED1D0, 0xAFC725E0, 0x8E3C5B2F, 0x8E7594B7,
	            0x8FF6E2FB, 0xF2122B64, 0x8888B812, 0x900DF01C,
	            0x4FAD5EA0, 0x688FC31C, 0xD1CFF191, 0xB3A8C1AD,
	            0x2F2F2218, 0xBE0E1777, 0xEA752DFE, 0x8B021FA1,
	            0xE5A0CC0F, 0xB56F74E8, 0x18ACF3D6, 0xCE89E299,
	            0xB4A84FE0, 0xFD13E0B7, 0x7CC43B81, 0xD2ADA8D9,
	            0x165FA266, 0x80957705, 0x93CC7314, 0x211A1477,
	            0xE6AD2065, 0x77B5FA86, 0xC75442F5, 0xFB9D35CF,
	            0xEBCDAF0C, 0x7B3E89A0, 0xD6411BD3, 0xAE1E7E49,
	            0x00250E2D, 0x2071B35E, 0x226800BB, 0x57B8E0AF,
	            0x2464369B, 0xF009B91E, 0x5563911D, 0x59DFA6AA,
	            0x78C14389, 0xD95A537F, 0x207D5BA2, 0x02E5B9C5,
	            0x83260376, 0x6295CFA9, 0x11C81968, 0x4E734A41,
	            0xB3472DCA, 0x7B14A94A, 0x1B510052, 0x9A532915,
	            0xD60F573F, 0xBC9BC6E4, 0x2B60A476, 0x81E67400,
	            0x08BA6FB5, 0x571BE91F, 0xF296EC6B, 0x2A0DD915,
	            0xB6636521, 0xE7B9F9B6, 0xFF34052E, 0xC5855664,
	            0x53B02D5D, 0xA99F8FA1, 0x08BA4799, 0x6E85076A   ],
	        [   0x4B7A70E9, 0xB5B32944, 0xDB75092E, 0xC4192623,
	            0xAD6EA6B0, 0x49A7DF7D, 0x9CEE60B8, 0x8FEDB266,
	            0xECAA8C71, 0x699A17FF, 0x5664526C, 0xC2B19EE1,
	            0x193602A5, 0x75094C29, 0xA0591340, 0xE4183A3E,
	            0x3F54989A, 0x5B429D65, 0x6B8FE4D6, 0x99F73FD6,
	            0xA1D29C07, 0xEFE830F5, 0x4D2D38E6, 0xF0255DC1,
	            0x4CDD2086, 0x8470EB26, 0x6382E9C6, 0x021ECC5E,
	            0x09686B3F, 0x3EBAEFC9, 0x3C971814, 0x6B6A70A1,
	            0x687F3584, 0x52A0E286, 0xB79C5305, 0xAA500737,
	            0x3E07841C, 0x7FDEAE5C, 0x8E7D44EC, 0x5716F2B8,
	            0xB03ADA37, 0xF0500C0D, 0xF01C1F04, 0x0200B3FF,
	            0xAE0CF51A, 0x3CB574B2, 0x25837A58, 0xDC0921BD,
	            0xD19113F9, 0x7CA92FF6, 0x94324773, 0x22F54701,
	            0x3AE5E581, 0x37C2DADC, 0xC8B57634, 0x9AF3DDA7,
	            0xA9446146, 0x0FD0030E, 0xECC8C73E, 0xA4751E41,
	            0xE238CD99, 0x3BEA0E2F, 0x3280BBA1, 0x183EB331,
	            0x4E548B38, 0x4F6DB908, 0x6F420D03, 0xF60A04BF,
	            0x2CB81290, 0x24977C79, 0x5679B072, 0xBCAF89AF,
	            0xDE9A771F, 0xD9930810, 0xB38BAE12, 0xDCCF3F2E,
	            0x5512721F, 0x2E6B7124, 0x501ADDE6, 0x9F84CD87,
	            0x7A584718, 0x7408DA17, 0xBC9F9ABC, 0xE94B7D8C,
	            0xEC7AEC3A, 0xDB851DFA, 0x63094366, 0xC464C3D2,
	            0xEF1C1847, 0x3215D908, 0xDD433B37, 0x24C2BA16,
	            0x12A14D43, 0x2A65C451, 0x50940002, 0x133AE4DD,
	            0x71DFF89E, 0x10314E55, 0x81AC77D6, 0x5F11199B,
	            0x043556F1, 0xD7A3C76B, 0x3C11183B, 0x5924A509,
	            0xF28FE6ED, 0x97F1FBFA, 0x9EBABF2C, 0x1E153C6E,
	            0x86E34570, 0xEAE96FB1, 0x860E5E0A, 0x5A3E2AB3,
	            0x771FE71C, 0x4E3D06FA, 0x2965DCB9, 0x99E71D0F,
	            0x803E89D6, 0x5266C825, 0x2E4CC978, 0x9C10B36A,
	            0xC6150EBA, 0x94E2EA78, 0xA5FC3C53, 0x1E0A2DF4,
	            0xF2F74EA7, 0x361D2B3D, 0x1939260F, 0x19C27960,
	            0x5223A708, 0xF71312B6, 0xEBADFE6E, 0xEAC31F66,
	            0xE3BC4595, 0xA67BC883, 0xB17F37D1, 0x018CFF28,
	            0xC332DDEF, 0xBE6C5AA5, 0x65582185, 0x68AB9802,
	            0xEECEA50F, 0xDB2F953B, 0x2AEF7DAD, 0x5B6E2F84,
	            0x1521B628, 0x29076170, 0xECDD4775, 0x619F1510,
	            0x13CCA830, 0xEB61BD96, 0x0334FE1E, 0xAA0363CF,
	            0xB5735C90, 0x4C70A239, 0xD59E9E0B, 0xCBAADE14,
	            0xEECC86BC, 0x60622CA7, 0x9CAB5CAB, 0xB2F3846E,
	            0x648B1EAF, 0x19BDF0CA, 0xA02369B9, 0x655ABB50,
	            0x40685A32, 0x3C2AB4B3, 0x319EE9D5, 0xC021B8F7,
	            0x9B540B19, 0x875FA099, 0x95F7997E, 0x623D7DA8,
	            0xF837889A, 0x97E32D77, 0x11ED935F, 0x16681281,
	            0x0E358829, 0xC7E61FD6, 0x96DEDFA1, 0x7858BA99,
	            0x57F584A5, 0x1B227263, 0x9B83C3FF, 0x1AC24696,
	            0xCDB30AEB, 0x532E3054, 0x8FD948E4, 0x6DBC3128,
	            0x58EBF2EF, 0x34C6FFEA, 0xFE28ED61, 0xEE7C3C73,
	            0x5D4A14D9, 0xE864B7E3, 0x42105D14, 0x203E13E0,
	            0x45EEE2B6, 0xA3AAABEA, 0xDB6C4F15, 0xFACB4FD0,
	            0xC742F442, 0xEF6ABBB5, 0x654F3B1D, 0x41CD2105,
	            0xD81E799E, 0x86854DC7, 0xE44B476A, 0x3D816250,
	            0xCF62A1F2, 0x5B8D2646, 0xFC8883A0, 0xC1C7B6A3,
	            0x7F1524C3, 0x69CB7492, 0x47848A0B, 0x5692B285,
	            0x095BBF00, 0xAD19489D, 0x1462B174, 0x23820E00,
	            0x58428D2A, 0x0C55F5EA, 0x1DADF43E, 0x233F7061,
	            0x3372F092, 0x8D937E41, 0xD65FECF1, 0x6C223BDB,
	            0x7CDE3759, 0xCBEE7460, 0x4085F2A7, 0xCE77326E,
	            0xA6078084, 0x19F8509E, 0xE8EFD855, 0x61D99735,
	            0xA969A7AA, 0xC50C06C2, 0x5A04ABFC, 0x800BCADC,
	            0x9E447A2E, 0xC3453484, 0xFDD56705, 0x0E1E9EC9,
	            0xDB73DBD3, 0x105588CD, 0x675FDA79, 0xE3674340,
	            0xC5C43465, 0x713E38D8, 0x3D28F89E, 0xF16DFF20,
	            0x153E21E7, 0x8FB03D4A, 0xE6E39F2B, 0xDB83ADF7   ],
	        [   0xE93D5A68, 0x948140F7, 0xF64C261C, 0x94692934,
	            0x411520F7, 0x7602D4F7, 0xBCF46B2E, 0xD4A20068,
	            0xD4082471, 0x3320F46A, 0x43B7D4B7, 0x500061AF,
	            0x1E39F62E, 0x97244546, 0x14214F74, 0xBF8B8840,
	            0x4D95FC1D, 0x96B591AF, 0x70F4DDD3, 0x66A02F45,
	            0xBFBC09EC, 0x03BD9785, 0x7FAC6DD0, 0x31CB8504,
	            0x96EB27B3, 0x55FD3941, 0xDA2547E6, 0xABCA0A9A,
	            0x28507825, 0x530429F4, 0x0A2C86DA, 0xE9B66DFB,
	            0x68DC1462, 0xD7486900, 0x680EC0A4, 0x27A18DEE,
	            0x4F3FFEA2, 0xE887AD8C, 0xB58CE006, 0x7AF4D6B6,
	            0xAACE1E7C, 0xD3375FEC, 0xCE78A399, 0x406B2A42,
	            0x20FE9E35, 0xD9F385B9, 0xEE39D7AB, 0x3B124E8B,
	            0x1DC9FAF7, 0x4B6D1856, 0x26A36631, 0xEAE397B2,
	            0x3A6EFA74, 0xDD5B4332, 0x6841E7F7, 0xCA7820FB,
	            0xFB0AF54E, 0xD8FEB397, 0x454056AC, 0xBA489527,
	            0x55533A3A, 0x20838D87, 0xFE6BA9B7, 0xD096954B,
	            0x55A867BC, 0xA1159A58, 0xCCA92963, 0x99E1DB33,
	            0xA62A4A56, 0x3F3125F9, 0x5EF47E1C, 0x9029317C,
	            0xFDF8E802, 0x04272F70, 0x80BB155C, 0x05282CE3,
	            0x95C11548, 0xE4C66D22, 0x48C1133F, 0xC70F86DC,
	            0x07F9C9EE, 0x41041F0F, 0x404779A4, 0x5D886E17,
	            0x325F51EB, 0xD59BC0D1, 0xF2BCC18F, 0x41113564,
	            0x257B7834, 0x602A9C60, 0xDFF8E8A3, 0x1F636C1B,
	            0x0E12B4C2, 0x02E1329E, 0xAF664FD1, 0xCAD18115,
	            0x6B2395E0, 0x333E92E1, 0x3B240B62, 0xEEBEB922,
	            0x85B2A20E, 0xE6BA0D99, 0xDE720C8C, 0x2DA2F728,
	            0xD0127845, 0x95B794FD, 0x647D0862, 0xE7CCF5F0,
	            0x5449A36F, 0x877D48FA, 0xC39DFD27, 0xF33E8D1E,
	            0x0A476341, 0x992EFF74, 0x3A6F6EAB, 0xF4F8FD37,
	            0xA812DC60, 0xA1EBDDF8, 0x991BE14C, 0xDB6E6B0D,
	            0xC67B5510, 0x6D672C37, 0x2765D43B, 0xDCD0E804,
	            0xF1290DC7, 0xCC00FFA3, 0xB5390F92, 0x690FED0B,
	            0x667B9FFB, 0xCEDB7D9C, 0xA091CF0B, 0xD9155EA3,
	            0xBB132F88, 0x515BAD24, 0x7B9479BF, 0x763BD6EB,
	            0x37392EB3, 0xCC115979, 0x8026E297, 0xF42E312D,
	            0x6842ADA7, 0xC66A2B3B, 0x12754CCC, 0x782EF11C,
	            0x6A124237, 0xB79251E7, 0x06A1BBE6, 0x4BFB6350,
	            0x1A6B1018, 0x11CAEDFA, 0x3D25BDD8, 0xE2E1C3C9,
	            0x44421659, 0x0A121386, 0xD90CEC6E, 0xD5ABEA2A,
	            0x64AF674E, 0xDA86A85F, 0xBEBFE988, 0x64E4C3FE,
	            0x9DBC8057, 0xF0F7C086, 0x60787BF8, 0x6003604D,
	            0xD1FD8346, 0xF6381FB0, 0x7745AE04, 0xD736FCCC,
	            0x83426B33, 0xF01EAB71, 0xB0804187, 0x3C005E5F,
	            0x77A057BE, 0xBDE8AE24, 0x55464299, 0xBF582E61,
	            0x4E58F48F, 0xF2DDFDA2, 0xF474EF38, 0x8789BDC2,
	            0x5366F9C3, 0xC8B38E74, 0xB475F255, 0x46FCD9B9,
	            0x7AEB2661, 0x8B1DDF84, 0x846A0E79, 0x915F95E2,
	            0x466E598E, 0x20B45770, 0x8CD55591, 0xC902DE4C,
	            0xB90BACE1, 0xBB8205D0, 0x11A86248, 0x7574A99E,
	            0xB77F19B6, 0xE0A9DC09, 0x662D09A1, 0xC4324633,
	            0xE85A1F02, 0x09F0BE8C, 0x4A99A025, 0x1D6EFE10,
	            0x1AB93D1D, 0x0BA5A4DF, 0xA186F20F, 0x2868F169,
	            0xDCB7DA83, 0x573906FE, 0xA1E2CE9B, 0x4FCD7F52,
	            0x50115E01, 0xA70683FA, 0xA002B5C4, 0x0DE6D027,
	            0x9AF88C27, 0x773F8641, 0xC3604C06, 0x61A806B5,
	            0xF0177A28, 0xC0F586E0, 0x006058AA, 0x30DC7D62,
	            0x11E69ED7, 0x2338EA63, 0x53C2DD94, 0xC2C21634,
	            0xBBCBEE56, 0x90BCB6DE, 0xEBFC7DA1, 0xCE591D76,
	            0x6F05E409, 0x4B7C0188, 0x39720A3D, 0x7C927C24,
	            0x86E3725F, 0x724D9DB9, 0x1AC15BB4, 0xD39EB8FC,
	            0xED545578, 0x08FCA5B5, 0xD83D7CD3, 0x4DAD0FC4,
	            0x1E50EF5E, 0xB161E6F8, 0xA28514D9, 0x6C51133C,
	            0x6FD5C7E7, 0x56E14EC4, 0x362ABFCE, 0xDDC6C837,
	            0xD79A3234, 0x92638212, 0x670EFA8E, 0x406000E0  ],
	        [   0x3A39CE37, 0xD3FAF5CF, 0xABC27737, 0x5AC52D1B,
	            0x5CB0679E, 0x4FA33742, 0xD3822740, 0x99BC9BBE,
	            0xD5118E9D, 0xBF0F7315, 0xD62D1C7E, 0xC700C47B,
	            0xB78C1B6B, 0x21A19045, 0xB26EB1BE, 0x6A366EB4,
	            0x5748AB2F, 0xBC946E79, 0xC6A376D2, 0x6549C2C8,
	            0x530FF8EE, 0x468DDE7D, 0xD5730A1D, 0x4CD04DC6,
	            0x2939BBDB, 0xA9BA4650, 0xAC9526E8, 0xBE5EE304,
	            0xA1FAD5F0, 0x6A2D519A, 0x63EF8CE2, 0x9A86EE22,
	            0xC089C2B8, 0x43242EF6, 0xA51E03AA, 0x9CF2D0A4,
	            0x83C061BA, 0x9BE96A4D, 0x8FE51550, 0xBA645BD6,
	            0x2826A2F9, 0xA73A3AE1, 0x4BA99586, 0xEF5562E9,
	            0xC72FEFD3, 0xF752F7DA, 0x3F046F69, 0x77FA0A59,
	            0x80E4A915, 0x87B08601, 0x9B09E6AD, 0x3B3EE593,
	            0xE990FD5A, 0x9E34D797, 0x2CF0B7D9, 0x022B8B51,
	            0x96D5AC3A, 0x017DA67D, 0xD1CF3ED6, 0x7C7D2D28,
	            0x1F9F25CF, 0xADF2B89B, 0x5AD6B472, 0x5A88F54C,
	            0xE029AC71, 0xE019A5E6, 0x47B0ACFD, 0xED93FA9B,
	            0xE8D3C48D, 0x283B57CC, 0xF8D56629, 0x79132E28,
	            0x785F0191, 0xED756055, 0xF7960E44, 0xE3D35E8C,
	            0x15056DD4, 0x88F46DBA, 0x03A16125, 0x0564F0BD,
	            0xC3EB9E15, 0x3C9057A2, 0x97271AEC, 0xA93A072A,
	            0x1B3F6D9B, 0x1E6321F5, 0xF59C66FB, 0x26DCF319,
	            0x7533D928, 0xB155FDF5, 0x03563482, 0x8ABA3CBB,
	            0x28517711, 0xC20AD9F8, 0xABCC5167, 0xCCAD925F,
	            0x4DE81751, 0x3830DC8E, 0x379D5862, 0x9320F991,
	            0xEA7A90C2, 0xFB3E7BCE, 0x5121CE64, 0x774FBE32,
	            0xA8B6E37E, 0xC3293D46, 0x48DE5369, 0x6413E680,
	            0xA2AE0810, 0xDD6DB224, 0x69852DFD, 0x09072166,
	            0xB39A460A, 0x6445C0DD, 0x586CDECF, 0x1C20C8AE,
	            0x5BBEF7DD, 0x1B588D40, 0xCCD2017F, 0x6BB4E3BB,
	            0xDDA26A7E, 0x3A59FF45, 0x3E350A44, 0xBCB4CDD5,
	            0x72EACEA8, 0xFA6484BB, 0x8D6612AE, 0xBF3C6F47,
	            0xD29BE463, 0x542F5D9E, 0xAEC2771B, 0xF64E6370,
	            0x740E0D8D, 0xE75B1357, 0xF8721671, 0xAF537D5D,
	            0x4040CB08, 0x4EB4E2CC, 0x34D2466A, 0x0115AF84,
	            0xE1B00428, 0x95983A1D, 0x06B89FB4, 0xCE6EA048,
	            0x6F3F3B82, 0x3520AB82, 0x011A1D4B, 0x277227F8,
	            0x611560B1, 0xE7933FDC, 0xBB3A792B, 0x344525BD,
	            0xA08839E1, 0x51CE794B, 0x2F32C9B7, 0xA01FBAC9,
	            0xE01CC87E, 0xBCC7D1F6, 0xCF0111C3, 0xA1E8AAC7,
	            0x1A908749, 0xD44FBD9A, 0xD0DADECB, 0xD50ADA38,
	            0x0339C32A, 0xC6913667, 0x8DF9317C, 0xE0B12B4F,
	            0xF79E59B7, 0x43F5BB3A, 0xF2D519FF, 0x27D9459C,
	            0xBF97222C, 0x15E6FC2A, 0x0F91FC71, 0x9B941525,
	            0xFAE59361, 0xCEB69CEB, 0xC2A86459, 0x12BAA8D1,
	            0xB6C1075E, 0xE3056A0C, 0x10D25065, 0xCB03A442,
	            0xE0EC6E0E, 0x1698DB3B, 0x4C98A0BE, 0x3278E964,
	            0x9F1F9532, 0xE0D392DF, 0xD3A0342B, 0x8971F21E,
	            0x1B0A7441, 0x4BA3348C, 0xC5BE7120, 0xC37632D8,
	            0xDF359F8D, 0x9B992F2E, 0xE60B6F47, 0x0FE3F11D,
	            0xE54CDA54, 0x1EDAD891, 0xCE6279CF, 0xCD3E7E6F,
	            0x1618B166, 0xFD2C1D05, 0x848FD2C5, 0xF6FB2299,
	            0xF523F357, 0xA6327623, 0x93A83531, 0x56CCCD02,
	            0xACF08162, 0x5A75EBB5, 0x6E163697, 0x88D273CC,
	            0xDE966292, 0x81B949D0, 0x4C50901B, 0x71C65614,
	            0xE6C6C7BD, 0x327A140A, 0x45E1D006, 0xC3F27B9A,
	            0xC9AA53FD, 0x62A80F00, 0xBB25BFE2, 0x35BDD2F6,
	            0x71126905, 0xB2040222, 0xB6CBCF7C, 0xCD769C2B,
	            0x53113EC0, 0x1640E3D3, 0x38ABBD60, 0x2547ADF0,
	            0xBA38209C, 0xF746CE76, 0x77AFA1C5, 0x20756060,
	            0x85CBFE4E, 0x8AE88DD8, 0x7AAAF9B0, 0x4CF9AA7E,
	            0x1948C25C, 0x02FB8A8C, 0x01C36AE4, 0xD6EBE1F9,
	            0x90D4F869, 0xA65CDEA0, 0x3F09252D, 0xC208E69F,
	            0xB74E6132, 0xCE77E25B, 0x578FDFE3, 0x3AC372E6  ]
	    ];

	    var BLOWFISH_CTX = {
	        pbox: [],
	        sbox: []
	    }

	    function F(ctx, x){
	        let a = (x >> 24) & 0xFF;
	        let b = (x >> 16) & 0xFF;
	        let c = (x >> 8) & 0xFF;
	        let d = x & 0xFF;

	        let y = ctx.sbox[0][a] + ctx.sbox[1][b];
	        y = y ^ ctx.sbox[2][c];
	        y = y + ctx.sbox[3][d];

	        return y;
	    }

	    function BlowFish_Encrypt(ctx, left, right){
	        let Xl = left;
	        let Xr = right;
	        let temp;

	        for(let i = 0; i < N; ++i){
	            Xl = Xl ^ ctx.pbox[i];
	            Xr = F(ctx, Xl) ^ Xr;

	            temp = Xl;
	            Xl = Xr;
	            Xr = temp;
	        }

	        temp = Xl;
	        Xl = Xr;
	        Xr = temp;

	        Xr = Xr ^ ctx.pbox[N];
	        Xl = Xl ^ ctx.pbox[N + 1];

	        return {left: Xl, right: Xr};
	    }

	    function BlowFish_Decrypt(ctx, left, right){
	        let Xl = left;
	        let Xr = right;
	        let temp;

	        for(let i = N + 1; i > 1; --i){
	            Xl = Xl ^ ctx.pbox[i];
	            Xr = F(ctx, Xl) ^ Xr;

	            temp = Xl;
	            Xl = Xr;
	            Xr = temp;
	        }

	        temp = Xl;
	        Xl = Xr;
	        Xr = temp;

	        Xr = Xr ^ ctx.pbox[1];
	        Xl = Xl ^ ctx.pbox[0];

	        return {left: Xl, right: Xr};
	    }

	    /**
	     * Initialization ctx's pbox and sbox.
	     *
	     * @param {Object} ctx The object has pbox and sbox.
	     * @param {Array} key An array of 32-bit words.
	     * @param {int} keysize The length of the key.
	     *
	     * @example
	     *
	     *     BlowFishInit(BLOWFISH_CTX, key, 128/32);
	     */
	    function BlowFishInit(ctx, key, keysize)
	    {
	        for(let Row = 0; Row < 4; Row++)
	        {
	            ctx.sbox[Row] = [];
	            for(let Col = 0; Col < 256; Col++)
	            {
	                ctx.sbox[Row][Col] = ORIG_S[Row][Col];
	            }
	        }

	        let keyIndex = 0;
	        for(let index = 0; index < N + 2; index++)
	        {
	            ctx.pbox[index] = ORIG_P[index] ^ key[keyIndex];
	            keyIndex++;
	            if(keyIndex >= keysize)
	            {
	                keyIndex = 0;
	            }
	        }

	        let Data1 = 0;
	        let Data2 = 0;
	        let res = 0;
	        for(let i = 0; i < N + 2; i += 2)
	        {
	            res = BlowFish_Encrypt(ctx, Data1, Data2);
	            Data1 = res.left;
	            Data2 = res.right;
	            ctx.pbox[i] = Data1;
	            ctx.pbox[i + 1] = Data2;
	        }

	        for(let i = 0; i < 4; i++)
	        {
	            for(let j = 0; j < 256; j += 2)
	            {
	                res = BlowFish_Encrypt(ctx, Data1, Data2);
	                Data1 = res.left;
	                Data2 = res.right;
	                ctx.sbox[i][j] = Data1;
	                ctx.sbox[i][j + 1] = Data2;
	            }
	        }

	        return true;
	    }

	    /**
	     * Blowfish block cipher algorithm.
	     */
	    var Blowfish = C_algo.Blowfish = BlockCipher.extend({
	        _doReset: function () {
	            // Skip reset of nRounds has been set before and key did not change
	            if (this._keyPriorReset === this._key) {
	                return;
	            }

	            // Shortcuts
	            var key = this._keyPriorReset = this._key;
	            var keyWords = key.words;
	            var keySize = key.sigBytes / 4;

	            //Initialization pbox and sbox
	            BlowFishInit(BLOWFISH_CTX, keyWords, keySize);
	        },

	        encryptBlock: function (M, offset) {
	            var res = BlowFish_Encrypt(BLOWFISH_CTX, M[offset], M[offset + 1]);
	            M[offset] = res.left;
	            M[offset + 1] = res.right;
	        },

	        decryptBlock: function (M, offset) {
	            var res = BlowFish_Decrypt(BLOWFISH_CTX, M[offset], M[offset + 1]);
	            M[offset] = res.left;
	            M[offset + 1] = res.right;
	        },

	        blockSize: 64/32,

	        keySize: 128/32,

	        ivSize: 64/32
	    });

	    /**
	     * Shortcut functions to the cipher's object interface.
	     *
	     * @example
	     *
	     *     var ciphertext = CryptoJS.Blowfish.encrypt(message, key, cfg);
	     *     var plaintext  = CryptoJS.Blowfish.decrypt(ciphertext, key, cfg);
	     */
	    C.Blowfish = BlockCipher._createHelper(Blowfish);
	}());


	return CryptoJS;

}));
}
};
const vendorCache=Object.create(null);
function dependency(name){
  return Promise.resolve().then(function(){
    if(!Object.prototype.hasOwnProperty.call(vendorCache,name)){
      const module={exports:{}};vendorFactories[name](module,module.exports);
      vendorCache[name]=module.exports;
    }
    return vendorCache[name];
  });
}
if(globalThis.DouyinDTrait)throw new Error('DouyinDTrait already belongs to another browser owner');

const dependencies={
  loadCryptoJS:()=>dependency('aes'),
  loadJSEncrypt:()=>dependency('rsa').then(value=>({default:value.default||value}))
};
load('desktop-dtrait-browser-install').installDesktopDTraitBrowser(globalThis,dependencies);
globalThis.DouyinDTrait={
  createBootstrap:options=>load('desktop-dtrait-browser-bootstrap').createDesktopDTraitBrowserBootstrap(globalThis,{...options,...dependencies})
};

})();
