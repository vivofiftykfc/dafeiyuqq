import { createHash } from 'node:crypto';
import { DESKTOP_IM_PROFILE, desktopImQuery } from './desktop.js';
const FRONTIER_ACCESS_SALT = 'f8a69f1719916z';
export const IM_WS_CONFIG = Object.freeze({
    frontierUrl: DESKTOP_IM_PROFILE.frontierUrl,
    appId: DESKTOP_IM_PROFILE.appId,
    fpId: DESKTOP_IM_PROFILE.fpId,
    appKey: DESKTOP_IM_PROFILE.appKey,
    service: DESKTOP_IM_PROFILE.service,
    method: DESKTOP_IM_PROFILE.method,
    wsProtocols: ['pbbp2'],
});
export function computeAccessKey(fpId, appKey, deviceId) {
    return createHash('md5')
        .update(`${fpId}${appKey}${deviceId}${FRONTIER_ACCESS_SALT}`)
        .digest('hex');
}
export function buildFrontierWsUrl(options) {
    const { frontierUrl, appId, fpId, appKey } = IM_WS_CONFIG;
    const url = new URL(frontierUrl);
    const query = {
        device_platform: process.platform === 'win32' ? 'windows' : 'mac',
        version_code: DESKTOP_IM_PROFILE.version,
        access_key: computeAccessKey(fpId, appKey, options.deviceId),
        fpid: String(fpId),
        aid: String(appId),
        device_id: options.deviceId,
        xsack: '1',
        xaack: '1',
        xsqos: '1',
        qos_level: '2',
        qos_sdk_version: '2',
        ...desktopImQuery(options.deviceId),
        iid: options.installId ?? '0',
    };
    for (const [key, value] of Object.entries(query))
        url.searchParams.set(key, value);
    return url.toString();
}
//# sourceMappingURL=credentials.js.map