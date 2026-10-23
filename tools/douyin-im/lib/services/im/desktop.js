import os from 'node:os';
export const DESKTOP_IM_PROFILE = Object.freeze({
    appId: 339757,
    appName: 'aweme_im_desktop',
    version: '1.2.1',
    buildNumber: 'eb11b84dd0eb26ae22321b53426d3f976b920862',
    apiUrl: 'https://imapi3-normal.zijieapi.com',
    frontierUrl: 'wss://frontier100-normal.zijieapi.com/ws/v2',
    appKey: 'e0f82475ab9dbf5717d18b4a9c0d7fd0',
    fpId: 89,
    access: 'cpp_sdk',
    biz: 'douyin_im_pc',
    inboxType: 1,
    service: 1,
    method: 1,
});
export const DESKTOP_PC_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) douyinim/1.2.1 Chrome/130.0.6723.58 Electron/33.2.0 Safari/537.36';
export function desktopCookieProtoOptions(deviceId) {
    return {
        deviceId,
        sdkVersion: DESKTOP_IM_PROFILE.version,
        buildNumber: DESKTOP_IM_PROFILE.buildNumber,
        versionCode: DESKTOP_IM_PROFILE.version,
        devicePlatform: process.platform === 'win32' ? 'windows' : 'mac',
        biz: DESKTOP_IM_PROFILE.biz,
        access: DESKTOP_IM_PROFILE.access,
        headers: {},
        query: desktopImQuery(deviceId),
        httpUserAgent: DESKTOP_PC_UA,
    };
}
export function desktopImQuery(deviceId) {
    const platform = process.platform === 'win32' ? 'windows' : 'mac';
    return {
        aid: String(DESKTOP_IM_PROFILE.appId),
        app_name: DESKTOP_IM_PROFILE.appName,
        did: deviceId,
        device_id: deviceId,
        iid: '0',
        channel: process.platform === 'darwin' ? '20002' : '0',
        os_version: os.release(),
        version_code: DESKTOP_IM_PROFILE.version,
        version_name: DESKTOP_IM_PROFILE.version,
        device_platform: platform,
        device_type: process.arch,
        device_brand: '',
    };
}
export function desktopFingerprintParams(deviceId, guid, screen, userAgent) {
    return new URLSearchParams({
        aid: String(DESKTOP_IM_PROFILE.appId),
        version_name: DESKTOP_IM_PROFILE.version,
        version_code: DESKTOP_IM_PROFILE.version,
        device_platform: process.platform,
        os_version: os.release(),
        screen_width: String(screen.width),
        screen_height: String(screen.height),
        browser_language: 'zh-CN',
        browser_platform: process.platform === 'win32' ? 'Win32' : 'MacIntel',
        browser_name: 'Mozilla',
        browser_version: userAgent.replace(/^Mozilla\//, ''),
        browser_online: 'true',
        cookie_enabled: 'true',
        device_id: deviceId,
        did: deviceId,
        iid: '0',
        awemeim_guid: guid,
        channel: process.platform === 'darwin' ? '20002' : '0',
    });
}
//# sourceMappingURL=desktop.js.map