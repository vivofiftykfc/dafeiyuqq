import { randomUUID } from 'node:crypto';
export class ActionVerification {
    account;
    id = randomUUID();
    #challenge;
    #controller;
    #settled = false;
    #lifetime = new AbortController();
    #openTask;
    #urlTask;
    #resolveUrl;
    #rejectUrl;
    target;
    constructor(account, target, challenge, controller) {
        this.account = account;
        this.target = Object.freeze({ ...target });
        this.#challenge = challenge;
        this.#controller = controller;
    }
    get source() { return this.#challenge.source; }
    get signal() { return this.#lifetime.signal; }
    get raw() { return this.#challenge.raw; }
    get decision() {
        return this.source === 'passport-decision' ? JSON.parse(this.raw) : {};
    }
    open(options = {}) {
        return this.start(options);
    }
    openUrl(options = {}) {
        this.start({ ...options, openBrowser: options.openBrowser ?? false });
        return this.#urlTask;
    }
    start(options) {
        if (this.#openTask)
            return this.#openTask;
        this.assertPending();
        this.#urlTask = new Promise((resolve, reject) => {
            this.#resolveUrl = resolve;
            this.#rejectUrl = (error) => reject(error);
        });
        void this.#urlTask.catch(() => undefined);
        const task = this.#controller.open(this, options, (url) => this.#resolveUrl?.(url)).catch((error) => {
            const resolved = error instanceof Error ? error : new Error(String(error));
            this.#rejectUrl?.(resolved);
            this.cancel('业务验证页面未能完成');
            throw error;
        });
        void task.then(() => this.#rejectUrl?.(new Error('业务验证页在启动前已结束')), () => undefined);
        this.#openTask = task;
        return task;
    }
    async complete(result) {
        this.assertPending();
        if (result?.status !== true) {
            this.cancel('平台未确认业务验证通过');
            throw new Error('平台未确认业务验证通过');
        }
        this.#settled = true;
        try {
            this.#controller.complete();
            this.#lifetime.abort(null);
        }
        catch (error) {
            this.#lifetime.abort(error);
            throw error;
        }
    }
    cancel(reason = '业务验证已取消') {
        if (this.#settled)
            return;
        this.#settled = true;
        this.#lifetime.abort(new Error(reason));
        this.#controller.cancel(reason);
    }
    assertPending() {
        if (this.#settled)
            throw new Error('业务验证已结束');
    }
}
//# sourceMappingURL=action-verification.js.map