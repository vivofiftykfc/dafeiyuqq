export interface DesktopIdentityImage {
    onload: (() => void) | null;
    onerror: (() => void) | null;
    src: string;
}
interface StorageProbe {
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}
export interface DesktopDeviceIdentityContext {
    readonly window: {
        readonly opr?: unknown;
        readonly InstallTrigger?: unknown;
        readonly chrome?: {
            readonly edgeNurturingPrivate?: unknown;
        } | null;
        readonly ApplePaySession?: unknown;
        readonly eval: {
            toString(): {
                readonly length: unknown;
            };
        };
    };
    readonly document: {
        readonly documentMode?: unknown;
        readonly fonts?: {
            check(font: string): unknown;
        } | null;
        createElement(name: 'canvas'): {
            getContext(name: '2d'): {
                drawImage(image: DesktopIdentityImage, x: number, y: number): void;
                getImageData(x: number, y: number, width: number, height: number): {
                    readonly data: ArrayLike<unknown>;
                };
            } | null;
        };
    };
    readonly Image: new () => DesktopIdentityImage;
    readonly localStorage: StorageProbe;
    readonly sessionStorage: StorageProbe;
    readonly navigator: {
        readonly permissions?: {
            query(descriptor: {
                name: string;
            }): Promise<{
                readonly state?: unknown;
            }>;
        } | null;
    };
    readonly Date: {
        new (): {
            getTimezoneOffset(): number;
        };
        now(): number;
    };
    readonly Math: {
        floor(value: number): number;
    };
}
export declare class DesktopDeviceIdentityCollector {
    private readonly context;
    private readonly date;
    private readonly math;
    constructor(context: DesktopDeviceIdentityContext);
    collect(): Promise<{
        browserType: number;
        jsFontsList: string;
        jsv: string;
        load: number;
        magic: number;
        msgType: number;
        nap: string;
        nativeLength: unknown;
        privacyMode: number;
        timestamp: string;
        timezone: number;
    }>;
    private browserType;
    private fonts;
    private imageLoad;
    private storage;
    private permissions;
}
export {};
//# sourceMappingURL=desktop-device-identity.d.ts.map