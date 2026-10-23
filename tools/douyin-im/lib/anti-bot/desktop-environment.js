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
export function classifyDesktopBrowser(input) {
    return classify(input, browserRules);
}
export function classifyDesktopOS(input) {
    return classify(input, osRules);
}
export function classifyDesktopPlatform(input) {
    return classify(input, platformRules);
}
export class DesktopStorageState {
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
//# sourceMappingURL=desktop-environment.js.map