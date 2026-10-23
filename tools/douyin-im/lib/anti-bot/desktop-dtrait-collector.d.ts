import type { DesktopDTraitFeatureValues } from './desktop-dtrait-request-core.js';
export interface DesktopDTraitCollectionContext {
    readonly Date: {
        now(): number;
    };
    setTimeout(callback: () => void, delay: number): unknown;
}
export interface DesktopDTraitCollectionOptions {
    cache: Record<string, unknown>;
    debug: boolean;
}
export type DesktopDTraitCollectionTask = (options: DesktopDTraitCollectionOptions) => unknown;
export type DesktopDTraitCollectionResult = {
    value: unknown;
    duration: number;
} | {
    error: unknown;
    duration: number;
};
export declare function prepareDesktopDTraitCollection(context: DesktopDTraitCollectionContext, tasks: Record<string, DesktopDTraitCollectionTask>, options: DesktopDTraitCollectionOptions, budget?: number): () => Promise<Record<string, DesktopDTraitCollectionResult>>;
export interface DesktopDTraitCollectionPlugins {
    boolFeature: DesktopDTraitCollectionTask;
    strFeature: DesktopDTraitCollectionTask;
    canvas: DesktopDTraitCollectionTask;
    audio: DesktopDTraitCollectionTask;
    css: DesktopDTraitCollectionTask;
    domRect: DesktopDTraitCollectionTask;
    mediaTypes: DesktopDTraitCollectionTask;
    speech: DesktopDTraitCollectionTask;
    svgRect: DesktopDTraitCollectionTask;
    math: DesktopDTraitCollectionTask;
    webGL: DesktopDTraitCollectionTask;
    fonts: DesktopDTraitCollectionTask;
}
export declare class DesktopDTraitCollector {
    private readonly context;
    private readonly bool;
    private readonly str;
    constructor(context: DesktopDTraitCollectionContext, plugins: DesktopDTraitCollectionPlugins);
    private collectGroup;
    private collectOnce;
    collect(): Promise<DesktopDTraitFeatureValues>;
}
//# sourceMappingURL=desktop-dtrait-collector.d.ts.map