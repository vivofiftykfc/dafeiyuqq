export interface DesktopDTraitEnvironmentNavigator {
    connection?: {
        downlink?: unknown;
        effectiveType?: unknown;
    } | null;
    language?: unknown;
    languages?: {
        join(separator: string): string;
    } | null;
    vendor?: unknown;
    userAgent?: unknown;
    deviceMemory?: unknown;
    hardwareConcurrency?: unknown;
    maxTouchPoints?: unknown;
    msMaxTouchPoints?: unknown;
    plugins?: unknown;
    mimeTypes?: unknown;
}
export interface DesktopDTraitEnvironmentContext {
    readonly navigator: DesktopDTraitEnvironmentNavigator;
    readonly window: {
        Intl?: {
            DateTimeFormat(): {
                resolvedOptions(): {
                    locale?: unknown;
                    timeZone?: unknown;
                } | null;
            } | null;
        } | null;
        Notification?: {
            permission?: unknown;
        } | null;
        devicePixelRatio?: unknown;
    };
    readonly screen: {
        availHeight?: unknown;
        availLeft?: unknown;
        availTop?: unknown;
        availWidth?: unknown;
        height?: unknown;
        width?: unknown;
        colorDepth?: unknown;
        pixelDepth?: unknown;
    };
    parseInt(value: string, radix: number): number;
    hash(value: unknown): number;
    onDiagnostic(code: 'str'): void;
}
export type DesktopDTraitEnvironmentFeature = 'str_14' | 'str_15' | 'str_16' | 'str_18' | 'str_19' | 'str_29' | 'str_27' | 'str_28' | 'str_30' | 'str_31' | 'str_32';
export declare function createDesktopDTraitEnvironmentCollector(context: DesktopDTraitEnvironmentContext): () => Record<DesktopDTraitEnvironmentFeature, number>;
//# sourceMappingURL=desktop-dtrait-environment.d.ts.map