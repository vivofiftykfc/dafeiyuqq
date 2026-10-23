export interface DesktopDTraitImageProbe {
    id: string;
    src: string;
    style: {
        cssText: string;
    };
    readonly parentNode: {
        removeChild(node: DesktopDTraitImageProbe): unknown;
    } | null;
}
export interface DesktopDTraitBoolContext {
    readonly document: {
        createElement(tag: string): DesktopDTraitImageProbe;
        readonly body: {
            appendChild(node: DesktopDTraitImageProbe): unknown;
        };
        getElementById(id: string): {
            onload: (() => void) | null;
            onerror: (() => void) | null;
        } | null;
        getElementsByClassName(name: string): {
            readonly length: number;
        };
        createEvent(name: string): unknown;
    };
    readonly navigator: {
        brave?: unknown;
        cookieEnabled?: unknown;
        doNotTrack?: unknown;
        pdfViewerEnabled?: unknown;
        serviceWorker?: unknown;
        webdriver?: unknown;
    };
    readonly RTCPeerConnection?: (new () => unknown) | undefined;
    readonly Date: {
        now(): number;
    };
    setTimeout(callback: () => void, delay: number): unknown;
    clearTimeout(timer: unknown): void;
    onDiagnostic(code: 'bool'): void;
}
export type DesktopDTraitBoolFeature = `bool_${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}`;
export declare function createDesktopDTraitBoolCollector(context: DesktopDTraitBoolContext): () => Promise<Record<DesktopDTraitBoolFeature, number>>;
//# sourceMappingURL=desktop-dtrait-bool.d.ts.map