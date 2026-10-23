(function(){
const modules={"browser-entry":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const desktop_runtime_js_1 = require("./desktop-runtime.js");
const context = new Proxy(globalThis, {
    get(target, key) {
        if (key === 'webpackGlobal')
            return globalThis;
        return Reflect.get(target, key, target);
    },
});
(0, desktop_runtime_js_1.installDesktopBdms)(context);

},"desktop-runtime":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesktopBdmsRuntime = void 0;
exports.installDesktopBdms = installDesktopBdms;
const desktop_config_js_1 = require("./desktop-config.js");
const desktop_behavior_collector_js_1 = require("./desktop-behavior-collector.js");
const desktop_environment_mask_js_1 = require("./desktop-environment-mask.js");
const desktop_request_signer_js_1 = require("./desktop-request-signer.js");
const desktop_device_report_js_1 = require("./desktop-device-report.js");
const desktop_token_js_1 = require("./desktop-token.js");
const desktop_report_js_1 = require("./desktop-report.js");
const desktop_report_lifecycle_js_1 = require("./desktop-report-lifecycle.js");
const desktop_fingerprint_js_1 = require("./desktop-fingerprint.js");
const desktop_xhr_hook_js_1 = require("./desktop-xhr-hook.js");
const desktop_fetch_hook_js_1 = require("./desktop-fetch-hook.js");
const desktop_eventsource_hook_js_1 = require("./desktop-eventsource-hook.js");
const desktop_startup_js_1 = require("./desktop-startup.js");
class DesktopBdmsRuntime {
    context;
    configuration;
    device;
    lifecycle;
    constructor(context) {
        this.context = context;
        const behavior = new desktop_behavior_collector_js_1.DesktopBehaviorCollector(context);
        const environment = new desktop_environment_mask_js_1.DesktopEnvironmentState(context);
        (0, desktop_startup_js_1.initializeDesktopReferer)(context);
        (0, desktop_startup_js_1.initializeDesktopVersion)(context);
        this.configuration = new desktop_config_js_1.DesktopBdmsConfiguration(context, () => this.lifecycle.start());
        const config = this.configuration.config;
        const tokens = new desktop_token_js_1.DesktopTokenState(context);
        const sender = new desktop_report_js_1.DesktopReportSender(context, config, tokens, () => this.device.report());
        this.device = new desktop_device_report_js_1.DesktopDeviceReporter(context, config, environment, behavior, sender);
        const signer = new desktop_request_signer_js_1.DesktopRequestSigner(context, config, behavior, environment);
        this.lifecycle = new desktop_report_lifecycle_js_1.DesktopReportLifecycle(context, config, behavior.createReportSources(() => (0, desktop_fingerprint_js_1.collectDesktopReportScreen)(context)), sender, this.device.report, behavior.startCollection);
        const callbacks = {
            matchesSigning: (path) => this.configuration.matchesSigning(path),
            matchesBehavior: (path) => this.configuration.matchesBehavior(path),
            sign: (query, body, type) => signer.sign(query, body, type),
            reportBehavior: this.lifecycle.reportBehavior,
        };
        (0, desktop_xhr_hook_js_1.installDesktopXhrHook)(context, tokens, callbacks);
        (0, desktop_fetch_hook_js_1.installDesktopFetchHook)(context, tokens, callbacks);
        (0, desktop_eventsource_hook_js_1.installDesktopEventSourceHook)(context, tokens, callbacks);
    }
    init = (options) => { this.configuration.init(options); };
    getReferer = () => this.context.window.__ac_referer || '';
}
exports.DesktopBdmsRuntime = DesktopBdmsRuntime;
function installDesktopBdms(context) {
    if (context.window.bdms)
        return;
    const exported = {};
    if (typeof context.Symbol !== 'undefined' && context.Symbol.toStringTag) {
        context.Object.defineProperty(exported, context.Symbol.toStringTag, { value: 'Module' });
    }
    context.Object.defineProperty(exported, '__esModule', { value: true });
    context.Object.defineProperty(exported, 'getReferer', { enumerable: true, get: () => runtime.getReferer });
    context.Object.defineProperty(exported, 'init', { enumerable: true, get: () => runtime.init });
    const runtime = new DesktopBdmsRuntime(context);
    Reflect.set(context.window, 'bdms', exported);
}

},"desktop-config":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesktopBdmsConfiguration = void 0;
const desktop_property_write_js_1 = require("./desktop-property-write.js");
class DesktopBdmsConfiguration {
    context;
    start;
    config = {
        aid: 0, pageId: 0, boe: false, ddrt: 3, paths: { include: [], exclude: [] },
        track: { mode: 0, delay: 300, paths: [] }, dump: true, rpU: '',
    };
    array;
    object;
    regexp;
    symbol;
    typeError;
    constructor(context, start) {
        this.context = context;
        this.start = start;
        this.array = context.Array;
        this.object = context.Object;
        this.regexp = context.RegExp;
        this.symbol = context.Symbol;
        this.typeError = context.TypeError;
    }
    init(options) {
        (0, desktop_property_write_js_1.setDesktopProperty)(this.context.window, 'onwheelx', { _Ax: '0X21' });
        if (!this.config.aid)
            (0, desktop_property_write_js_1.setDesktopProperty)(this.config, 'aid', options.aid || 0);
        if (!this.config.pageId)
            (0, desktop_property_write_js_1.setDesktopProperty)(this.config, 'pageId', options.pageId || 0);
        (0, desktop_property_write_js_1.setDesktopProperty)(this.config, 'boe', options.boe || false);
        (0, desktop_property_write_js_1.setDesktopProperty)(this.config, 'ddrt', options.ddrt || 3);
        (0, desktop_property_write_js_1.setDesktopProperty)(this.config, 'dump', options.dump ?? true);
        (0, desktop_property_write_js_1.setDesktopProperty)(this.config, 'rpU', options.rpU || '');
        const paths = options.paths || [];
        let include;
        let exclude = [];
        if (this.array.isArray(paths))
            include = this.compile(paths);
        else {
            const lists = paths;
            include = this.compile(lists.include || []);
            exclude = this.compile(lists.exclude || []);
        }
        const included = this.config.paths.include;
        included.push.apply(included, this.spread(include));
        const excluded = this.config.paths.exclude;
        excluded.push.apply(excluded, this.spread(exclude));
        if (options.track) {
            (0, desktop_property_write_js_1.setDesktopProperty)(this.config.track, 'mode', options.track.mode || 0);
            (0, desktop_property_write_js_1.setDesktopProperty)(this.config.track, 'delay', options.track.delay || 300);
            if (this.config.track.mode === 0 && options.track.paths) {
                const target = this.config.track.paths;
                target.push.apply(target, this.spread(this.compile(options.track.paths)));
            }
        }
        this.object.defineProperty(this.context.window.onwheelx, '_Ax', { writable: false });
        Reflect.apply(this.start, null, []);
    }
    matchesSigning(pathname) {
        const paths = this.config.paths;
        const include = paths.include;
        const exclude = paths.exclude;
        return !exclude.some(pattern => pattern.test(pathname)) && include.some(pattern => pattern.test(pathname));
    }
    matchesBehavior(pathname) {
        return this.config.track.paths.some(pattern => pattern.test(pathname));
    }
    compile(paths) {
        return paths.map(pattern => new this.regexp(pattern));
    }
    spread(input) {
        if (this.array.isArray(input))
            return this.copy(input);
        const value = input;
        if ((typeof this.symbol !== 'undefined' && value[this.symbol.iterator] != null) || value['@@iterator'] != null) {
            return this.array.from(input);
        }
        if (input) {
            if (typeof input === 'string')
                return this.copy(input);
            let tag = this.object.prototype.toString.call(input).slice(8, -1);
            if (tag === 'Object' && value['constructor'])
                tag = value['constructor'].name;
            if (tag === 'Map' || tag === 'Set')
                return this.array.from(input);
            if (tag === 'Arguments' || new this.regexp('^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$').test(tag)) {
                return this.copy(input);
            }
        }
        throw new this.typeError('Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.');
    }
    copy(input) {
        const length = input.length;
        const result = new this.array(length);
        for (let i = 0; i < length; i++)
            (0, desktop_property_write_js_1.setDesktopProperty)(result, i, input[i]);
        return result;
    }
}
exports.DesktopBdmsConfiguration = DesktopBdmsConfiguration;

},"desktop-property-write":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDesktopProperty = setDesktopProperty;
exports.deleteDesktopProperty = deleteDesktopProperty;
function setDesktopProperty(target, key, value, receiver = target) {
    if (target == null || !Reflect.set(Object(target), key, value, receiver)) {
        throw new TypeError('Desktop property write rejected: ' + String(key));
    }
}
function deleteDesktopProperty(target, key) {
    if (!Reflect.deleteProperty(target, key))
        throw new TypeError('Desktop property delete rejected: ' + String(key));
}

},"desktop-behavior-collector":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesktopBehaviorCollector = void 0;
const desktop_behavior_js_1 = require("./desktop-behavior.js");
class DesktopBehaviorCollector extends desktop_behavior_js_1.DesktopBehaviorState {
    context;
    constructor(context) {
        super(context.performance.now());
        this.context = context;
        this.queueFrame();
    }
    startCollection = () => {
        this.context.document.addEventListener('mousemove', event => this.recordMove(this.mousePoint(event)));
        this.context.document.addEventListener('touchmove', event => this.recordMove(this.touchPoint(event)));
        this.context.document.addEventListener('mousedown', event => this.recordClickStart(this.mousePoint(event)));
        this.context.document.addEventListener('touchstart', event => this.recordClickStart(this.touchPoint(event)));
        this.context.document.addEventListener('mouseup', event => this.recordClickEnd(this.mousePoint(event)));
        this.context.document.addEventListener('touchend', event => this.recordClickEnd(this.touchPoint(event)));
        this.context.document.addEventListener('keydown', () => this.recordKeySample(() => this.context.Date.now()));
        this.context.document.addEventListener('mouseover', event => this.recordHover(this.hoverPoint(event, 1)));
        this.context.document.addEventListener('mouseout', event => this.recordHover(this.hoverPoint(event, 0)));
        if (this.context.window.self === this.context.window.top) {
            this.context.window.addEventListener('deviceorientation', event => {
                const input = event;
                const x = input.beta, y = input.gamma, z = input.alpha;
                this.recordOrientationSample(x, y, z, () => this.context.Date.now(), () => this.context.Math.random());
            });
        }
        this.context.document.addEventListener('visibilitychange', () => this.recordVisibilitySample(() => this.context.document.visibilityState, () => this.context.Date.now()));
    };
    queueFrame() {
        this.context.window.requestAnimationFrame(() => {
            this.recordFrame(() => this.context.performance.now());
            if (!this.frameSamplingComplete)
                this.queueFrame();
        });
    }
    mousePoint(event) {
        const input = event;
        return { x: input.clientX, y: input.clientY, ts: this.context.Date.now() };
    }
    touchPoint(event) {
        const point = event.touches?.item(0);
        if (point)
            return this.mousePoint(point);
        return undefined;
    }
    hoverPoint(event, mode) {
        const target = event.target;
        if (!(target instanceof this.context.HTMLElement))
            return undefined;
        const nodeName = target.nodeName;
        if (nodeName == 'BODY' || nodeName == 'HTML')
            return undefined;
        let text = '';
        try {
            text = Reflect.apply(this.context.encodeURI, null, [target.innerText.slice(0, 15)]);
        }
        catch { }
        if (text)
            return { target: text, mode, ts: this.context.Date.now() };
        return undefined;
    }
}
exports.DesktopBehaviorCollector = DesktopBehaviorCollector;

},"desktop-behavior":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesktopBehaviorState = void 0;
class DesktopBehaviorState {
    startPerformanceTime;
    moves = [];
    clickStarts = [];
    keydowns = [];
    clickEnds = [];
    windowStates = [];
    orientations = [];
    focus = [];
    frameCount = 0;
    interval = 16;
    constructor(startPerformanceTime) {
        this.startPerformanceTime = startPerformanceTime;
    }
    get sampleIntervalMs() { return this.interval; }
    recordFrame(performanceTime) {
        if (this.frameCount >= 60)
            return;
        this.frameCount++;
        if (this.frameCount === 60) {
            const time = typeof performanceTime === 'function' ? performanceTime() : performanceTime;
            this.interval = (time - this.startPerformanceTime) / 60;
        }
    }
    get frameSamplingComplete() { return this.frameCount >= 60; }
    recordMove(point) {
        this.recordPoint(this.moves, point, 400);
    }
    recordClickStart(point) {
        this.recordPoint(this.clickStarts, point, 100);
    }
    recordClickEnd(point) {
        this.recordPoint(this.clickEnds, point, 200);
    }
    recordVisibility(visibilityState, ts) {
        this.recordVisibilitySample(() => visibilityState, () => ts);
    }
    recordVisibilitySample(readVisibility, now) {
        const previous = this.windowStates.at(-1);
        const v = readVisibility() === 'visible' ? 1 : 2;
        const ts = now();
        if (previous?.v === v)
            return;
        this.push(this.windowStates, { v, ts }, 50);
    }
    recordHover(point) {
        if (!point)
            return;
        if (point.mode === 1) {
            this.push(this.focus, { ...point }, 50);
            return;
        }
        const previous = this.focus.at(-1);
        if (!previous)
            return;
        if (point.ts - previous.ts >= 350)
            this.push(this.focus, { ...point }, 50);
        else
            this.focus.shift();
    }
    recordOrientation(point, random) {
        this.recordOrientationSample(point.x, point.y, point.z, () => point.ts, random);
    }
    recordOrientationSample(x, y, z, now, random) {
        if (!x || !y || !z)
            return;
        const previous = this.orientations.at(-1);
        const point = { x, y, z, ts: now() };
        const interval = random() * 90000 + 60000;
        if (previous && point.ts - previous.ts < interval)
            return;
        this.push(this.orientations, { x: point.x, y: point.y, z: point.z, ts: point.ts }, 50);
    }
    recordKeydown(ts) {
        this.recordKeySample(() => ts);
    }
    recordKeySample(now) {
        const previous = this.keydowns.at(-1);
        const ts = now();
        if (previous?.ts === ts)
            return;
        this.push(this.keydowns, { ts }, 100);
    }
    mask(trackMode = 0) {
        if (trackMode !== 0)
            return 0;
        let result = this.clickStarts.length ? 0 : 4;
        if (!this.moves.length)
            result |= 2;
        else if (this.moves.length > 1) {
            let sum = 0;
            for (let index = 1; index < this.moves.length; index++) {
                const previous = this.moves[index - 1], point = this.moves[index];
                sum += Math.sqrt((point.x - previous.x) ** 2 + (point.y - previous.y) ** 2) / (point.ts - previous.ts);
            }
            if (sum / (this.moves.length - 1) > 18)
                result |= 16;
        }
        if (!this.keydowns.length)
            result |= 8;
        else if (this.keydowns.length >= 6) {
            let sum = 0;
            for (let index = 1; index < this.keydowns.length; index++) {
                sum += 1 / (this.keydowns[index].ts - this.keydowns[index - 1].ts);
            }
            if (sum / (this.keydowns.length - 1) > 0.2)
                result |= 32;
        }
        return result;
    }
    getSnapshot() {
        return {
            moves: this.moves.map(point => ({ ...point })),
            clickStarts: this.clickStarts.map(point => ({ ...point })),
            keydowns: this.keydowns.map(point => ({ ...point })),
            clickEnds: this.clickEnds.map(point => ({ ...point })),
            windowStates: this.windowStates.map(point => ({ ...point })),
            orientations: this.orientations.map(point => ({ ...point })),
            focus: this.focus.map(point => ({ ...point })),
        };
    }
    createReportSources(screen) {
        const view = (queue) => ({ data: () => queue.map(point => ({ ...point })) });
        return {
            move: view(this.moves), click: view(this.clickStarts), clickEnd: view(this.clickEnds),
            keyboard: view(this.keydowns), windowState: view(this.windowStates), gyro: view(this.orientations),
            focus: view(this.focus), screen,
        };
    }
    recordPoint(queue, point, capacity) {
        if (!point)
            return;
        const previous = queue.at(-1);
        if (previous && (point.ts - previous.ts <= this.interval || (point.x === previous.x && point.y === previous.y)))
            return;
        this.push(queue, { x: point.x, y: point.y, ts: point.ts }, capacity);
    }
    push(queue, value, capacity) {
        if (queue.length === capacity)
            queue.shift();
        queue.push(value);
    }
}
exports.DesktopBehaviorState = DesktopBehaviorState;

},"desktop-environment-mask":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesktopEnvironmentState = void 0;
const desktop_environment_js_1 = require("./desktop-environment.js");
class DesktopEnvironmentState {
    context;
    storage;
    symbol;
    processType;
    constructor(context) {
        this.context = context;
        this.symbol = context.Symbol;
        this.storage = new desktop_environment_js_1.DesktopStorageState(context);
    }
    mask() {
        let mask = 1;
        if (!this.isBrowser())
            return mask | (1 << 7);
        mask |= +this.nativeMismatch() << 1;
        mask |= +this.storage.probe() << 2;
        mask |= +this.automationSignals() << 3;
        mask |= +this.legacyAutomation() << 4;
        mask |= +this.nodeProcess() << 5;
        mask |= +this.firefoxWindowGap() << 6;
        mask |= +this.embeddedHost() << 8;
        mask |= +this.localAddress() << 9;
        mask |= +this.platformMismatch() << 10;
        return mask;
    }
    isBrowser() {
        const c = this.context;
        if (!(typeof c.window !== 'undefined' && typeof c.navigator !== 'undefined' &&
            typeof c.document !== 'undefined' && typeof c.location !== 'undefined' && typeof c.history !== 'undefined'))
            return false;
        const navigator = Object.prototype.toString.call(c.navigator) === '[object Navigator]';
        const document = Object.prototype.toString.call(c.document) === '[object HTMLDocument]' || Object.prototype.toString.call(c.document) === '[object Document]';
        const location = Object.prototype.toString.call(c.location) === '[object Location]' || Object.prototype.toString.call(c.location) === '[object Object]';
        const history = Object.prototype.toString.call(c.history) === '[object History]';
        return navigator && document && location && history;
    }
    nativeMismatch() {
        const suspicious = (fn) => typeof fn !== 'function' || fn.toString().indexOf('[native code]') <= 0;
        try {
            if (suspicious(this.context.document.createElement('canvas').toDataURL))
                return true;
        }
        catch {
            return true;
        }
        return suspicious(this.context.navigator.toString) || this.pluginArrayMismatch() || this.msPluginsMismatch();
    }
    pluginArrayMismatch() {
        return typeof this.context.PluginArray !== 'undefined' && !(this.context.navigator.plugins instanceof this.context.PluginArray);
    }
    msPluginsMismatch() {
        return typeof this.context.MSPluginsCollection !== 'undefined' && !(this.context.navigator.plugins instanceof this.context.MSPluginsCollection);
    }
    automationSignals() {
        if (!this.context.window.screen || !this.context.window.eval)
            return true;
        const connection = !!this.context.navigator.connection && this.context.navigator.connection.rtt === 0;
        let userAgentData = false;
        if (this.context.navigator.userAgentData) {
            const brands = this.context.navigator.userAgentData.brands;
            userAgentData = brands?.length === 0 && this.context.navigator.userAgentData.platform === '';
        }
        const iw = this.context.window.innerWidth === 800;
        const ih = this.context.window.innerHeight === 600;
        const ow = this.context.window.outerWidth === 0;
        const oh = this.context.window.outerHeight === 0;
        const dimensions = (iw && ih) || (ow && oh);
        return (!!this.context.navigator.appVersion && this.context.navigator.appVersion.indexOf('HeadlessChrome') >= 0) ||
            typeof this.context.navigator.userAgent !== 'string' || this.context.navigator.userAgent.indexOf('HeadlessChrome') >= 0 ||
            this.context.navigator.webdriver === true || Object.getOwnPropertyDescriptor(this.context.navigator, 'webdriver') !== undefined ||
            [connection, userAgentData, dimensions].filter(value => value).length >= 3;
    }
    legacyAutomation() {
        return this.pluginArrayMismatch() || this.msPluginsMismatch() ||
            !!this.context.window._phantom || !!this.context.window.callPhantom || !!this.context.window.__nightmare ||
            (!this.context.window.Audio && this.context.window.CanvasRenderingContext2D);
    }
    nodeProcess() {
        return (typeof this.context.webpackGlobal !== 'undefined' && Object.prototype.toString.call(this.context.webpackGlobal.process) === '[object process]') ||
            ((typeof this.context.process === 'undefined' ? 'undefined' : this.typeOfProcess(this.context.process)) === 'object' &&
                this.context.process.title === 'node');
    }
    typeOfProcess(value) {
        if (!this.processType) {
            this.processType = typeof this.symbol === 'function' && typeof this.symbol.iterator === 'symbol'
                ? input => typeof input
                : input => input && typeof this.symbol === 'function' &&
                    input.constructor === this.symbol && input !== this.symbol.prototype
                    ? 'symbol' : typeof input;
        }
        return this.processType(value);
    }
    firefoxWindowGap() {
        if ((0, desktop_environment_js_1.classifyDesktopBrowser)(this.context.navigator.userAgent) !== 'Firefox')
            return false;
        const outerWidth = this.context.window.outerWidth;
        const outerHeight = this.context.window.outerHeight;
        const innerWidth = this.context.window.innerWidth;
        const innerHeight = this.context.window.innerHeight;
        return outerWidth - innerWidth > 400 || outerHeight - innerHeight > 300;
    }
    embeddedHost() {
        return !!this.context.window.cefSharp || !!this.context.window.CefSharp ||
            !!this.context.window.eoapi || !!this.context.window.eoWebBrowserDispatcher;
    }
    localAddress() {
        const href = this.context.location.href;
        const local = new RegExp('^(file|http://localhost)', 'i');
        const ip = new RegExp('^https?://([0-9]{1,3}(\\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})');
        return local.test(href) || ip.test(href);
    }
    platformMismatch() {
        const os = (0, desktop_environment_js_1.classifyDesktopOS)(this.context.navigator.userAgent);
        const platform = (0, desktop_environment_js_1.classifyDesktopPlatform)(this.context.navigator.platform);
        const windows = platform === 'Windows' && os !== 'Windows';
        const linux = platform === 'Linux' && os !== 'Linux' && os !== 'HarmonyOS' && os !== 'Android';
        const android = platform === 'Android' && os !== 'Android';
        const apple = platform === 'Apple' && os !== 'MacOS' && os !== 'iOS';
        const other = platform === 'Other' && os !== 'Other';
        return windows || linux || android || apple || other;
    }
}
exports.DesktopEnvironmentState = DesktopEnvironmentState;

},"desktop-environment":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesktopStorageState = void 0;
exports.classifyDesktopBrowser = classifyDesktopBrowser;
exports.classifyDesktopOS = classifyDesktopOS;
exports.classifyDesktopPlatform = classifyDesktopPlatform;
const browserRules = [
    ['Huawei', [/(huawei)browser\/([\w.]+)/i]],
    ['Chrome', [/(chrome)\/v?([\w.]+)/i, /\b(?:crmo|crios)\/([\w.]+)/i, /headlesschrome(?:\/([\w.]+)| )/i, / wv\).+(chrome)\/([\w.]+)/i]],
    ['Edge', [/edg(?:e|ios|a)?\/([\w.]+)/i]],
    ['Firefox', [/\bfocus\/([\w.]+)/i, /fxios\/([-\w.]+)/i, /mobile vr; rv:([\w.]+)\).+firefox/i, /(firefox)\/([\w.]+)/i]],
    ['IE', [/(?:ms|\()(ie) ([\w.]+)/i, /trident.+rv[: ]([\w.]{1,9})\b.+like gecko/i, /(iemobile)(?:browser)?[/ ]?([\w.]*)/i]],
    ['Opera', [/(opera mini)\/([-\w.]+)/i, /(opera [mobiletab]{3,6})\b.+version\/([-\w.]+)/i, /(opera)(?:.+version\/|[/ ]+)([\w.]+)/i, /opios[/ ]+([\w.]+)/i, /\bopr\/([\w.]+)/i]],
    ['Safari', [/version\/([\w.,]+) .*mobile\/\w+ (safari)/i, /version\/([\w(.|,)]+) .*(mobile ?safari|safari)/i]],
];
const osRules = [
    ['HarmonyOS', [/droid ([\w.]+)\b.+(harmonyos)/i, /OpenHarmony/i]],
    ['Android', [/droid ([\w.]+)\b.+(android[- ]x86)/i, /(android)[-/ ]?([\w.]*)/i]],
    ['iOS', [/ip[honead]{2,4}\b(?:.*os ([\w]+) like mac|; opera)/i, /(?:\/|\()(ip(?:hone|od)[\w, ]*)(?:\/|;)/i, /\((ipad);[-\w),; ]+apple/i, /applecoremedia\/[\w.]+ \((ipad)/i, /\b(ipad)\d\d?,\d\d?[;\]].+ios/i, /\b(crios)\/([\w.]+)/i, /fxios\/([-\w.]+)/i]],
    ['MacOS', [/(mac os x) ?([\w. ]*)/i, /(macintosh|mac_powerpc\b)(?!.+haiku)/i]],
    ['Windows', [/microsoft (windows) (vista|xp)/i, /(windows) nt 6\.2; (arm)/i, /(windows)[/ ]?([ntce\d. ]+\w)(?!.+xbox)/i, /(windows (?:phone(?: os)?|mobile))[/ ]?([\d.\w ]*)/i, /(win(?=3|9|n)|win 9x )([nt\d.]+)/i]],
    ['Linux', [/(linux) ?([\w.]*)/i]],
];
const platformRules = [
    ['Android', [/android/i]], ['Apple', [/mac|iphone|ipad|ipod/i]],
    ['Linux', [/linux/i]], ['Windows', [/win/i]],
];
function classify(input, rules) {
    for (const [name, patterns] of rules) {
        if (patterns.some(pattern => pattern.test(input)))
            return name;
    }
    return 'Other';
}
function classifyDesktopBrowser(input) {
    return classify(input, browserRules);
}
function classifyDesktopOS(input) {
    return classify(input, osRules);
}
function classifyDesktopPlatform(input) {
    return classify(input, platformRules);
}
class DesktopStorageState {
    context;
    value = false;
    constructor(context) {
        this.context = context;
    }
    probe() {
        const browser = classifyDesktopBrowser(this.context.navigator.userAgent);
        if (browser === 'Chrome' || browser === 'Edge' || browser === 'Opera') {
            if (this.context.navigator.storage && typeof this.context.navigator.storage.estimate === 'function') {
                this.context.navigator.storage.estimate().then(result => {
                    this.value = !!result.quota && result.quota < 2300000000;
                });
            }
        }
        if (browser === 'Firefox') {
            if (!this.context.navigator.serviceWorker)
                this.value = true;
            else if (this.context.window.indexedDB) {
                const request = this.context.window.indexedDB.open('bdmsCheck');
                request.addEventListener('success', () => { this.context.window.indexedDB.deleteDatabase('bdmsCheck'); });
                request.addEventListener('error', () => { this.value = true; });
            }
        }
        if (browser === 'Safari') {
            if (this.context.navigator.storage && typeof this.context.navigator.storage.getDirectory === 'function') {
                this.context.navigator.storage.getDirectory().catch(error => {
                    if (error.message.indexOf('out of memory') >= 0)
                        this.value = true;
                });
            }
        }
        return this.value;
    }
}
exports.DesktopStorageState = DesktopStorageState;

},"desktop-request-signer":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesktopRequestSigner = void 0;
const desktop_property_write_js_1 = require("./desktop-property-write.js");
const aBogus_js_1 = require("./aBogus.js");
const desktop_environment_mask_js_1 = require("./desktop-environment-mask.js");
const desktop_fingerprint_js_1 = require("./desktop-fingerprint.js");
class DesktopRequestSigner {
    context;
    config;
    behavior;
    environment;
    constructor(context, config, behavior, environment) {
        this.context = context;
        this.config = config;
        this.behavior = behavior;
        this.environment = environment ?? new desktop_environment_mask_js_1.DesktopEnvironmentState(context);
    }
    sign(query, body, contentType) {
        const vendorSubs = { ink: this.context.Date.now() - 1 };
        const prototype = this.context.navigator.__proto__;
        if (prototype == null)
            throw new TypeError('BDMS navigator prototype is missing');
        (0, desktop_property_write_js_1.setDesktopProperty)(Object(prototype), 'vendorSubs', vendorSubs, prototype);
        const environmentMask = this.environment.mask();
        const mode = this.config.track.mode;
        const behaviorMask = mode !== 0 ? 0 : this.behavior.mask();
        const normalizedBody = typeof body !== 'string' || (contentType && contentType.indexOf('multipart/form-data') != -1) ? '' : body;
        let userAgent = this.context.navigator.userAgent;
        if (userAgent.indexOf('baiduboxapp') >= 0)
            userAgent = userAgent.replace(/\s(EasyBrowser)?[Ww]ebCore=0x[a-z0-9]{9}$/, '');
        if (userAgent.indexOf('AlipayClient') >= 0)
            userAgent = userAgent.replace(/\sChannelId\(\d+\)/, '');
        return (0, aBogus_js_1.generateDesktopABogusWithRuntime)({ query, body: normalizedBody, userAgent, environmentMask, behaviorMask }, {
            flag: () => this.readFlag(), now: () => this.context.Date.now(),
            ink: () => this.context.navigator.vendorSubs?.ink,
            pageId: () => this.config.pageId, aid: () => this.config.aid,
            fingerprint: () => (0, desktop_fingerprint_js_1.buildDesktopFingerprint)(this.context),
            random: () => this.context.Math.random(),
        });
    }
    readFlag() {
        if (this.context.window.onwheelx && this.context.window.onwheelx._Ax) {
            return Object.getOwnPropertyDescriptor(this.context.window.onwheelx, '_Ax')?.writable === false ? 3 : 12;
        }
        return 11;
    }
}
exports.DesktopRequestSigner = DesktopRequestSigner;

},"aBogus":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SCREEN_FINGERPRINT = exports.WIN_SCREEN_FINGERPRINT = exports.MAC_SCREEN_FINGERPRINT = exports.BDMS_PRESETS = void 0;
exports.generateABogus = generateABogus;
exports.generateDesktopABogus = generateDesktopABogus;
exports.generateDesktopABogusWithRuntime = generateDesktopABogusWithRuntime;
exports.encodeDesktopReportData = encodeDesktopReportData;
exports.generateJumpbyteABogus = generateJumpbyteABogus;
const TABLES = {
    s0: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
    s1: 'Dkdpgh4ZKsQB80/Mfvw36XI1R25+WUAlEi7NLboqYTOPuzmFjJnryx9HVGcaStCe=',
    s2: 'Dkdpgh4ZKsQB80/Mfvw36XI1R25-WUAlEi7NLboqYTOPuzmFjJnryx9HVGcaStCe=',
    s3: 'ckdp1h4ZKsUB80/Mfvw36XIgR25+WQAlEi7NLboqYTOPuzmFjJnryx9HVGDaStCe',
    s4: 'Dkdpgh2ZmsQB80/MfvV36XI1R45-WUAlEixNLwoqYTOPuzKFjJnry79HbGcaStCe',
};
const SALT = 'dhzx';
exports.BDMS_PRESETS = {
    '1.0.1.20': { constVal1: 22740, constVal2: 2631 },
    '1.0.1.16': { constVal1: 22740, constVal2: 2631 },
};
exports.MAC_SCREEN_FINGERPRINT = '1728|1117|1728|303|1728|1117|1728|982|MacIntel';
exports.WIN_SCREEN_FINGERPRINT = '1920|366|1918|1048|1920|1050|1920|1080|Win32';
exports.DEFAULT_SCREEN_FINGERPRINT = exports.MAC_SCREEN_FINGERPRINT;
function generateABogus(options) {
    const preset = exports.BDMS_PRESETS[options.bdmsPreset ?? '1.0.1.16'];
    const body = options.body ?? '';
    const fpArr = strToByteArr(options.screenFingerprint ?? exports.DEFAULT_SCREEN_FINGERPRINT);
    const tm2 = new Date().getTime() - 1;
    const tm1Before = new Date().getTime();
    const queryArr32 = sm3Digest(sm3Digest(`${options.query}${SALT}`));
    const dataArr32 = sm3Digest(sm3Digest(`${body}${SALT}`));
    const keyVal = options.keyVal ?? 0;
    const userAgentLmStr = rc4Parse(String.fromCharCode(...[0.00390625, 1, keyVal]), options.userAgent);
    const userAgentArr32 = sm3Digest(lmStrEncode(strToByteArr(userAgentLmStr), TABLES.s3));
    const tm1 = new Date().getTime();
    const arr50 = [
        41, 9, 6,
        ((tm1 - tm1Before + 3) & 255),
        (tm1 >> 0) & 255,
        (tm1 >> 8) & 255,
        (tm1 >> 16) & 255,
        (tm1 >> 24) & 255,
        ((((tm1 / 256) / 256) / 256) / 256) & 255,
        (((((tm1 / 256) / 256) / 256) / 256) / 256) & 255,
        1 & 255,
        Math.floor(1 / 256) & 255,
        129,
        (129 >> 8) & 255,
        ((Math.random() * 200) | 0) + 50,
        ((Math.random() * 200) | 0) + 50,
        ((Math.random() * 200) | 0) + 50,
        ((Math.random() * 200) | 0) + 50,
        (keyVal >> 0) & 255,
        (keyVal >> 8) & 255,
        (keyVal >> 16) & 255,
        (keyVal >> 24) & 255,
        queryArr32[9],
        queryArr32[18],
        queryArr32[3],
        dataArr32[10],
        dataArr32[19],
        dataArr32[4],
        userAgentArr32[11],
        userAgentArr32[21],
        userAgentArr32[5],
        (tm2 >> 0) & 255,
        (tm2 >> 8) & 255,
        (tm2 >> 16) & 255,
        (tm2 >> 24) & 255,
        ((((tm2 / 256) / 256) / 256) / 256) & 255,
        (((((tm2 / 256) / 256) / 256) / 256) / 256) & 255,
        3,
        (preset.constVal1 >> 0) & 255,
        (preset.constVal1 >> 8) & 255,
        (preset.constVal1 >> 16) & 255,
        (preset.constVal1 >> 24) & 255,
        (preset.constVal2 >> 0) & 255,
        (preset.constVal2 >> 8) & 255,
        (preset.constVal2 >> 16) & 255,
        (preset.constVal2 >> 24) & 255,
        44, 0, 4, 0,
    ];
    const newArr50 = reorderArr50(arr50);
    const xorRandomArr8 = xorRandomArr8Gen();
    const xorArray = xorFold([...xorRandomArr8, ...arr50]);
    const arr4Merge = [...newArr50, ...fpArr, ...tmArr(tm1), ...xorArray];
    let aBogusLmStr = String.fromCharCode(...aBogusPrefix4());
    const mergeArr = [];
    for (let i = 0; i < arr4Merge.length / 3; i++) {
        const val1 = arr4Merge[3 * i];
        const val2 = arr4Merge[3 * i + 1];
        const val3 = arr4Merge[3 * i + 2];
        const randomVal = (Math.random() * 1000) & 255;
        mergeArr.push((randomVal & 145) | (val1 & 110), (randomVal & 66) | (val2 & 189), (randomVal & 44) | (val3 & 211), ((val1 & 145) | (val2 & 66)) | (val3 & 44));
    }
    const bigArr = [...xorRandomArr8, ...mergeArr, ...xorArray];
    aBogusLmStr += rc4Parse(String.fromCharCode(211), String.fromCharCode(...bigArr));
    return lmStrEncode(strToByteArr(aBogusLmStr), TABLES.s4);
}
function generateDesktopABogus(options) {
    for (const value of [options.aid, options.pageId, options.environmentMask, options.behaviorMask, options.nowMs, options.inkMs]) {
        if (!Number.isSafeInteger(value))
            throw new RangeError('BDMS requires explicit integer state');
    }
    if (![3, 11, 12].includes(options.flag))
        throw new RangeError('Invalid BDMS descriptor flag');
    for (const value of [options.query, options.body, options.userAgent, options.fingerprint]) {
        if (typeof value !== 'string')
            throw new TypeError('BDMS requires explicit string inputs');
    }
    return generateDesktopABogusWithRuntime(options, {
        flag: () => options.flag, now: () => options.nowMs, ink: () => options.inkMs,
        pageId: () => options.pageId, aid: () => options.aid, fingerprint: () => options.fingerprint,
        random: () => (options.random ?? Math.random)(),
    });
}
function generateDesktopABogusWithRuntime(options, runtime) {
    const m = options.environmentMask, b = options.behaviorMask;
    const flag = runtime.flag();
    const t = runtime.now();
    const queryHash = sm3Digest(sm3Digest(options.query + 'cus'));
    const bodyHash = sm3Digest(sm3Digest(options.body + 'cus'));
    const uaHash = sm3Digest(lmStrEncode(desktopRc4([byteAt(m, 1), byteAt(m, 0), byteAt(b, 0)], utf16Units(options.userAgent.trim())), TABLES.s3));
    const ink = runtime.ink() || 1000;
    const p = runtime.pageId(), a = runtime.aid();
    const fingerprint = runtime.fingerprint();
    const fp = utf16Units(fingerprint).flatMap(code => code > 255 ? [code >> 8, code & 255] : [code]);
    if (fp.length > 65535)
        throw new RangeError('BDMS fingerprint exceeds its 16-bit length field');
    const header = [
        44, byteAt(t, 3), byteAt(p, 3), 0, byteAt(m, 1), byteAt(b, 3), byteAt(a, 1),
        queryHash[21], bodyHash[21], byteAt(p, 2), uaHash[23], byteAt(t, 2), 0,
        byteAt(p, 1), byteAt(p, 0), byteAt(m, 0), byteAt(b, 2), byteAt(a, 0),
        queryHash[22], bodyHash[22], uaHash[24], byteAt(t, 1), 0, byteAt(m, 3),
        byteAt(a, 3), byteAt(b, 1), byteAt(t, 0), 0, byteAt(m, 2), byteAt(b, 0),
        byteAt(ink, 3), byteAt(ink, 2), byteAt(a, 2), byteAt(ink, 1), byteAt(ink, 0),
        flag, Math.trunc(ink / 2 ** 32) & 255, Math.trunc(ink / 2 ** 40) & 255,
        Math.trunc(t / 2 ** 32) & 255, Math.trunc(t / 2 ** 40) & 255,
        byteAt(fp.length, 0), byteAt(fp.length, 1), 0, 0,
    ];
    const checksum = header.reduce((value, item) => value ^ item, 0);
    const mix = (first, second) => {
        const value = runtime.random();
        if (!(value >= 0 && value < 1))
            throw new RangeError('BDMS random value must be in [0,1)');
        const word = Math.trunc(value * 10000);
        const low = word & 255;
        const high = (word >> 8) & 255;
        return [(low & 170) | (first & 85), (low & 85) | (first & 170),
            (high & 170) | (second & 85), (high & 85) | (second & 170)];
    };
    return lmStrEncode([
        ...mix(3, 45), ...mix(1, 0), ...mix(1, 7),
        ...desktopRc4([121], [...header, ...fp, checksum]),
    ], TABLES.s4);
}
function utf16Units(value) {
    return Array.from({ length: value.length }, (_, index) => value.charCodeAt(index));
}
function encodeDesktopReportData(serializedReport, math = Math) {
    const key = String.fromCharCode(math.floor(math.random() * 256)).charCodeAt(0);
    return lmStrEncode([65, key & 255, ...desktopRc4([key], utf16Units(serializedReport)).map(value => value & 255)], TABLES.s1);
}
function desktopRc4(key, input) {
    const state = Array.from({ length: 256 }, (_, index) => index);
    let previous = 0;
    for (let index = 0; index < 256; index++) {
        previous = (previous + state[index] + key[index % key.length]) & 255;
        [state[index], state[previous]] = [state[previous], state[index]];
    }
    previous = 0;
    return input.map((value, offset) => {
        const index = (offset + 1) & 255;
        previous = (previous + state[index]) & 255;
        [state[index], state[previous]] = [state[previous], state[index]];
        return value ^ state[(state[index] + state[previous]) & 255];
    });
}
function generateJumpbyteABogus(options) {
    const now = options.nowMs ?? Date.now();
    const random = options.random ?? cryptoRandomFloat;
    const query = `${options.query}${SALT}`;
    const body = `${options.body ?? ''}${SALT}`;
    const queryHash = sm3Digest(sm3Digest(query));
    const bodyHash = sm3Digest(sm3Digest(body));
    const uaHash = sm3Digest(lmStrEncode(jumpbyteGarble(jumpbyteUaSbox(0), encodeUtf8ForSm3(options.userAgent)), TABLES.s3));
    const fixed = encodeUtf8ForSm3('784|943|1707|1019|1707|1019|1707|1067|MacIntel');
    const dateBucket = Math.trunc((now - 1721836800000) / 1209600000);
    const firstTime = now;
    const secondTime = firstTime - Math.trunc(random() * 10);
    const prefix = jumpbyteRandomPrefix(random);
    const arr = new Array(55).fill(0);
    arr[0] = 41;
    arr[1] = dateBucket;
    arr[2] = 5;
    arr[3] = (firstTime - secondTime + 3) & 255;
    for (let i = 0; i < 6; i++)
        arr[4 + i] = byteAt(firstTime, i);
    arr[10] = 1;
    arr[12] = 1;
    arr[14] = 1;
    arr[22] = queryHash[9];
    arr[23] = queryHash[18];
    arr[24] = 3;
    arr[25] = queryHash[3];
    arr[26] = bodyHash[10];
    arr[27] = bodyHash[19];
    arr[28] = 4;
    arr[29] = bodyHash[4];
    arr[30] = uaHash[11];
    arr[31] = uaHash[21];
    arr[32] = 5;
    arr[33] = uaHash[5];
    for (let i = 0; i < 6; i++)
        arr[34 + i] = byteAt(secondTime, i);
    arr[40] = 3;
    writeInt32LE(arr, 41, 6241);
    writeInt32LE(arr, 45, 6383);
    const lastTime = encodeUtf8ForSm3(`${(firstTime + 3) & 255},`);
    arr[49] = fixed.length;
    arr[50] = fixed.length & 255;
    arr[51] = (fixed.length >> 8) & 255;
    arr[52] = lastTime.length;
    arr[53] = lastTime.length & 255;
    arr[54] = (lastTime.length >> 8) & 255;
    const checksumIndexes = [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
        20, 21, 22, 23, 25, 26, 27, 29, 30, 31, 33, 34, 35, 36, 37, 38, 39, 40,
        41, 42, 43, 44, 45, 46, 47, 48, 50, 51, 53, 54,
    ];
    let checksum = prefix.reduce((value, item) => value ^ item, 0);
    for (const index of checksumIndexes)
        checksum ^= arr[index];
    const order = [
        9, 18, 30, 35, 47, 4, 44, 19, 10, 23, 12, 40, 25, 42, 3, 22, 38, 21, 5,
        45, 1, 29, 6, 43, 33, 14, 36, 37, 2, 46, 15, 48, 31, 26, 16, 13, 8, 41,
        27, 17, 39, 20, 11, 0, 34, 7, 50, 51, 53, 54,
    ];
    const ordered = order.map((index) => arr[index]);
    const payload = jumpbyteExpand(prefix, [...ordered, ...fixed, ...lastTime, checksum], random);
    const header = jumpbyteHeader(random);
    const encrypted = jumpbyteGarble(jumpbyteAbSbox(), payload);
    return lmStrEncode([...header, ...encrypted], TABLES.s4);
}
function jumpbyteExpand(prefix, input, random) {
    const output = [...prefix];
    for (let i = 0; i < input.length; i += 3) {
        if (i + 2 >= input.length) {
            output.push(...input.slice(i));
            break;
        }
        const value = Math.trunc(random() * 1000) & 255;
        const first = input[i];
        const second = input[i + 1];
        const third = input[i + 2];
        output.push((value & 145) | (first & 110), (value & 66) | (second & 189), (value & 44) | (third & 211), (first & 145) | (second & 66) | (third & 44));
    }
    return output;
}
function jumpbyteHeader(random) {
    const first = Math.trunc(random() * 65535) & 255;
    const second = Math.trunc(random() * 40);
    return [
        (first & 170) | (3 & 85),
        (first & 85) | (3 & 170),
        (second & 170) | (82 & 85),
        (second & 85) | (82 & 170),
    ];
}
function jumpbyteRandomPrefix(random) {
    const first = Math.trunc(random() * 65535);
    const low = first & 255;
    const high = (first >> 8) & 255;
    const second = Math.trunc(random() * 240);
    const third = (Math.trunc(random() * 255) & 77) | 2 | 16 | 32 | 128;
    return [
        (low & 170) | (1 & 85),
        (low & 85) | (1 & 170),
        (high & 170) | (0 & 85),
        (high & 85) | (0 & 170),
        (second & 170) | (1 & 85),
        (second & 85) | (1 & 170),
        (third & 170) | (0 & 85),
        (third & 85) | (0 & 170),
    ];
}
function jumpbyteAbSbox() {
    return jumpbyteSbox([211]);
}
function jumpbyteUaSbox(salt) {
    return jumpbyteSbox([0, 1, salt]);
}
function jumpbyteSbox(key) {
    const values = Array.from({ length: 256 }, (_, index) => 255 - index);
    let previous = 0;
    for (let i = 0; i < 256; i++) {
        previous = (previous * values[i] + previous + key[i % key.length]) % 256;
        [values[i], values[previous]] = [values[previous], values[i]];
    }
    return values;
}
function jumpbyteGarble(sbox, input) {
    let previous = 0;
    return input.map((value, index) => {
        const cursor = (index + 1) % 256;
        previous = (previous + sbox[cursor]) % 256;
        const old = sbox[cursor];
        sbox[cursor] = sbox[previous];
        sbox[previous] = old;
        return value ^ sbox[(sbox[cursor] + old) % 256];
    });
}
function byteAt(value, index) {
    return Number((BigInt(Math.trunc(value)) >> BigInt(index * 8)) & 255n);
}
function writeInt32LE(target, offset, value) {
    for (let i = 0; i < 4; i++)
        target[offset + i] = (value >> (i * 8)) & 255;
}
function cryptoRandomFloat() {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(8));
    const value = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getBigUint64(0) >> 11n;
    return Number(value) / 0x20000000000000;
}
function lmStrEncode(bytes, table) {
    let out = '';
    const groupNum = bytes.length / 3;
    for (let i = 0; i < groupNum; i++) {
        const b1 = bytes[3 * i] & 255;
        const b2 = bytes[3 * i + 1] & 255;
        const b3 = bytes[3 * i + 2] & 255;
        const big = (b1 << 16) | (b2 << 8) | b3;
        out += table.charAt((big & 0xfc0000) >> 18);
        out += table.charAt((big & 0x3f000) >> 12);
        out += table.charAt((big & 0xfc0) >> 6);
        out += table.charAt(big & 0x3f);
    }
    const rem = bytes.length % 3;
    if (rem === 1) {
        out = out.substring(0, out.length - 2) + '==';
    }
    else if (rem === 2) {
        out = out.substring(0, out.length - 1) + '=';
    }
    return out;
}
function rc4Parse(key, data) {
    const sbox = Array.from({ length: 256 }, (_, i) => 255 - i);
    let j = 0;
    for (let i = 0; i < 256; i++) {
        j = (j * sbox[i] + j + key.charCodeAt(i % key.length)) % 256;
        const tmp = sbox[i];
        sbox[i] = sbox[j];
        sbox[j] = tmp;
    }
    let out = '';
    let prev = 0;
    for (let i = 0; i < data.length; i++) {
        const idx = (i + 1) % 256;
        const idx2 = (prev + sbox[idx]) % 256;
        const idx3 = (sbox[idx2] + sbox[idx]) % 256;
        prev = idx2;
        const t1 = sbox[idx];
        sbox[idx] = sbox[idx2];
        sbox[idx2] = t1;
        out += String.fromCharCode(data.charCodeAt(i) ^ sbox[idx3]);
    }
    return out;
}
function strToByteArr(s) {
    return Array.from(s, (c) => c.charCodeAt(0));
}
function tmArr(tm) {
    const tmNum = (tm + 3) & 255;
    const tmStr = `${tmNum},`;
    return strToByteArr(tmStr);
}
function aBogusPrefix4() {
    const r1 = (Math.random() * 65535) & 255;
    const r2 = Math.random() * 40;
    return [
        (r1 & 170) | 1,
        (r1 & 85) | 2,
        ((r2 >> 0) & 170) | 80,
        ((r2 >> 0) & 85) | 2,
    ];
}
function xorRandomArr8Gen() {
    const r1 = Math.random() * 65535;
    const t1 = r1 & 255;
    const t2 = (r1 >> 8) & 255;
    const n1 = (t1 & 170) | 1;
    const n2 = (t1 & 85) | 0;
    const n3 = (t2 & 170) | 0;
    const n4 = (t2 & 85) | 0;
    const randomVal = Math.random() * 255;
    let isEven = (Math.random() * 240) + 110;
    if (isEven % 2 !== 0)
        isEven++;
    const n5 = (isEven & 170) | 1;
    const n6 = (isEven & 85) | 0;
    const n7 = (((((((randomVal >> 0) & 77) | 2) | 16) | 32) | 128) & 170) | 16;
    const n8 = (((((((randomVal >> 0)) & 77) | 16) | 32) | 128) & 85) | 2;
    return [n1, n2, n3, n4, n5, n6, n7, n8];
}
function reorderArr50(arr50) {
    const o = new Array(50);
    o[0] = arr50[9];
    o[1] = arr50[18];
    o[2] = arr50[28];
    o[3] = arr50[32];
    o[4] = arr50[11];
    o[5] = arr50[4];
    o[6] = arr50[11];
    o[7] = arr50[11];
    o[8] = arr50[9];
    o[9] = arr50[23];
    o[10] = arr50[12];
    o[11] = arr50[37];
    o[12] = arr50[24];
    o[13] = arr50[39];
    o[14] = arr50[3];
    o[15] = arr50[22];
    o[16] = arr50[35];
    o[17] = arr50[11];
    o[18] = arr50[5];
    o[19] = arr50[42];
    o[20] = arr50[1];
    o[21] = arr50[27];
    o[22] = arr50[33];
    o[23] = arr50[11];
    o[24] = arr50[30];
    o[25] = arr50[14];
    o[26] = arr50[6];
    o[27] = arr50[7];
    o[28] = arr50[2];
    o[29] = arr50[43];
    o[30] = arr50[15];
    o[31] = arr50[11];
    o[32] = arr50[29];
    o[33] = arr50[25];
    o[34] = arr50[16];
    o[35] = arr50[11];
    o[36] = arr50[8];
    o[37] = arr50[38];
    o[38] = arr50[26];
    o[39] = arr50[17];
    o[40] = arr50[9];
    o[41] = arr50[11];
    o[42] = arr50[11];
    o[43] = arr50[0];
    o[44] = arr50[31];
    o[45] = arr50[7];
    o[46] = arr50[46];
    o[47] = arr50[47];
    o[48] = arr50[48];
    o[49] = arr50[49];
    return o;
}
function xorFold(arr) {
    let x = 0;
    for (const v of arr)
        x ^= v;
    return [x];
}
function sm3Digest(data) {
    const bytes = typeof data === 'string' ? encodeUtf8ForSm3(data) : data;
    const h = new Sm3();
    return h.sum(bytes);
}
function encodeUtf8ForSm3(text) {
    const encoded = encodeURIComponent(text).replace(/%([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    return Array.from(encoded, (c) => c.charCodeAt(0));
}
class Sm3 {
    reg = [];
    chunk = [];
    size = 0;
    reset() {
        this.reg = [
            1937774191, 1226093241, 388252375, 3666478592, 2842636476, 372324522,
            3817729613, 2969243214,
        ];
        this.chunk = [];
        this.size = 0;
    }
    write(data) {
        this.size += data.length;
        let r = 64 - this.chunk.length;
        if (data.length < r) {
            this.chunk = this.chunk.concat(data);
            return;
        }
        this.chunk = this.chunk.concat(data.slice(0, r));
        while (this.chunk.length >= 64) {
            this.compressBlock(this.chunk);
            if (r < data.length) {
                this.chunk = data.slice(r, Math.min(r + 64, data.length));
            }
            else {
                this.chunk = [];
            }
            r += 64;
        }
    }
    sum(data) {
        this.reset();
        if (data.length) {
            this.write(data);
        }
        this.fill();
        for (let i = 0; i < this.chunk.length; i += 64) {
            this.compressBlock(this.chunk.slice(i, i + 64));
        }
        const out = new Array(32);
        for (let i = 0; i < 8; i++) {
            let c = this.reg[i];
            out[4 * i + 3] = c & 255;
            c >>>= 8;
            out[4 * i + 2] = c & 255;
            c >>>= 8;
            out[4 * i + 1] = c & 255;
            c >>>= 8;
            out[4 * i] = c & 255;
        }
        this.reset();
        return out;
    }
    fill() {
        const bitLen = 8 * this.size;
        let e = this.chunk.push(128) % 64;
        for (; 64 - e < 8; e -= 64) {
        }
        for (; e < 56; e++) {
            this.chunk.push(0);
        }
        for (let i = 0; i < 4; i++) {
            const n = Math.floor(bitLen / 0x100000000);
            this.chunk.push((n >>> (8 * (3 - i))) & 255);
        }
        for (let i = 0; i < 4; i++) {
            this.chunk.push((bitLen >>> (8 * (3 - i))) & 255);
        }
    }
    compressBlock(block) {
        const w = expand(block);
        const r = this.reg.slice();
        for (let j = 0; j < 64; j++) {
            let o = rotl(r[0], 12) + r[4] + rotl(tj(j), j);
            o = rotl((o & 0xffffffff) >>> 0, 7);
            const i = ((o ^ rotl(r[0], 12)) & 0xffffffff) >>> 0;
            let u = (ff(j, r[0], r[1], r[2]) + r[3] + i + w[j + 68]) & 0xffffffff;
            u >>>= 0;
            let c = (gg(j, r[4], r[5], r[6]) + r[7] + o + w[j]) & 0xffffffff;
            c >>>= 0;
            r[3] = r[2];
            r[2] = rotl(r[1], 9);
            r[1] = r[0];
            r[0] = u;
            r[7] = r[6];
            r[6] = rotl(r[5], 19);
            r[5] = r[4];
            r[4] = (c ^ rotl(c, 9) ^ rotl(c, 17)) >>> 0;
        }
        for (let a = 0; a < 8; a++) {
            this.reg[a] = (this.reg[a] ^ r[a]) >>> 0;
        }
    }
}
function rotl(x, n) {
    n %= 32;
    return ((x << n) | (x >>> (32 - n))) >>> 0;
}
function tj(j) {
    return j < 16 ? 2043430169 : 2055708042;
}
function ff(j, a, b, c) {
    return j < 16 ? (a ^ b ^ c) >>> 0 : ((a & b) | (a & c) | (b & c)) >>> 0;
}
function gg(j, a, b, c) {
    return j < 16 ? (a ^ b ^ c) >>> 0 : ((a & b) | (~a & c)) >>> 0;
}
function expand(block) {
    const w = new Array(132).fill(0);
    for (let i = 0; i < 16; i++) {
        w[i] =
            ((block[4 * i] << 24) |
                (block[4 * i + 1] << 16) |
                (block[4 * i + 2] << 8) |
                block[4 * i + 3]) >>>
                0;
    }
    for (let i = 16; i < 68; i++) {
        let t = w[i - 16] ^ w[i - 9] ^ rotl(w[i - 3], 15);
        t = (t ^ rotl(t, 15) ^ rotl(t, 23)) >>> 0;
        w[i] = (t ^ rotl(w[i - 13], 7) ^ w[i - 6]) >>> 0;
    }
    for (let i = 0; i < 64; i++) {
        w[i + 68] = (w[i] ^ w[i + 4]) >>> 0;
    }
    return w;
}

},"desktop-fingerprint":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectDesktopScreenGeometry = collectDesktopScreenGeometry;
exports.collectDesktopReportScreen = collectDesktopReportScreen;
exports.buildDesktopFingerprint = buildDesktopFingerprint;
function collectDesktopScreenGeometry(context) {
    const int32 = (value) => value >> 0;
    return {
        innerWidth: int32(context.window.innerWidth), innerHeight: int32(context.window.innerHeight),
        outerWidth: int32(context.window.outerWidth), outerHeight: int32(context.window.outerHeight),
        screenX: int32(context.window.screenX), screenY: int32(context.window.screenY),
        pageXOffset: int32(context.window.pageYOffset), pageYOffset: int32(context.window.pageYOffset),
        availWidth: int32(context.window.screen.availWidth), availHeight: int32(context.window.screen.availHeight),
        sizeWidth: int32(context.window.screen.width), sizeHeight: int32(context.window.screen.height),
        clientWidth: context.document.body ? int32(context.document.body.clientWidth) : -1,
        clientHeight: context.document.body ? int32(context.document.body.clientHeight) : -1,
        colorDepth: int32(context.window.screen.colorDepth), pixelDepth: int32(context.window.screen.pixelDepth),
    };
}
function collectDesktopReportScreen(context) {
    return {
        ...collectDesktopScreenGeometry(context),
        orientaionType: context.window.screen?.orientation?.type || '',
        orientaionAngle: context.window.screen?.orientation?.angle >> 0,
    };
}
function buildDesktopFingerprint(context) {
    return [...Object.values(collectDesktopScreenGeometry(context)), context.navigator.platform].map(value => String(value)).join('|');
}

},"desktop-device-report":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesktopDeviceReporter = void 0;
const desktop_property_write_js_1 = require("./desktop-property-write.js");
const desktop_battery_js_1 = require("./desktop-battery.js");
const desktop_device_properties_js_1 = require("./desktop-device-properties.js");
const desktop_device_identity_js_1 = require("./desktop-device-identity.js");
const desktop_navigator_js_1 = require("./desktop-navigator.js");
const desktop_plugins_js_1 = require("./desktop-plugins.js");
const desktop_fingerprint_js_1 = require("./desktop-fingerprint.js");
const desktop_webgl_js_1 = require("./desktop-webgl.js");
const desktop_window_js_1 = require("./desktop-window.js");
class DesktopDeviceReporter {
    context;
    config;
    environment;
    behavior;
    sender;
    document;
    navigator;
    window;
    identity;
    constructor(context, config, environment, behavior, sender) {
        this.context = context;
        this.config = config;
        this.environment = environment;
        this.behavior = behavior;
        this.sender = sender;
        this.document = new desktop_device_properties_js_1.DesktopDocumentCollector(context);
        this.identity = new desktop_device_identity_js_1.DesktopDeviceIdentityCollector(context);
        this.navigator = new desktop_navigator_js_1.DesktopNavigatorCollector(context, this.document);
        this.window = new desktop_window_js_1.DesktopWindowCollector(context, this.document);
    }
    report = async () => {
        const battery = await (0, desktop_battery_js_1.collectDesktopBattery)(this.context);
        const document = this.document.collect();
        const navigator = this.navigator.collect();
        const plugins = (0, desktop_plugins_js_1.collectDesktopPlugins)(this.context);
        const screen = (0, desktop_fingerprint_js_1.collectDesktopReportScreen)(this.context);
        const webgl = (0, desktop_webgl_js_1.collectDesktopWebGl)(this.context);
        const window = this.window.collect();
        const wID = await this.identity.collect();
        const envCode = this.environment.mask();
        const ubCode = this.behavior.mask();
        const report = { battery, document, navigator, plugins, screen, webgl, window, wID, envCode, ubCode };
        (0, desktop_property_write_js_1.setDesktopProperty)(report.wID, 'aid', this.config.aid);
        (0, desktop_property_write_js_1.setDesktopProperty)(report.wID, 'pageId', this.config.pageId);
        this.sender.send(report);
    };
}
exports.DesktopDeviceReporter = DesktopDeviceReporter;

},"desktop-battery":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectDesktopBattery = collectDesktopBattery;
async function collectDesktopBattery(context) {
    try {
        const battery = await context.navigator.getBattery();
        return {
            charging: battery.charging ? 1 : 2,
            chargingTime: battery.chargingTime + '',
            dischargingTime: battery.dischargingTime + '',
            level: context.Math.round(battery.level * 100),
        };
    }
    catch {
        return {};
    }
}

},"desktop-device-properties":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesktopDocumentCollector = exports.DesktopPropertyClassifier = void 0;
const desktop_property_write_js_1 = require("./desktop-property-write.js");
class DesktopPropertyClassifier {
    symbol;
    object;
    typeOf;
    constructor(context) {
        this.symbol = context.Symbol;
        this.object = context.Object;
    }
    classify(target, key) {
        return this.classifyProperty(target, key);
    }
    classifyProperty(target, key, onReadError) {
        let value;
        try {
            value = target[key];
        }
        catch {
            onReadError?.();
            return 404;
        }
        const tag = this.object.prototype.toString.call(value);
        switch (tag) {
            case '[object Boolean]': return value === true ? 1 : 2;
            case '[object Function]': return 3;
            case '[object Undefined]': return 4;
            case '[object Number]': return 5;
            case '[object String]': return value === '' ? 7 : 8;
            case '[object Array]': return value.length === 0 ? 9 : 10;
            case '[object Object]': return 11;
            case '[object HTMLAllCollection]': return 12;
            case '[object Storage]': return 13;
            default: return this.fallbackType(value) === 'object' ? 99 : -1;
        }
    }
    fallbackType(value) {
        if (!this.typeOf) {
            this.typeOf = typeof this.symbol === 'function' && typeof this.symbol.iterator === 'symbol'
                ? input => typeof input
                : input => input && typeof this.symbol === 'function' &&
                    input.constructor === this.symbol && input !== this.symbol.prototype
                    ? 'symbol' : typeof input;
        }
        return this.typeOf(value);
    }
}
exports.DesktopPropertyClassifier = DesktopPropertyClassifier;
class DesktopDocumentCollector extends DesktopPropertyClassifier {
    context;
    constructor(context) {
        super(context);
        this.context = context;
    }
    collect() {
        let result = {};
        const classify = (key) => {
            const document = this.context.document;
            return this.classifyProperty(document, key, () => {
                result = document;
            });
        };
        const put = (key, value) => { (0, desktop_property_write_js_1.setDesktopProperty)(result, key, value); };
        put('all', classify('all'));
        put('characterSet', this.context.document.characterSet + '');
        put('compatMode', this.context.document.compatMode + '');
        put('documentMode', this.context.document.documentMode + '');
        put('images', classify('images'));
        put('layers', classify('layers'));
        return result;
    }
}
exports.DesktopDocumentCollector = DesktopDocumentCollector;

},"desktop-device-identity":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesktopDeviceIdentityCollector = void 0;
const desktop_property_write_js_1 = require("./desktop-property-write.js");
const fonts = [
    'Trebuchet MS', 'Wingdings', 'Sylfaen', 'Segoe UI', 'Constantia', 'SimSun-ExtB', 'MT Extra',
    'Gulim', 'Leelawadee', 'Tunga', 'Meiryo', 'Vrinda', 'CordiaUPC', 'Aparajita', 'IrisUPC',
    'Palatino', 'Colonna MT', 'Playbill', 'Jokerman', 'Parchment', 'MS Outlook', 'Tw Cen MT',
    'OPTIMA', 'Futura', 'AVENIR', 'Arial Hebrew', 'Savoye LET', 'Castellar', 'MYRIAD PRO',
].map(name => `72px ${name}`);
const permissions = [
    'geolocation', 'notifications', 'push', 'midi', 'camera', 'microphone', 'speaker', 'device-info',
    'background-sync', 'bluetooth', 'persistent-storage', 'ambient-light-sensor', 'accelerometer',
    'gyroscope', 'magnetometer', 'clipboard', 'accessibility-events', 'clipboard-read',
    'clipboard-write', 'payment-handler',
];
class DesktopDeviceIdentityCollector {
    context;
    date;
    math;
    constructor(context) {
        this.context = context;
        this.date = context.Date;
        this.math = context.Math;
    }
    async collect() {
        const browserType = this.browserType();
        const jsFontsList = this.fonts();
        const jsv = '1.5';
        const load = await this.imageLoad();
        const magic = this.storage();
        const nap = await this.permissions();
        const nativeLength = this.context.window.eval.toString().length;
        const timestamp = this.date.now() + '';
        const timezone = -this.math.floor(new this.date().getTimezoneOffset() / 60);
        return { browserType, jsFontsList, jsv, load, magic, msgType: 1, nap, nativeLength, privacyMode: 0, timestamp, timezone };
    }
    browserType() {
        const opera = !!this.context.window.opr;
        const firefox = typeof this.context.window.InstallTrigger !== 'undefined';
        const edge = !!this.context.window.chrome?.edgeNurturingPrivate;
        const ie = !!this.context.document.documentMode;
        const chrome = !!this.context.window.chrome && !opera && !edge;
        const safari = !!this.context.window.ApplePaySession;
        return [opera, firefox, edge, ie, chrome, false, safari].reduce((mask, value, index) => value ? mask | (1 << index) : mask, 0);
    }
    fonts() {
        if (!this.context.document)
            return '0';
        if (!this.context.document.fonts || !this.context.document.fonts.check)
            return '1';
        let mask = 0;
        for (let index = 0; index < fonts.length; index++) {
            if (this.context.document.fonts.check(fonts[index]))
                mask |= 1 << index;
        }
        return mask.toString(16);
    }
    async imageLoad() {
        return new Promise(resolve => {
            const image = new this.context.Image();
            (0, desktop_property_write_js_1.setDesktopProperty)(image, 'onload', () => {
                try {
                    const canvas = this.context.document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    if (!context) {
                        resolve(1);
                        return;
                    }
                    context.drawImage(image, 0, 0);
                    resolve(context.getImageData(0, 0, 1, 1).data[3] === 0 ? 3 : 2);
                }
                catch {
                    resolve(1);
                }
            });
            (0, desktop_property_write_js_1.setDesktopProperty)(image, 'onerror', () => { resolve(1); });
            (0, desktop_property_write_js_1.setDesktopProperty)(image, 'src', 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
        });
    }
    storage() {
        let mask = 0;
        try {
            this.context.localStorage.setItem('bdms', '');
            this.context.localStorage.removeItem('bdms');
            mask |= 1;
        }
        catch { }
        try {
            this.context.sessionStorage.setItem('bdms', '');
            this.context.sessionStorage.removeItem('bdms');
            mask |= 2;
        }
        catch { }
        return mask;
    }
    async permissions() {
        if (!this.context.navigator.permissions)
            return '6';
        try {
            const queries = permissions.map(name => this.context.navigator.permissions.query({ name })
                .then(result => {
                switch (result.state) {
                    case 'granted': return '2';
                    case 'denied': return '0';
                    case 'prompt': return '1';
                    default: return '5';
                }
            }).catch((error) => error.message.indexOf('is not a valid enum value of type PermissionName') > 0 ? '4' : '3'));
            return (await Promise.all(queries)).join('');
        }
        catch {
            return '7';
        }
    }
}
exports.DesktopDeviceIdentityCollector = DesktopDeviceIdentityCollector;

},"desktop-navigator":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesktopNavigatorCollector = void 0;
const desktop_property_write_js_1 = require("./desktop-property-write.js");
class DesktopNavigatorCollector {
    context;
    properties;
    math;
    constructor(context, properties) {
        this.context = context;
        this.properties = properties;
        this.math = context.Math;
    }
    touchstart = () => {
        try {
            return 'ontouchstart' in this.context.window ? 1 : 2;
        }
        catch {
            return 2;
        }
    };
    collect() {
        let result = {};
        const put = (key, value) => {
            if (result === null || result === undefined)
                throw new TypeError(`Cannot set properties of ${result}`);
            (0, desktop_property_write_js_1.setDesktopProperty)(Object(result), key, value, result);
        };
        const text = (key) => put(key, this.context.navigator[key] + '');
        const classify = (key) => put(key, this.properties.classify(this.context.navigator, key));
        const floor = (key) => put(key, this.context.navigator[key]
            ? this.math.floor(this.context.navigator[key]) : -1);
        text('appCodeName');
        text('appMinorVersion');
        text('appName');
        text('appVersion');
        classify('bluetooth');
        text('buildID');
        classify('cookieEnabled');
        text('cpuClass');
        classify('credentials');
        text('deviceMemory');
        text('doNotTrack');
        floor('hardwareConcurrency');
        text('language');
        text('languages');
        floor('maxTouchPoints');
        text('msDoNotTrack');
        text('oscpu');
        text('platform');
        text('product');
        text('productSub');
        classify('requestMediaKeySystemAccess');
        classify('storage');
        text('systemLanguage');
        let document;
        let touchEvent = 2;
        try {
            document = this.context.document;
        }
        catch {
            result = null;
        }
        if (result !== null) {
            let createEvent;
            let read = false;
            try {
                createEvent = document.createEvent;
                read = true;
            }
            catch {
                result = document;
            }
            if (read) {
                try {
                    Reflect.apply(createEvent, document, ['TouchEvent']);
                    touchEvent = 1;
                }
                catch { }
            }
        }
        put('touchEvent', touchEvent);
        let window;
        let read = false;
        let touchstart = 2;
        try {
            window = this.context.window;
            read = true;
        }
        catch {
            result = this.touchstart;
        }
        if (read) {
            try {
                touchstart = 'ontouchstart' in window ? 1 : 2;
            }
            catch {
                result = 'ontouchstart';
            }
        }
        put('touchstart', touchstart);
        text('userLanguage');
        text('vendor');
        text('vendorSub');
        classify('vibrate');
        text('webdriver');
        return result;
    }
}
exports.DesktopNavigatorCollector = DesktopNavigatorCollector;

},"desktop-plugins":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectDesktopPlugins = collectDesktopPlugins;
function collectDesktopPlugins(context) {
    const values = [];
    try {
        if (context.navigator.plugins && context.navigator.plugins.length) {
            for (let i = 0; i < context.navigator.plugins.length; i++) {
                const plugin = context.navigator.plugins.item(i);
                if (plugin && plugin.length) {
                    for (let j = 0; j < plugin.length; j++) {
                        const mime = plugin.item(j);
                        if (mime) {
                            values.push(''.concat(plugin.filename, '|')
                                .concat(mime.type, '|').concat(mime.suffixes));
                        }
                    }
                }
            }
        }
    }
    catch { }
    return { plugin: values, pv: '0' };
}

},"desktop-webgl":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectDesktopWebGl = collectDesktopWebGl;
const desktop_property_write_js_1 = require("./desktop-property-write.js");
function collectDesktopWebGl(context) {
    let gl;
    try {
        gl = context.document.createElement('canvas').getContext('webgl');
        if (!gl)
            return {};
    }
    catch {
        return {};
    }
    const result = {
        antialias: gl.getContextAttributes()?.antialias ? 1 : 2,
        blueBits: gl.getParameter(gl.BLUE_BITS),
        depthBits: gl.getParameter(gl.DEPTH_BITS),
        greenBits: gl.getParameter(gl.GREEN_BITS),
        maxCombinedTextureImageUnits: gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
        maxCubeMapTextureSize: gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE),
        maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
        maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
        maxTextureImageUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
        maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
        maxVertexTextureImageUnits: gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
        maxVertexUniformVectors: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
        shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        stencilBits: gl.getParameter(gl.STENCIL_BITS),
        version: gl.getParameter(gl.VERSION),
    };
    const anisotropy = gl.getExtension('EXT_texture_filter_anisotropic');
    if (anisotropy) {
        const value = gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
        (0, desktop_property_write_js_1.setDesktopProperty)(result, 'maxAnisotropy', value === 0 ? 2 : value);
    }
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    if (debug) {
        (0, desktop_property_write_js_1.setDesktopProperty)(result, 'renderer', gl.getParameter(debug.UNMASKED_RENDERER_WEBGL));
        (0, desktop_property_write_js_1.setDesktopProperty)(result, 'vendor', gl.getParameter(debug.UNMASKED_VENDOR_WEBGL));
    }
    return result;
}

},"desktop-window":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesktopWindowCollector = void 0;
class DesktopWindowCollector {
    context;
    properties;
    math;
    constructor(context, properties) {
        this.context = context;
        this.properties = properties;
        this.math = context.Math;
    }
    collect() {
        const classify = (key) => this.properties.classify(this.context.window, key);
        return {
            ActiveXObject: classify('ActiveXObject'),
            BluetoothUUID: classify('BluetoothUUID'),
            devicePixelRatio: this.context.window.devicePixelRatio ? this.math.floor(this.context.window.devicePixelRatio) : -1,
            external: classify('external'),
            Image: classify('Image'),
            indexDB: classify('indexDB'),
            isSecureContext: classify('isSecureContext'),
            localStorage: classify('localStorage'),
            location: this.context.window.location?.href || '',
            locationbar: classify('locationbar'),
            mozRTCPeerConnection: classify('mozRTCPeerConnection'),
            netscape: classify('netscape'),
            postMessage: classify('postMessage'),
            sessionStorage: classify('sessionStorage'),
            toolbar: classify('toolbar'),
            webkitRequestAnimationFrame: classify('webkitRequestAnimationFrame'),
        };
    }
}
exports.DesktopWindowCollector = DesktopWindowCollector;

},"desktop-token":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesktopTokenState = void 0;
exports.signDesktopXhrUrl = signDesktopXhrUrl;
exports.prepareDesktopXhrUrl = prepareDesktopXhrUrl;
class DesktopTokenState {
    context;
    inner = '';
    constructor(context) {
        this.context = context;
        try {
            this.inner = context.localStorage.getItem('xmst') || '';
        }
        catch { }
    }
    get token() { return this.inner; }
    onReportLoad(xhr, deviceReport) {
        const alreadyHadToken = !!this.inner;
        const next = xhr.getResponseHeader('x-ms-token');
        if (!next)
            return;
        try {
            this.context.localStorage.setItem('xmst', next);
        }
        catch { }
        this.inner = next;
        if (!alreadyHadToken)
            Reflect.apply(this.context.requestAnimationFrame, null, [deviceReport]);
    }
}
exports.DesktopTokenState = DesktopTokenState;
function signDesktopXhrUrl(context, input, body, state, signer) {
    const { url, isUrl } = prepareDesktopXhrUrl(context, input, body, state, signer);
    return isUrl ? url : url.href;
}
function prepareDesktopXhrUrl(context, input, body, state, signer) {
    const isUrl = typeof context.URL !== 'undefined' && input instanceof context.URL;
    const url = isUrl ? input : new context.URL(input, context.location.href);
    if (!url.searchParams.has('msToken') && state.token)
        url.searchParams.append('msToken', state.token);
    if (!url.searchParams.has('a_bogus')) {
        const signature = signer.sign(url.searchParams.toString(), body);
        url.searchParams.append('a_bogus', signature);
    }
    return { url, isUrl };
}

},"desktop-report":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesktopReportSender = void 0;
const desktop_property_write_js_1 = require("./desktop-property-write.js");
const aBogus_js_1 = require("./aBogus.js");
class DesktopReportSender {
    context;
    config;
    tokens;
    deviceReport;
    originalOpen;
    originalSend;
    originalAddListener;
    constructor(context, config, tokens, deviceReport) {
        this.context = context;
        this.config = config;
        this.tokens = tokens;
        this.deviceReport = deviceReport;
        this.originalOpen = context.XMLHttpRequest.prototype.open;
        this.originalSend = context.XMLHttpRequest.prototype.send;
        this.originalAddListener = context.XMLHttpRequest.prototype.addEventListener;
    }
    send(report, beacon = false) {
        const xhr = new this.context.XMLHttpRequest();
        let base = this.config.boe ? 'https://mssdk-boe.bytedance.net' : 'https://mssdk.bytedance.com';
        if (this.config.rpU)
            base = this.config.rpU;
        const url = new this.context.URL(base + '/web/common');
        url.searchParams.append('ms_appid', this.config.aid + '' || '');
        if (this.tokens.token)
            url.searchParams.append('msToken', this.tokens.token);
        const body = this.context.JSON.stringify({
            magic: 538969122, version: 1, dataType: 8,
            strData: (0, aBogus_js_1.encodeDesktopReportData)(this.context.JSON.stringify(report), this.context.Math),
            tspFromClient: this.context.Date.now(), ulr: beacon ? 1 : 0,
        });
        if (beacon) {
            try {
                this.context.navigator.sendBeacon(url.href, body);
            }
            catch { }
            return;
        }
        (0, desktop_property_write_js_1.setDesktopProperty)(xhr, 'withCredentials', true);
        const listenerArgs = ['load', () => this.tokens.onReportLoad(xhr, this.deviceReport)];
        const openArgs = ['POST', url.href, true];
        const sendArgs = [body];
        try {
            this.originalAddListener.apply(xhr, listenerArgs);
            this.originalOpen.apply(xhr, openArgs);
            this.originalSend.apply(xhr, sendArgs);
        }
        catch {
            xhr.addEventListener.apply(xhr, listenerArgs);
            xhr.open.apply(xhr, openArgs);
            xhr.send.apply(xhr, sendArgs);
        }
    }
}
exports.DesktopReportSender = DesktopReportSender;

},"desktop-report-lifecycle":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesktopReportLifecycle = void 0;
class DesktopReportLifecycle {
    context;
    config;
    sources;
    sender;
    deviceReport;
    startCollection;
    deviceStarted = false;
    behaviorStarted = false;
    visibilityStarted = false;
    behaviorReported = false;
    lastBehaviorTime;
    constructor(context, config, sources, sender, deviceReport, startCollection) {
        this.context = context;
        this.config = config;
        this.sources = sources;
        this.sender = sender;
        this.deviceReport = deviceReport;
        this.startCollection = startCollection;
        this.lastBehaviorTime = context.performance.now();
    }
    start() {
        if (this.config.dump && !this.visibilityStarted) {
            this.visibilityStarted = true;
            this.context.document.addEventListener('visibilitychange', this.onVisibilityChange);
        }
        if (this.config.track.mode === 1)
            return;
        if (this.config.track.mode === 2) {
            this.startDevice();
            return;
        }
        if (this.config.track.mode === 0) {
            this.startDevice();
            if (!this.behaviorStarted) {
                this.behaviorStarted = true;
                Reflect.apply(this.startCollection, null, []);
                Reflect.apply(this.context.setInterval, null, [this.reportBehavior, this.config.track.delay * 1000]);
            }
        }
    }
    reportBehavior = () => {
        const now = this.context.performance.now();
        if (now - this.lastBehaviorTime >= 3000 || !this.behaviorReported) {
            this.behaviorReported = true;
            this.lastBehaviorTime = now;
            const report = this.collectBehavior();
            Reflect.apply(this.context.requestAnimationFrame, null, [() => this.sender.send(report)]);
        }
    };
    onVisibilityChange = () => {
        if (!this.behaviorReported) {
            this.behaviorReported = true;
            this.sender.send(this.collectBehavior(), true);
        }
    };
    startDevice() {
        if (!this.deviceStarted) {
            this.deviceStarted = true;
            Reflect.apply(this.context.setTimeout, null, [this.deviceReport, this.config.ddrt * 1000]);
        }
    }
    collectBehavior() {
        return {
            wID: { msgType: 2, privacyMode: 0, timestamp: this.context.Date.now() + '' },
            behavior: {
                beMove: this.sources.move.data(), beClick: this.sources.click.data(),
                beClickEnd: this.sources.clickEnd.data(), beKeyboard: this.sources.keyboard.data(),
                windowState: this.sources.windowState.data(), gyro: this.sources.gyro.data(),
                focus: this.sources.focus.data(), screen: Reflect.apply(this.sources.screen, null, []),
            },
        };
    }
}
exports.DesktopReportLifecycle = DesktopReportLifecycle;

},"desktop-xhr-hook":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.installDesktopXhrHook = installDesktopXhrHook;
const desktop_property_write_js_1 = require("./desktop-property-write.js");
const desktop_token_js_1 = require("./desktop-token.js");
function installDesktopXhrHook(context, tokens, callbacks) {
    const prototype = context.XMLHttpRequest.prototype;
    const open = prototype.open;
    const send = prototype.send;
    const header = prototype.setRequestHeader;
    function copy(args) {
        const length = args.length;
        const result = new context.Array(length);
        for (let i = 0; i < length; i++)
            (0, desktop_property_write_js_1.setDesktopProperty)(result, i, args[i]);
        return result;
    }
    (0, desktop_property_write_js_1.setDesktopProperty)(prototype, 'open', function () {
        (0, desktop_property_write_js_1.deleteDesktopProperty)(this, 'bdmsInvokeList');
        const args = copy(arguments);
        const input = args[1];
        const isUrl = typeof context.URL !== 'undefined' && input instanceof context.URL;
        const pathname = isUrl ? input.pathname : new context.URL(input, context.location.href).pathname;
        if (!Reflect.apply(callbacks.matchesSigning, null, [pathname])) {
            open.apply(this, args);
            return;
        }
        (0, desktop_property_write_js_1.setDesktopProperty)(this, 'bdmsInvokeList', []);
        this.bdmsInvokeList.push({ func: open, args });
    });
    (0, desktop_property_write_js_1.setDesktopProperty)(prototype, 'setRequestHeader', function () {
        const args = copy(arguments);
        if (this.bdmsInvokeList) {
            this.bdmsInvokeList.push({ func: header, args });
            return;
        }
        header.apply(this, args);
    });
    (0, desktop_property_write_js_1.setDesktopProperty)(prototype, 'send', function (body) {
        if (this.bdmsInvokeList) {
            const args = this.bdmsInvokeList[0].args;
            const { url, isUrl } = (0, desktop_token_js_1.prepareDesktopXhrUrl)(context, args[1], body, tokens, {
                sign: (query, value) => Reflect.apply(callbacks.sign, null, [query, value]),
            });
            if (!isUrl)
                (0, desktop_property_write_js_1.setDesktopProperty)(args, 1, url.href);
            this.bdmsInvokeList.forEach(entry => { entry.func.apply(this, entry.args); });
            if (Reflect.apply(callbacks.matchesBehavior, null, [url.pathname])) {
                Reflect.apply(callbacks.reportBehavior, null, []);
            }
            (0, desktop_property_write_js_1.deleteDesktopProperty)(this, 'bdmsInvokeList');
        }
        send.apply(this, [body]);
    });
}

},"desktop-fetch-hook":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.installDesktopFetchHook = installDesktopFetchHook;
const desktop_property_write_js_1 = require("./desktop-property-write.js");
function installDesktopFetchHook(context, tokens, callbacks) {
    if (typeof context.window.fetch !== 'function')
        return;
    const fetch = context.window.fetch;
    (0, desktop_property_write_js_1.setDesktopProperty)(context.window, 'fetch', async function (input, options = {}) {
        const isRequest = typeof context.Request !== 'undefined' && input instanceof context.Request;
        const isUrl = typeof context.URL !== 'undefined' && input instanceof context.URL;
        const base = context.location.href;
        const url = isRequest ? new context.URL(input.url, base) : isUrl ? input : new context.URL(input, base);
        if (!Reflect.apply(callbacks.matchesSigning, null, [url.pathname])) {
            return Reflect.apply(fetch, null, [input, options]);
        }
        if (Reflect.apply(callbacks.matchesBehavior, null, [url.pathname])) {
            Reflect.apply(callbacks.reportBehavior, null, []);
        }
        if (tokens.token && !url.searchParams.has('msToken'))
            url.searchParams.append('msToken', tokens.token);
        if (isRequest) {
            return input.clone().text().then(text => {
                const contentType = input.headers?.get('content-type') || undefined;
                const signature = Reflect.apply(callbacks.sign, null, [url.search.slice(1), options.body ?? text, contentType]);
                url.searchParams.append('a_bogus', signature);
                const init = {
                    cache: input.cache, credentials: input.credentials, headers: input.headers,
                    integrity: input.integrity, method: input.method, mode: input.mode,
                    redirect: input.redirect, referrer: input.referrer, referrerPolicy: input.referrerPolicy,
                };
                if (input.body)
                    init.body = text;
                else {
                    (0, desktop_property_write_js_1.setDesktopProperty)(Object(options), 'body', options.body ?? text, options);
                    if ((options.method || init.method || 'GET').toUpperCase() === 'GET' && text === '') {
                        (0, desktop_property_write_js_1.setDesktopProperty)(Object(options), 'body', null, options);
                    }
                }
                const request = new context.Request(url.href, init);
                return Reflect.apply(fetch, null, [request, options]);
            });
        }
        const signature = Reflect.apply(callbacks.sign, null, [url.search.slice(1), options.body]);
        url.searchParams.append('a_bogus', signature);
        return Reflect.apply(fetch, null, [isUrl ? url : url.href, options]);
    });
}

},"desktop-eventsource-hook":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.installDesktopEventSourceHook = installDesktopEventSourceHook;
const desktop_property_write_js_1 = require("./desktop-property-write.js");
function installDesktopEventSourceHook(context, tokens, callbacks) {
    if (typeof context.window.EventSource !== 'function')
        return;
    const parent = context.window.EventSource;
    const object = context.Object;
    const typeError = context.TypeError;
    if (typeof parent !== 'function' && parent !== null) {
        throw new typeError('Super expression must either be null or a function');
    }
    let getPrototype;
    const prototypeOf = (value) => {
        if (!getPrototype) {
            if (object.setPrototypeOf) {
                const get = object.getPrototypeOf;
                getPrototype = Reflect.apply(get.bind, get, []);
            }
            else
                getPrototype = value => Reflect.get(value, '__proto__') || object.getPrototypeOf(value);
        }
        return getPrototype(value);
    };
    const Wrapper = function (input, options) {
        if (!(this instanceof Wrapper))
            throw new typeError('Cannot call a class as a function');
        const url = Wrapper.handleUrl(input);
        const superConstructor = prototypeOf(Wrapper);
        let result;
        if (useReflect) {
            const newTarget = Reflect.get(prototypeOf(this), 'constructor');
            result = context.Reflect.construct(superConstructor, [url, options], newTarget);
        }
        else {
            result = superConstructor.apply(this, [url, options]);
        }
        if (result && (typeof result === 'object' || typeof result === 'function'))
            return result;
        if (result !== undefined)
            throw new typeError('Derived constructors may only return object or undefined');
        return this;
    };
    (0, desktop_property_write_js_1.setDesktopProperty)(Wrapper, 'prototype', object.create(parent && parent.prototype, {
        constructor: { value: Wrapper, writable: true, configurable: true },
    }));
    object.defineProperty(Wrapper, 'prototype', { writable: false });
    if (parent) {
        if (object.setPrototypeOf) {
            const set = object.setPrototypeOf;
            Reflect.apply(set.bind, set, [])(Wrapper, parent);
        }
        else
            (0, desktop_property_write_js_1.setDesktopProperty)(Wrapper, '__proto__', parent);
    }
    const useReflect = nativeReflectConstruct();
    object.defineProperty(Wrapper, 'handleUrl', {
        enumerable: false, configurable: true, writable: true,
        value(input) {
            const isUrl = typeof context.URL !== 'undefined' && input instanceof context.URL;
            const base = context.location.href;
            const url = isUrl ? input : new context.URL(input, base);
            if (!Reflect.apply(callbacks.matchesSigning, null, [url.pathname]))
                return input;
            if (Reflect.apply(callbacks.matchesBehavior, null, [url.pathname]))
                Reflect.apply(callbacks.reportBehavior, null, []);
            if (tokens.token && !url.searchParams.has('msToken'))
                url.searchParams.append('msToken', tokens.token);
            const signature = Reflect.apply(callbacks.sign, null, [url.search.slice(1), {}]);
            url.searchParams.append('a_bogus', signature);
            return url;
        },
    });
    object.defineProperty(Wrapper, 'prototype', { writable: false });
    (0, desktop_property_write_js_1.setDesktopProperty)(context.window, 'EventSource', Wrapper);
    function nativeReflectConstruct() {
        if (typeof context.Reflect === 'undefined' || !context.Reflect.construct)
            return false;
        if (context.Reflect.construct.sham)
            return false;
        if (typeof context.Proxy === 'function')
            return true;
        try {
            context.Boolean.prototype.valueOf.call(context.Reflect.construct(context.Boolean, [], function () { }));
            return true;
        }
        catch {
            return false;
        }
    }
}

},"desktop-startup":function(exports,require){"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDesktopReferer = initializeDesktopReferer;
exports.initializeDesktopVersion = initializeDesktopVersion;
const desktop_property_write_js_1 = require("./desktop-property-write.js");
const refererKey = '__ac_referer';
function cookieReferer(cookie) {
    if (typeof cookie !== 'string')
        return;
    const prefix = refererKey + '=';
    const parts = cookie.split(/[;&]/);
    for (let i = 0; i < parts.length; i++) {
        let part = parts[i];
        while (part.charAt(0) === ' ')
            part = part.substring(1, part.length);
        if (part.indexOf(prefix) === 0)
            return part.substring(prefix.length, part.length);
    }
    return null;
}
function initializeDesktopReferer(context) {
    let value = '';
    try {
        value = (context.window.sessionStorage && context.window.sessionStorage.getItem(refererKey)) ||
            (context.window.localStorage && context.window.localStorage.getItem(refererKey)) ||
            cookieReferer(context.document.cookie) || '';
    }
    catch {
        value = '';
    }
    try {
        if (context.window.sessionStorage)
            context.window.sessionStorage.removeItem(refererKey);
        if (context.window.localStorage)
            context.window.localStorage.removeItem(refererKey);
        (0, desktop_property_write_js_1.setDesktopProperty)(context.document, 'cookie', refererKey + '=; expires=Mon, 20 Sep 2010 00:00:00 UTC; path=/;');
    }
    catch { }
    if (value === '__ac_blank')
        value = '';
    else if (value === '')
        value = context.document.referrer;
    if (value)
        (0, desktop_property_write_js_1.setDesktopProperty)(context.window, refererKey, value);
}
function initializeDesktopVersion(context) {
    if (!context.window._sdkGlueVersionMap) {
        (0, desktop_property_write_js_1.setDesktopProperty)(context.window, '_sdkGlueVersionMap', { bdmsVersion: '1.0.1.7' });
    }
    else {
        (0, desktop_property_write_js_1.setDesktopProperty)(context.window._sdkGlueVersionMap, 'bdmsVersion', '1.0.1.7');
    }
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
load("browser-entry");
})();
