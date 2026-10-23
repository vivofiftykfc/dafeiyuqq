export interface DesktopBatteryContext {
    readonly navigator: {
        getBattery?(): unknown;
    };
    readonly Math: {
        round(value: number): number;
    };
}
export type DesktopBatteryResult = {
    charging: 1 | 2;
    chargingTime: string;
    dischargingTime: string;
    level: number;
} | Record<string, never>;
export declare function collectDesktopBattery(context: DesktopBatteryContext): Promise<DesktopBatteryResult>;
//# sourceMappingURL=desktop-battery.d.ts.map