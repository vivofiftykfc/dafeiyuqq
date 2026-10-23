import { setDesktopProperty } from './desktop-property-write.js';
import { encodeDesktopReportData } from './aBogus.js';
export class DesktopReportSender {
    context;
    config;
    tokens;
    deviceReport;
    originalOpen;
    originalSend;
    originalAddListener;
    constructor(context, config, tokens, deviceReport) {
        this.context = context;
        this.config = config;
        this.tokens = tokens;
        this.deviceReport = deviceReport;
        this.originalOpen = context.XMLHttpRequest.prototype.open;
        this.originalSend = context.XMLHttpRequest.prototype.send;
        this.originalAddListener = context.XMLHttpRequest.prototype.addEventListener;
    }
    send(report, beacon = false) {
        const xhr = new this.context.XMLHttpRequest();
        let base = this.config.boe ? 'https://mssdk-boe.bytedance.net' : 'https://mssdk.bytedance.com';
        if (this.config.rpU)
            base = this.config.rpU;
        const url = new this.context.URL(base + '/web/common');
        url.searchParams.append('ms_appid', this.config.aid + '' || '');
        if (this.tokens.token)
            url.searchParams.append('msToken', this.tokens.token);
        const body = this.context.JSON.stringify({
            magic: 538969122, version: 1, dataType: 8,
            strData: encodeDesktopReportData(this.context.JSON.stringify(report), this.context.Math),
            tspFromClient: this.context.Date.now(), ulr: beacon ? 1 : 0,
        });
        if (beacon) {
            try {
                this.context.navigator.sendBeacon(url.href, body);
            }
            catch { }
            return;
        }
        setDesktopProperty(xhr, 'withCredentials', true);
        const listenerArgs = ['load', () => this.tokens.onReportLoad(xhr, this.deviceReport)];
        const openArgs = ['POST', url.href, true];
        const sendArgs = [body];
        try {
            this.originalAddListener.apply(xhr, listenerArgs);
            this.originalOpen.apply(xhr, openArgs);
            this.originalSend.apply(xhr, sendArgs);
        }
        catch {
            xhr.addEventListener.apply(xhr, listenerArgs);
            xhr.open.apply(xhr, openArgs);
            xhr.send.apply(xhr, sendArgs);
        }
    }
}
//# sourceMappingURL=desktop-report.js.map