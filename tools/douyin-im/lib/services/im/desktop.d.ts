export declare const DESKTOP_IM_PROFILE: Readonly<{
    readonly appId: 339757;
    readonly appName: "aweme_im_desktop";
    readonly version: "1.2.1";
    readonly buildNumber: "eb11b84dd0eb26ae22321b53426d3f976b920862";
    readonly apiUrl: "https://imapi3-normal.zijieapi.com";
    readonly frontierUrl: "wss://frontier100-normal.zijieapi.com/ws/v2";
    readonly appKey: "e0f82475ab9dbf5717d18b4a9c0d7fd0";
    readonly fpId: 89;
    readonly access: "cpp_sdk";
    readonly biz: "douyin_im_pc";
    readonly inboxType: 1;
    readonly service: 1;
    readonly method: 1;
}>;
export declare const DESKTOP_PC_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) douyinim/1.2.1 Chrome/130.0.6723.58 Electron/33.2.0 Safari/537.36";
export declare function desktopCookieProtoOptions(deviceId: string): {
    deviceId: string;
    sdkVersion: "1.2.1";
    buildNumber: "eb11b84dd0eb26ae22321b53426d3f976b920862";
    versionCode: "1.2.1";
    devicePlatform: string;
    biz: "douyin_im_pc";
    access: "cpp_sdk";
    headers: {};
    query: Record<string, string>;
    httpUserAgent: string;
};
export declare function desktopImQuery(deviceId: string): Record<string, string>;
export interface DesktopScreenSize {
    width: number;
    height: number;
}
export declare function desktopFingerprintParams(deviceId: string, guid: string, screen: DesktopScreenSize, userAgent: string): URLSearchParams;
//# sourceMappingURL=desktop.d.ts.map