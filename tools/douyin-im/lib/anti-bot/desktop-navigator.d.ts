import type { DesktopPropertyClassifier } from './desktop-device-properties.js';
type TextField = 'appCodeName' | 'appMinorVersion' | 'appName' | 'appVersion' | 'buildID' | 'cpuClass' | 'deviceMemory' | 'doNotTrack' | 'language' | 'languages' | 'msDoNotTrack' | 'oscpu' | 'platform' | 'product' | 'productSub' | 'systemLanguage' | 'userLanguage' | 'vendor' | 'vendorSub' | 'webdriver';
type ClassifiedField = 'bluetooth' | 'cookieEnabled' | 'credentials' | 'requestMediaKeySystemAccess' | 'storage' | 'vibrate';
type FloorField = 'hardwareConcurrency' | 'maxTouchPoints';
export interface DesktopNavigatorContext {
    readonly navigator: Partial<Record<TextField | ClassifiedField | FloorField, unknown>>;
    readonly document: {
        createEvent?(name: string): unknown;
    };
    readonly window: object;
    readonly Math: {
        floor(value: number): number;
    };
}
export declare class DesktopNavigatorCollector {
    private readonly context;
    private readonly properties;
    private readonly math;
    constructor(context: DesktopNavigatorContext, properties: DesktopPropertyClassifier);
    private readonly touchstart;
    collect(): unknown;
}
export {};
//# sourceMappingURL=desktop-navigator.d.ts.map