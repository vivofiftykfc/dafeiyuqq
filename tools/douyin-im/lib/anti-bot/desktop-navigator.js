import { setDesktopProperty } from './desktop-property-write.js';
export class DesktopNavigatorCollector {
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
            setDesktopProperty(Object(result), key, value, result);
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
//# sourceMappingURL=desktop-navigator.js.map