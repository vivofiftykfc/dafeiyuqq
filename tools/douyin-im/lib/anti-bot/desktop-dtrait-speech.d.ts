export interface DesktopDTraitVoice {
    voiceURI?: unknown;
    name?: unknown;
    lang?: unknown;
    localService?: unknown;
    default?: unknown;
}
export interface DesktopDTraitSpeechContext {
    readonly window: object;
    readonly speechSynthesis?: {
        getVoices(): DesktopDTraitVoice[] | null | undefined;
        addEventListener?(type: string, listener: () => void): unknown;
        onvoiceschanged?: unknown;
    } | undefined;
    setTimeout(callback: () => void, delay: number): unknown;
    clearTimeout(handle: unknown): void;
    hash(value: unknown): number;
    onDiagnostic(code: 'speech', reason: '!supported' | 'timeout' | 'error'): void;
}
export declare function createDesktopDTraitSpeechCollector(context: DesktopDTraitSpeechContext): () => Promise<{
    str_23: number;
    str_22: number;
}>;
//# sourceMappingURL=desktop-dtrait-speech.d.ts.map