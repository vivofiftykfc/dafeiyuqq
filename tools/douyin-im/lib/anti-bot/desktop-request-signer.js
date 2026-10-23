import { setDesktopProperty } from './desktop-property-write.js';
import { generateDesktopABogusWithRuntime } from './aBogus.js';
import { DesktopEnvironmentState } from './desktop-environment-mask.js';
import { buildDesktopFingerprint } from './desktop-fingerprint.js';
export class DesktopRequestSigner {
    context;
    config;
    behavior;
    environment;
    constructor(context, config, behavior, environment) {
        this.context = context;
        this.config = config;
        this.behavior = behavior;
        this.environment = environment ?? new DesktopEnvironmentState(context);
    }
    sign(query, body, contentType) {
        const vendorSubs = { ink: this.context.Date.now() - 1 };
        const prototype = this.context.navigator.__proto__;
        if (prototype == null)
            throw new TypeError('BDMS navigator prototype is missing');
        setDesktopProperty(Object(prototype), 'vendorSubs', vendorSubs, prototype);
        const environmentMask = this.environment.mask();
        const mode = this.config.track.mode;
        const behaviorMask = mode !== 0 ? 0 : this.behavior.mask();
        const normalizedBody = typeof body !== 'string' || (contentType && contentType.indexOf('multipart/form-data') != -1) ? '' : body;
        let userAgent = this.context.navigator.userAgent;
        if (userAgent.indexOf('baiduboxapp') >= 0)
            userAgent = userAgent.replace(/\s(EasyBrowser)?[Ww]ebCore=0x[a-z0-9]{9}$/, '');
        if (userAgent.indexOf('AlipayClient') >= 0)
            userAgent = userAgent.replace(/\sChannelId\(\d+\)/, '');
        return generateDesktopABogusWithRuntime({ query, body: normalizedBody, userAgent, environmentMask, behaviorMask }, {
            flag: () => this.readFlag(), now: () => this.context.Date.now(),
            ink: () => this.context.navigator.vendorSubs?.ink,
            pageId: () => this.config.pageId, aid: () => this.config.aid,
            fingerprint: () => buildDesktopFingerprint(this.context),
            random: () => this.context.Math.random(),
        });
    }
    readFlag() {
        if (this.context.window.onwheelx && this.context.window.onwheelx._Ax) {
            return Object.getOwnPropertyDescriptor(this.context.window.onwheelx, '_Ax')?.writable === false ? 3 : 12;
        }
        return 11;
    }
}
//# sourceMappingURL=desktop-request-signer.js.map