import { type DesktopTokenState } from './desktop-token.js';
export interface DesktopReportXhr {
    withCredentials: boolean;
    open(method: string, url: string, async: boolean): void;
    send(body: string): void;
    addEventListener(type: string, listener: () => void): void;
    getResponseHeader(name: string): string | null;
}
export interface DesktopReportContext {
    readonly XMLHttpRequest: {
        new (): DesktopReportXhr;
        readonly prototype: DesktopReportXhr;
    };
    readonly URL: typeof URL;
    readonly JSON: Pick<typeof JSON, 'stringify'>;
    readonly Date: {
        now(): number;
    };
    readonly Math: Pick<Math, 'floor' | 'random'>;
    readonly navigator: {
        sendBeacon(url: string, body: string): boolean;
    };
}
export interface DesktopReportConfig {
    readonly aid: number;
    readonly boe: boolean;
    readonly rpU: string;
}
export declare class DesktopReportSender {
    private readonly context;
    private readonly config;
    private readonly tokens;
    private readonly deviceReport;
    private readonly originalOpen;
    private readonly originalSend;
    private readonly originalAddListener;
    constructor(context: DesktopReportContext, config: DesktopReportConfig, tokens: Pick<DesktopTokenState, 'token' | 'onReportLoad'>, deviceReport: (time: number) => void);
    send(report: unknown, beacon?: boolean): void;
}
//# sourceMappingURL=desktop-report.d.ts.map