import { type DesktopStorageContext } from './desktop-environment.js';
export interface DesktopEnvironmentContext {
    readonly window?: DesktopStorageContext['window'] & {
        readonly screen?: unknown;
        readonly eval?: unknown;
        readonly innerWidth?: number;
        readonly innerHeight?: number;
        readonly outerWidth?: number;
        readonly outerHeight?: number;
        readonly Audio?: unknown;
        readonly CanvasRenderingContext2D?: unknown;
        readonly _phantom?: unknown;
        readonly callPhantom?: unknown;
        readonly __nightmare?: unknown;
        readonly cefSharp?: unknown;
        readonly CefSharp?: unknown;
        readonly eoapi?: unknown;
        readonly eoWebBrowserDispatcher?: unknown;
    };
    readonly navigator?: DesktopStorageContext['navigator'] & {
        readonly appVersion?: string;
        readonly platform?: string;
        readonly plugins?: unknown;
        readonly webdriver?: unknown;
        readonly connection?: {
            readonly rtt?: number;
        };
        readonly userAgentData?: {
            readonly brands?: {
                readonly length?: number;
            } | null;
            readonly platform?: string;
        };
    };
    readonly document?: {
        createElement(tag: string): {
            readonly toDataURL?: unknown;
        };
    };
    readonly location?: {
        readonly href?: string;
    };
    readonly history?: unknown;
    readonly PluginArray?: unknown;
    readonly MSPluginsCollection?: unknown;
    readonly webpackGlobal?: {
        readonly process?: unknown;
    };
    readonly process?: unknown;
    readonly Symbol?: unknown;
}
export declare class DesktopEnvironmentState {
    private readonly context;
    private readonly storage;
    private readonly symbol;
    private processType;
    constructor(context: DesktopEnvironmentContext);
    mask(): number;
    private isBrowser;
    private nativeMismatch;
    private pluginArrayMismatch;
    private msPluginsMismatch;
    private automationSignals;
    private legacyAutomation;
    private nodeProcess;
    private typeOfProcess;
    private firefoxWindowGap;
    private embeddedHost;
    private localAddress;
    private platformMismatch;
}
//# sourceMappingURL=desktop-environment-mask.d.ts.map