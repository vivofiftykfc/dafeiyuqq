import { DESKTOP_APP_VERSION } from '../../desktop/constants.js';
import { messageClientId } from './message-cache.js';
import { readJsonInteger } from '../../http/lossless-json.js';
function compareVersions(left, right) {
    const a = left.split('.');
    const b = right.split('.');
    const segment = (part = '') => [...Buffer.from(part)].reduce((value, byte) => (Math.imul(value, 10) + byte - 48) | 0, 0);
    for (let index = 0; index < Math.max(a.length, b.length); index++) {
        const x = segment(a[index]);
        const y = segment(b[index]);
        if (x !== y)
            return x > y ? 1 : -1;
    }
    return 0;
}
export function isDesktopMessageDisplayable(message, appVersion = DESKTOP_APP_VERSION) {
    return !!message.content && isDesktopMessageVisible(message, appVersion);
}
export function isDesktopMessageVisible(message, appVersion = DESKTOP_APP_VERSION) {
    if (!messageClientId(message) || message.status === 1)
        return false;
    if (message.msgType < 0 || message.msgType >= 2000)
        return false;
    if (message.msgType !== 1 && message.msgType !== 1002)
        return true;
    let content;
    try {
        const parsed = JSON.parse(message.content);
        content = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    }
    catch {
        content = {};
    }
    if (message.msgType === 1002) {
        return !Object.hasOwn(content, 'aweType') || readJsonInteger(message.content, 'aweType', 32) !== 100200n;
    }
    const min = typeof content['pc_filter_min_version'] === 'string' ? content['pc_filter_min_version'] : '';
    const max = typeof content['pc_filter_max_version'] === 'string' ? content['pc_filter_max_version'] : '';
    if (min)
        return compareVersions(appVersion, min) < 0;
    if (max)
        return compareVersions(appVersion, max) > 0;
    return true;
}
//# sourceMappingURL=message-display.js.map