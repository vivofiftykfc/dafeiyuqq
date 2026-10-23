import { type DesktopConfigContext, type DesktopBdmsInitOptions } from './desktop-config.js';
import { type DesktopBehaviorInputContext } from './desktop-behavior-collector.js';
import { type DesktopSigningContext } from './desktop-request-signer.js';
import { type DesktopDeviceReportContext } from './desktop-device-report.js';
import { type DesktopTokenContext } from './desktop-token.js';
import { type DesktopReportContext } from './desktop-report.js';
import { type DesktopReportLifecycleContext } from './desktop-report-lifecycle.js';
import { type DesktopXhrHookContext } from './desktop-xhr-hook.js';
import { type DesktopFetchHookContext } from './desktop-fetch-hook.js';
import { type DesktopEventSourceHookContext } from './desktop-eventsource-hook.js';
import { type DesktopStartupContext } from './desktop-startup.js';
export type DesktopBdmsRuntimeContext = DesktopConfigContext & DesktopBehaviorInputContext & DesktopSigningContext & DesktopDeviceReportContext & DesktopTokenContext & DesktopReportContext & DesktopReportLifecycleContext & DesktopXhrHookContext & DesktopFetchHookContext & DesktopEventSourceHookContext & DesktopStartupContext;
export declare class DesktopBdmsRuntime {
    private readonly context;
    private readonly configuration;
    private readonly device;
    private readonly lifecycle;
    constructor(context: DesktopBdmsRuntimeContext);
    readonly init: (options: DesktopBdmsInitOptions) => void;
    readonly getReferer: () => unknown;
}
export declare function installDesktopBdms(context: DesktopBdmsRuntimeContext): void;
//# sourceMappingURL=desktop-runtime.d.ts.map