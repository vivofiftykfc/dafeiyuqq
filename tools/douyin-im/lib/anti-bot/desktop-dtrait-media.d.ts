export interface DesktopDTraitMediaContext {
    readonly document: {
        createElement(tag: string): {
            canPlayType(type: string): unknown;
        };
    };
    readonly Audio: new () => {
        canPlayType(type: string): unknown;
    };
    readonly window: object;
    readonly MediaSource?: {
        isTypeSupported(type: string): unknown;
    } | undefined;
    readonly MediaRecorder?: {
        isTypeSupported(type: string): unknown;
    } | undefined;
    hash(value: unknown): number;
    onDiagnostic(code: 'md'): void;
}
export declare function createDesktopDTraitMediaCollector(context: DesktopDTraitMediaContext): () => Promise<{
    str_13: number | string;
}>;
//# sourceMappingURL=desktop-dtrait-media.d.ts.map