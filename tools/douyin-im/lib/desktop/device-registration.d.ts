export interface DesktopHardware {
    platform: 'darwin' | 'win32';
    release: string;
    model: string;
    uuid: string;
    serial: string;
    sku: string;
    mac: string;
    resolution: string;
    timezone: string;
    timezoneName: string;
    timezoneOffset: number;
    language: string;
}
export interface RegisteredDevice {
    deviceId: string;
    installId: string;
}
export declare function readDesktopHardware(): Promise<DesktopHardware>;
export declare function buildDeviceRegistration(hardware: DesktopHardware, current?: RegisteredDevice): {
    url: string;
    body: Buffer;
};
export declare function registerDesktopDevice(hardware: DesktopHardware, current?: RegisteredDevice): Promise<RegisteredDevice>;
export declare function activateDesktopDevice(hardware: DesktopHardware, device: RegisteredDevice): Promise<void>;
//# sourceMappingURL=device-registration.d.ts.map