import { type DesktopReportSender } from './desktop-report.js';
export interface DesktopReportLifecycleContext {
    readonly performance: {
        now(): number;
    };
    readonly Date: {
        now(): number;
    };
    readonly document: {
        addEventListener(type: string, listener: () => void): void;
    };
    setTimeout(callback: () => void, delay: number): unknown;
    setInterval(callback: () => void, delay: number): unknown;
    requestAnimationFrame(callback: (time: number) => void): unknown;
}
export interface DesktopReportScheduleConfig {
    readonly dump: boolean;
    readonly ddrt: number;
    readonly track: {
        readonly mode: number;
        readonly delay: number;
    };
}
export interface DesktopBehaviorReportSources {
    readonly move: {
        data(): unknown;
    };
    readonly click: {
        data(): unknown;
    };
    readonly clickEnd: {
        data(): unknown;
    };
    readonly keyboard: {
        data(): unknown;
    };
    readonly windowState: {
        data(): unknown;
    };
    readonly gyro: {
        data(): unknown;
    };
    readonly focus: {
        data(): unknown;
    };
    screen(): unknown;
}
export declare class DesktopReportLifecycle {
    private readonly context;
    private readonly config;
    private readonly sources;
    private readonly sender;
    private readonly deviceReport;
    private readonly startCollection;
    private deviceStarted;
    private behaviorStarted;
    private visibilityStarted;
    private behaviorReported;
    private lastBehaviorTime;
    constructor(context: DesktopReportLifecycleContext, config: DesktopReportScheduleConfig, sources: DesktopBehaviorReportSources, sender: Pick<DesktopReportSender, 'send'>, deviceReport: () => void, startCollection: () => void);
    start(): void;
    readonly reportBehavior: () => void;
    private readonly onVisibilityChange;
    private startDevice;
    private collectBehavior;
}
//# sourceMappingURL=desktop-report-lifecycle.d.ts.map