export interface DesktopDTraitAudioAnalyser {
    readonly frequencyBinCount: number;
    readonly fftSize: number;
    getFloatFrequencyData(target: Float32Array): void;
    getFloatTimeDomainData(target: Float32Array): void;
}
export interface DesktopDTraitOfflineAudio {
    readonly destination: unknown;
    createAnalyser(): DesktopDTraitAudioAnalyser;
    createOscillator(): {
        type: string;
        readonly frequency: {
            value: number;
        };
        connect(target: unknown): unknown;
        start(time: number): void;
    };
    createDynamicsCompressor(): {
        readonly threshold: {
            value: number;
        };
        readonly knee: {
            value: number;
        };
        readonly attack: {
            value: number;
        };
        connect(target: unknown): unknown;
    };
    startRendering(): unknown;
    oncomplete: ((event: {
        renderedBuffer: {
            getChannelData(channel: number): Float32Array;
        };
    }) => void) | null;
}
export interface DesktopDTraitAudioContext {
    readonly OfflineAudioContext?: (new (channels: number, length: number, sampleRate: number) => DesktopDTraitOfflineAudio) | undefined;
    readonly Date: {
        now(): number;
    };
    readonly Math: Pick<Math, 'abs'>;
    hash(value: unknown): number;
    onDiagnostic(code: 'audio'): void;
}
export declare function createDesktopDTraitAudioCollector(context: DesktopDTraitAudioContext): () => Promise<Record<"str_8" | "str_9" | "str_20" | "str_25", number>>;
//# sourceMappingURL=desktop-dtrait-audio.d.ts.map