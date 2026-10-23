export type DesktopApplicationSettings = Record<string, unknown>;
export interface MessageFloatHintConfig {
    enable: boolean;
    notHintMessages: Readonly<Record<string, readonly number[]>>;
    notFloatMessages?: Readonly<Record<string, readonly number[]>>;
}
export declare function desktopSettingsUrl(deviceId: string, installId: string, channel: string, platform?: string, arch?: string): string;
export declare function parseDesktopSettings(value: unknown): DesktopApplicationSettings;
export declare function desktopFloatHintConfig(settings?: DesktopApplicationSettings): MessageFloatHintConfig | undefined;
export declare function readDesktopSettings(directory: string, identity: string): DesktopApplicationSettings | undefined;
export declare class DesktopSettings {
    private readonly options;
    private readonly file;
    private value;
    private task;
    private controller;
    private timer;
    private stopped;
    constructor(options: {
        directory: string;
        identity: string;
        request(signal: AbortSignal): Promise<DesktopApplicationSettings | undefined>;
        onError(error: unknown): void;
    });
    snapshot(): DesktopApplicationSettings | undefined;
    start(): Promise<DesktopApplicationSettings | undefined>;
    restart(identity: string): Promise<DesktopApplicationSettings | undefined>;
    refresh(): Promise<DesktopApplicationSettings | undefined>;
    stop(): void;
}
//# sourceMappingURL=settings.d.ts.map