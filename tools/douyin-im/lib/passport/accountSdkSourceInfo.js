import { mixModeEncode } from './mixMode.js';
export function encodeAccountSdkSourceInfo(plain) {
    return mixModeEncode(plain);
}
export function encodeBrowserInfo(browserInfo) {
    return encodeAccountSdkSourceInfo(JSON.stringify(browserInfo));
}
//# sourceMappingURL=accountSdkSourceInfo.js.map