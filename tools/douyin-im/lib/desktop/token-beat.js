export class PassportTokenBeat {
    request;
    onExpired;
    controller;
    timer;
    throttle;
    operated = false;
    constructor(request, onExpired) {
        this.request = request;
        this.onExpired = onExpired;
    }
    start() {
        if (this.controller)
            return;
        this.controller = new AbortController();
        this.startBeating('boot');
    }
    activity() {
        if (!this.controller || this.throttle)
            return;
        this.throttle = setTimeout(() => { delete this.throttle; }, 10_000);
        this.throttle.unref?.();
        if (this.timer)
            this.operated = true;
        else
            this.startBeating('active');
    }
    stop() {
        const controller = this.controller;
        delete this.controller;
        this.pause();
        clearTimeout(this.throttle);
        delete this.throttle;
        controller?.abort(new Error('Session 续期已停止'));
    }
    pause() {
        clearInterval(this.timer);
        delete this.timer;
        this.operated = false;
    }
    startBeating(scene) {
        if (this.timer || !this.controller)
            return;
        this.timer = setInterval(() => {
            if (!this.operated) {
                this.pause();
                return;
            }
            this.operated = false;
            void this.beat('polling');
        }, 600_000);
        this.timer.unref?.();
        void this.beat(scene);
    }
    async beat(scene) {
        const controller = this.controller;
        if (!controller)
            return;
        let response;
        try {
            response = await this.request(scene, controller.signal);
        }
        catch {
            return;
        }
        if (this.controller !== controller || controller.signal.aborted)
            return;
        if (response.message !== 'success' && response.data?.error_code === 401) {
            this.stop();
            this.onExpired();
        }
    }
}
//# sourceMappingURL=token-beat.js.map