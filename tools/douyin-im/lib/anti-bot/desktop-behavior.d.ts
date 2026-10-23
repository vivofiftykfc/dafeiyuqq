import { type DesktopBehaviorReportSources } from './desktop-report-lifecycle.js';
export interface DesktopBehaviorPoint {
    readonly x: number;
    readonly y: number;
    readonly ts: number;
}
export interface DesktopOrientationPoint extends DesktopBehaviorPoint {
    readonly z: number;
}
export interface DesktopVisibilityPoint {
    readonly v: 1 | 2;
    readonly ts: number;
}
export interface DesktopHoverPoint {
    readonly target: string;
    readonly mode: 0 | 1;
    readonly ts: number;
}
export interface DesktopBehaviorSnapshot {
    readonly moves: readonly DesktopBehaviorPoint[];
    readonly clickStarts: readonly DesktopBehaviorPoint[];
    readonly keydowns: readonly {
        readonly ts: number;
    }[];
    readonly clickEnds: readonly DesktopBehaviorPoint[];
    readonly windowStates: readonly DesktopVisibilityPoint[];
    readonly orientations: readonly DesktopOrientationPoint[];
    readonly focus: readonly DesktopHoverPoint[];
}
export declare class DesktopBehaviorState {
    private readonly startPerformanceTime;
    private readonly moves;
    private readonly clickStarts;
    private readonly keydowns;
    private readonly clickEnds;
    private readonly windowStates;
    private readonly orientations;
    private readonly focus;
    private frameCount;
    private interval;
    constructor(startPerformanceTime: number);
    get sampleIntervalMs(): number;
    recordFrame(performanceTime: number | (() => number)): void;
    protected get frameSamplingComplete(): boolean;
    recordMove(point: DesktopBehaviorPoint | undefined): void;
    recordClickStart(point: DesktopBehaviorPoint | undefined): void;
    recordClickEnd(point: DesktopBehaviorPoint | undefined): void;
    recordVisibility(visibilityState: string, ts: number): void;
    protected recordVisibilitySample(readVisibility: () => string, now: () => number): void;
    recordHover(point: DesktopHoverPoint | undefined): void;
    recordOrientation(point: DesktopOrientationPoint, random: () => number): void;
    protected recordOrientationSample(x: number | null | undefined, y: number | null | undefined, z: number | null | undefined, now: () => number, random: () => number): void;
    recordKeydown(ts: number): void;
    protected recordKeySample(now: () => number): void;
    mask(trackMode?: number): number;
    getSnapshot(): DesktopBehaviorSnapshot;
    createReportSources(screen: () => unknown): DesktopBehaviorReportSources;
    private recordPoint;
    private push;
}
//# sourceMappingURL=desktop-behavior.d.ts.map