import { setDesktopProperty } from './desktop-property-write.js';
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
export function initializeDesktopReferer(context) {
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
        setDesktopProperty(context.document, 'cookie', refererKey + '=; expires=Mon, 20 Sep 2010 00:00:00 UTC; path=/;');
    }
    catch { }
    if (value === '__ac_blank')
        value = '';
    else if (value === '')
        value = context.document.referrer;
    if (value)
        setDesktopProperty(context.window, refererKey, value);
}
export function initializeDesktopVersion(context) {
    if (!context.window._sdkGlueVersionMap) {
        setDesktopProperty(context.window, '_sdkGlueVersionMap', { bdmsVersion: '1.0.1.7' });
    }
    else {
        setDesktopProperty(context.window._sdkGlueVersionMap, 'bdmsVersion', '1.0.1.7');
    }
}
//# sourceMappingURL=desktop-startup.js.map