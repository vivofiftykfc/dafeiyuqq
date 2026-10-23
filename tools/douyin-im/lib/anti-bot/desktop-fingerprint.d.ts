export interface DesktopFingerprintContext {
    readonly window: {
        readonly innerWidth?: number;
        readonly innerHeight?: number;
        readonly outerWidth?: number;
        readonly outerHeight?: number;
        readonly screenX?: number;
        readonly screenY?: number;
        readonly pageYOffset?: number;
        readonly screen: {
            readonly availWidth?: number;
            readonly availHeight?: number;
            readonly width?: number;
            readonly height?: number;
            readonly colorDepth?: number;
            readonly pixelDepth?: number;
            readonly orientation?: {
                readonly type?: string;
                readonly angle?: number;
            } | null;
        };
    };
    readonly document: {
        readonly body?: {
            readonly clientWidth?: number | undefined;
            readonly clientHeight?: number | undefined;
        } | null | undefined;
    };
    readonly navigator: {
        readonly platform?: string;
    };
}
export type DesktopScreenContext = Pick<DesktopFingerprintContext, 'window' | 'document'>;
export declare function collectDesktopScreenGeometry(context: DesktopScreenContext): {
    innerWidth: number;
    innerHeight: number;
    outerWidth: number;
    outerHeight: number;
    screenX: number;
    screenY: number;
    pageXOffset: number;
    pageYOffset: number;
    availWidth: number;
    availHeight: number;
    sizeWidth: number;
    sizeHeight: number;
    clientWidth: number;
    clientHeight: number;
    colorDepth: number;
    pixelDepth: number;
};
export declare function collectDesktopReportScreen(context: DesktopScreenContext): {
    orientaionType: string;
    orientaionAngle: number;
    innerWidth: number;
    innerHeight: number;
    outerWidth: number;
    outerHeight: number;
    screenX: number;
    screenY: number;
    pageXOffset: number;
    pageYOffset: number;
    availWidth: number;
    availHeight: number;
    sizeWidth: number;
    sizeHeight: number;
    clientWidth: number;
    clientHeight: number;
    colorDepth: number;
    pixelDepth: number;
};
export declare function buildDesktopFingerprint(context: DesktopFingerprintContext): string;
//# sourceMappingURL=desktop-fingerprint.d.ts.map