export declare const BDMS_PRESETS: {
    readonly '1.0.1.20': {
        readonly constVal1: 22740;
        readonly constVal2: 2631;
    };
    readonly '1.0.1.16': {
        readonly constVal1: 22740;
        readonly constVal2: 2631;
    };
};
export type BdmsPreset = keyof typeof BDMS_PRESETS;
export declare const MAC_SCREEN_FINGERPRINT = "1728|1117|1728|303|1728|1117|1728|982|MacIntel";
export declare const WIN_SCREEN_FINGERPRINT = "1920|366|1918|1048|1920|1050|1920|1080|Win32";
export declare const DEFAULT_SCREEN_FINGERPRINT = "1728|1117|1728|303|1728|1117|1728|982|MacIntel";
export interface ABogusOptions {
    userAgent: string;
    query: string;
    body?: string;
    screenFingerprint?: string;
    bdmsPreset?: BdmsPreset;
    keyVal?: number;
}
export declare function generateABogus(options: ABogusOptions): string;
export interface DesktopABogusOptions {
    query: string;
    body: string;
    userAgent: string;
    aid: number;
    pageId: number;
    environmentMask: number;
    behaviorMask: number;
    flag: 3 | 11 | 12;
    fingerprint: string;
    nowMs: number;
    inkMs: number;
    random?: () => number;
}
export declare function generateDesktopABogus(options: DesktopABogusOptions): string;
export declare function encodeDesktopReportData(serializedReport: string | undefined, math?: Pick<Math, 'floor' | 'random'>): string;
export interface JumpbyteABogusOptions {
    userAgent: string;
    query: string;
    body?: string;
    nowMs?: number;
    random?: () => number;
}
export declare function generateJumpbyteABogus(options: JumpbyteABogusOptions): string;
//# sourceMappingURL=aBogus.d.ts.map