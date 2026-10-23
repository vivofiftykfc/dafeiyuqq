import { DesktopBdmsConfiguration } from './desktop-config.js';
import { DesktopBehaviorCollector } from './desktop-behavior-collector.js';
import { DesktopEnvironmentState } from './desktop-environment-mask.js';
import { DesktopRequestSigner } from './desktop-request-signer.js';
import { DesktopDeviceReporter } from './desktop-device-report.js';
import { DesktopTokenState } from './desktop-token.js';
import { DesktopReportSender } from './desktop-report.js';
import { DesktopReportLifecycle } from './desktop-report-lifecycle.js';
import { collectDesktopReportScreen } from './desktop-fingerprint.js';
import { installDesktopXhrHook } from './desktop-xhr-hook.js';
import { installDesktopFetchHook } from './desktop-fetch-hook.js';
import { installDesktopEventSourceHook } from './desktop-eventsource-hook.js';
import { initializeDesktopReferer, initializeDesktopVersion } from './desktop-startup.js';
export class DesktopBdmsRuntime {
    context;
    configuration;
    device;
    lifecycle;
    constructor(context) {
        this.context = context;
        const behavior = new DesktopBehaviorCollector(context);
        const environment = new DesktopEnvironmentState(context);
        initializeDesktopReferer(context);
        initializeDesktopVersion(context);
        this.configuration = new DesktopBdmsConfiguration(context, () => this.lifecycle.start());
        const config = this.configuration.config;
        const tokens = new DesktopTokenState(context);
        const sender = new DesktopReportSender(context, config, tokens, () => this.device.report());
        this.device = new DesktopDeviceReporter(context, config, environment, behavior, sender);
        const signer = new DesktopRequestSigner(context, config, behavior, environment);
        this.lifecycle = new DesktopReportLifecycle(context, config, behavior.createReportSources(() => collectDesktopReportScreen(context)), sender, this.device.report, behavior.startCollection);
        const callbacks = {
            matchesSigning: (path) => this.configuration.matchesSigning(path),
            matchesBehavior: (path) => this.configuration.matchesBehavior(path),
            sign: (query, body, type) => signer.sign(query, body, type),
            reportBehavior: this.lifecycle.reportBehavior,
        };
        installDesktopXhrHook(context, tokens, callbacks);
        installDesktopFetchHook(context, tokens, callbacks);
        installDesktopEventSourceHook(context, tokens, callbacks);
    }
    init = (options) => { this.configuration.init(options); };
    getReferer = () => this.context.window.__ac_referer || '';
}
export function installDesktopBdms(context) {
    if (context.window.bdms)
        return;
    const exported = {};
    if (typeof context.Symbol !== 'undefined' && context.Symbol.toStringTag) {
        context.Object.defineProperty(exported, context.Symbol.toStringTag, { value: 'Module' });
    }
    context.Object.defineProperty(exported, '__esModule', { value: true });
    context.Object.defineProperty(exported, 'getReferer', { enumerable: true, get: () => runtime.getReferer });
    context.Object.defineProperty(exported, 'init', { enumerable: true, get: () => runtime.init });
    const runtime = new DesktopBdmsRuntime(context);
    Reflect.set(context.window, 'bdms', exported);
}
//# sourceMappingURL=desktop-runtime.js.map