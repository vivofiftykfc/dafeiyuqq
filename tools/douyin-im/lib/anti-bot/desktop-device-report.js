import { setDesktopProperty } from './desktop-property-write.js';
import { collectDesktopBattery } from './desktop-battery.js';
import { DesktopDocumentCollector } from './desktop-device-properties.js';
import { DesktopDeviceIdentityCollector } from './desktop-device-identity.js';
import { DesktopNavigatorCollector } from './desktop-navigator.js';
import { collectDesktopPlugins } from './desktop-plugins.js';
import { collectDesktopReportScreen } from './desktop-fingerprint.js';
import { collectDesktopWebGl } from './desktop-webgl.js';
import { DesktopWindowCollector } from './desktop-window.js';
export class DesktopDeviceReporter {
    context;
    config;
    environment;
    behavior;
    sender;
    document;
    navigator;
    window;
    identity;
    constructor(context, config, environment, behavior, sender) {
        this.context = context;
        this.config = config;
        this.environment = environment;
        this.behavior = behavior;
        this.sender = sender;
        this.document = new DesktopDocumentCollector(context);
        this.identity = new DesktopDeviceIdentityCollector(context);
        this.navigator = new DesktopNavigatorCollector(context, this.document);
        this.window = new DesktopWindowCollector(context, this.document);
    }
    report = async () => {
        const battery = await collectDesktopBattery(this.context);
        const document = this.document.collect();
        const navigator = this.navigator.collect();
        const plugins = collectDesktopPlugins(this.context);
        const screen = collectDesktopReportScreen(this.context);
        const webgl = collectDesktopWebGl(this.context);
        const window = this.window.collect();
        const wID = await this.identity.collect();
        const envCode = this.environment.mask();
        const ubCode = this.behavior.mask();
        const report = { battery, document, navigator, plugins, screen, webgl, window, wID, envCode, ubCode };
        setDesktopProperty(report.wID, 'aid', this.config.aid);
        setDesktopProperty(report.wID, 'pageId', this.config.pageId);
        this.sender.send(report);
    };
}
//# sourceMappingURL=desktop-device-report.js.map