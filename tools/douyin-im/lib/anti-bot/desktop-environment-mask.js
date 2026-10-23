import { classifyDesktopBrowser, classifyDesktopOS, classifyDesktopPlatform, DesktopStorageState } from './desktop-environment.js';
export class DesktopEnvironmentState {
    context;
    storage;
    symbol;
    processType;
    constructor(context) {
        this.context = context;
        this.symbol = context.Symbol;
        this.storage = new DesktopStorageState(context);
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
        if (classifyDesktopBrowser(this.context.navigator.userAgent) !== 'Firefox')
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
        const os = classifyDesktopOS(this.context.navigator.userAgent);
        const platform = classifyDesktopPlatform(this.context.navigator.platform);
        const windows = platform === 'Windows' && os !== 'Windows';
        const linux = platform === 'Linux' && os !== 'Linux' && os !== 'HarmonyOS' && os !== 'Android';
        const android = platform === 'Android' && os !== 'Android';
        const apple = platform === 'Apple' && os !== 'MacOS' && os !== 'iOS';
        const other = platform === 'Other' && os !== 'Other';
        return windows || linux || android || apple || other;
    }
}
//# sourceMappingURL=desktop-environment-mask.js.map