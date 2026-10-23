import { randomUUID } from 'node:crypto';
export class LoginVerification {
    controller;
    id = randomUUID();
    source;
    operation;
    errorCode;
    description;
    decisionConf;
    decision;
    methods;
    settled = false;
    #lifetime = new AbortController();
    openTask;
    urlTask;
    resolveUrl;
    rejectUrl;
    get signal() { return this.#lifetime.signal; }
    constructor(descriptor, controller) {
        this.controller = controller;
        this.source = descriptor.source;
        this.operation = descriptor.operation;
        this.errorCode = descriptor.errorCode;
        this.description = descriptor.description;
        this.decisionConf = descriptor.decisionConf;
        this.decision = descriptor.decision;
        this.methods =
            descriptor.methods ?? inferLoginVerificationMethods(descriptor.decision);
    }
    open(options = {}) {
        return this.start(options);
    }
    openUrl(options = {}) {
        this.start({ ...options, openBrowser: options.openBrowser ?? false });
        return this.urlTask;
    }
    start(options) {
        if (this.openTask)
            return this.openTask;
        this.assertPending();
        this.urlTask = new Promise((resolve, reject) => {
            this.resolveUrl = resolve;
            this.rejectUrl = (error) => reject(error);
        });
        void this.urlTask.catch(() => undefined);
        const task = this.controller.open(this, options, (url) => this.resolveUrl?.(url)).catch((error) => {
            const resolved = error instanceof Error ? error : new Error(String(error));
            this.rejectUrl?.(resolved);
            if (!this.settled) {
                this.cancel(resolved.message);
            }
            throw error;
        });
        void task.then(() => this.rejectUrl?.(new Error('登录验证页在启动前已结束')), () => undefined);
        this.openTask = task;
        return task;
    }
    async complete(result = {}) {
        this.assertPending();
        this.settled = true;
        try {
            await this.controller.complete(result);
            this.#lifetime.abort(null);
        }
        catch (error) {
            this.#lifetime.abort(error);
            throw error;
        }
    }
    cancel(reason) {
        if (this.settled)
            return;
        this.settled = true;
        this.#lifetime.abort(new Error(reason ?? '登录验证已取消'));
        this.controller.cancel(reason);
    }
    assertPending() {
        if (this.settled)
            throw new Error('登录验证已结束');
    }
}
function inferLoginVerificationMethods(decision) {
    const text = JSON.stringify(decision).toLowerCase();
    const methods = new Set();
    if (/captcha|slide|slider|verify_sdk/.test(text))
        methods.add('captcha');
    if (/secondary|auxiliary|backup_mobile|mobile_seperate/.test(text)) {
        methods.add('auxiliary-mobile-sms');
    }
    if (/mobile_sms|sms_verify|mobile_verify/.test(text))
        methods.add('mobile-sms');
    if (/qrcode|qr_code|scan_verify|scan_qr/.test(text))
        methods.add('mobile-qr');
    if (/push_verify|device_push/.test(text))
        methods.add('push');
    return methods.size > 0 ? [...methods] : ['unknown'];
}
//# sourceMappingURL=login-verification.js.map