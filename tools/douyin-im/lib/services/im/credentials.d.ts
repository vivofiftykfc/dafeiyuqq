export declare const IM_WS_CONFIG: Readonly<{
    frontierUrl: "wss://frontier100-normal.zijieapi.com/ws/v2";
    appId: 339757;
    fpId: 89;
    appKey: "e0f82475ab9dbf5717d18b4a9c0d7fd0";
    service: 1;
    method: 1;
    wsProtocols: string[];
}>;
export declare function computeAccessKey(fpId: number, appKey: string, deviceId: string): string;
export declare function buildFrontierWsUrl(options: {
    deviceId: string;
    installId?: string;
}): string;
//# sourceMappingURL=credentials.d.ts.map