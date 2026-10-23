import type { DesktopPropertyClassifier } from './desktop-device-properties.js';
type ClassifiedField = 'ActiveXObject' | 'BluetoothUUID' | 'external' | 'Image' | 'indexDB' | 'isSecureContext' | 'localStorage' | 'locationbar' | 'mozRTCPeerConnection' | 'netscape' | 'postMessage' | 'sessionStorage' | 'toolbar' | 'webkitRequestAnimationFrame';
export interface DesktopWindowContext {
    readonly window: Partial<Record<ClassifiedField, unknown>> & {
        readonly devicePixelRatio?: unknown;
        readonly location?: {
            readonly href?: unknown;
        } | null;
    };
    readonly Math: {
        floor(value: number): number;
    };
}
export declare class DesktopWindowCollector {
    private readonly context;
    private readonly properties;
    private readonly math;
    constructor(context: DesktopWindowContext, properties: DesktopPropertyClassifier);
    collect(): {
        ActiveXObject: number;
        BluetoothUUID: number;
        devicePixelRatio: number;
        external: number;
        Image: number;
        indexDB: number;
        isSecureContext: number;
        localStorage: number;
        location: {};
        locationbar: number;
        mozRTCPeerConnection: number;
        netscape: number;
        postMessage: number;
        sessionStorage: number;
        toolbar: number;
        webkitRequestAnimationFrame: number;
    };
}
export {};
//# sourceMappingURL=desktop-window.d.ts.map