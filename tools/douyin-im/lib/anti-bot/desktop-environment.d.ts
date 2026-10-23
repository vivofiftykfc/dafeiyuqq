declare const browserRules: readonly [readonly ["Huawei", readonly [RegExp]], readonly ["Chrome", readonly [RegExp, RegExp, RegExp, RegExp]], readonly ["Edge", readonly [RegExp]], readonly ["Firefox", readonly [RegExp, RegExp, RegExp, RegExp]], readonly ["IE", readonly [RegExp, RegExp, RegExp]], readonly ["Opera", readonly [RegExp, RegExp, RegExp, RegExp, RegExp]], readonly ["Safari", readonly [RegExp, RegExp]]];
declare const osRules: readonly [readonly ["HarmonyOS", readonly [RegExp, RegExp]], readonly ["Android", readonly [RegExp, RegExp]], readonly ["iOS", readonly [RegExp, RegExp, RegExp, RegExp, RegExp, RegExp, RegExp]], readonly ["MacOS", readonly [RegExp, RegExp]], readonly ["Windows", readonly [RegExp, RegExp, RegExp, RegExp, RegExp]], readonly ["Linux", readonly [RegExp]]];
declare const platformRules: readonly [readonly ["Android", readonly [RegExp]], readonly ["Apple", readonly [RegExp]], readonly ["Linux", readonly [RegExp]], readonly ["Windows", readonly [RegExp]]];
export declare function classifyDesktopBrowser(input: unknown): typeof browserRules[number][0] | 'Other';
export declare function classifyDesktopOS(input: unknown): typeof osRules[number][0] | 'Other';
export declare function classifyDesktopPlatform(input: unknown): typeof platformRules[number][0] | 'Other';
export interface DesktopStorageContext {
    readonly navigator: {
        readonly userAgent?: string;
        readonly serviceWorker?: unknown;
        readonly storage?: {
            readonly estimate?: () => {
                then(callback: (result: {
                    quota?: number;
                }) => void): unknown;
            };
            readonly getDirectory?: () => {
                catch(callback: (error: {
                    message: string;
                }) => void): unknown;
            };
        };
    };
    readonly window: {
        readonly indexedDB?: {
            open(name: string): {
                addEventListener(type: 'success' | 'error', callback: () => void): void;
            };
            deleteDatabase(name: string): unknown;
        };
    };
}
export declare class DesktopStorageState {
    private readonly context;
    private value;
    constructor(context: DesktopStorageContext);
    probe(): boolean;
}
export {};
//# sourceMappingURL=desktop-environment.d.ts.map