import { type DesktopBatteryContext } from './desktop-battery.js';
import { type DesktopDocumentContext } from './desktop-device-properties.js';
import { type DesktopDeviceIdentityContext } from './desktop-device-identity.js';
import { type DesktopNavigatorContext } from './desktop-navigator.js';
import { type DesktopPluginsContext } from './desktop-plugins.js';
import { type DesktopScreenContext } from './desktop-fingerprint.js';
import { type DesktopWebGlContext } from './desktop-webgl.js';
import { type DesktopWindowContext } from './desktop-window.js';
import type { DesktopEnvironmentState } from './desktop-environment-mask.js';
import type { DesktopBehaviorState } from './desktop-behavior.js';
import type { DesktopReportSender } from './desktop-report.js';
export type DesktopDeviceReportContext = DesktopBatteryContext & DesktopDocumentContext & DesktopDeviceIdentityContext & DesktopNavigatorContext & DesktopPluginsContext & DesktopScreenContext & DesktopWebGlContext & DesktopWindowContext;
export declare class DesktopDeviceReporter {
    private readonly context;
    private readonly config;
    private readonly environment;
    private readonly behavior;
    private readonly sender;
    private readonly document;
    private readonly navigator;
    private readonly window;
    private readonly identity;
    constructor(context: DesktopDeviceReportContext, config: {
        readonly aid: number;
        readonly pageId: number;
    }, environment: Pick<DesktopEnvironmentState, 'mask'>, behavior: Pick<DesktopBehaviorState, 'mask'>, sender: Pick<DesktopReportSender, 'send'>);
    readonly report: () => Promise<void>;
}
//# sourceMappingURL=desktop-device-report.d.ts.map