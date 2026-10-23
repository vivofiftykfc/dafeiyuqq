export class DesktopReportLifecycle {
    context;
    config;
    sources;
    sender;
    deviceReport;
    startCollection;
    deviceStarted = false;
    behaviorStarted = false;
    visibilityStarted = false;
    behaviorReported = false;
    lastBehaviorTime;
    constructor(context, config, sources, sender, deviceReport, startCollection) {
        this.context = context;
        this.config = config;
        this.sources = sources;
        this.sender = sender;
        this.deviceReport = deviceReport;
        this.startCollection = startCollection;
        this.lastBehaviorTime = context.performance.now();
    }
    start() {
        if (this.config.dump && !this.visibilityStarted) {
            this.visibilityStarted = true;
            this.context.document.addEventListener('visibilitychange', this.onVisibilityChange);
        }
        if (this.config.track.mode === 1)
            return;
        if (this.config.track.mode === 2) {
            this.startDevice();
            return;
        }
        if (this.config.track.mode === 0) {
            this.startDevice();
            if (!this.behaviorStarted) {
                this.behaviorStarted = true;
                Reflect.apply(this.startCollection, null, []);
                Reflect.apply(this.context.setInterval, null, [this.reportBehavior, this.config.track.delay * 1000]);
            }
        }
    }
    reportBehavior = () => {
        const now = this.context.performance.now();
        if (now - this.lastBehaviorTime >= 3000 || !this.behaviorReported) {
            this.behaviorReported = true;
            this.lastBehaviorTime = now;
            const report = this.collectBehavior();
            Reflect.apply(this.context.requestAnimationFrame, null, [() => this.sender.send(report)]);
        }
    };
    onVisibilityChange = () => {
        if (!this.behaviorReported) {
            this.behaviorReported = true;
            this.sender.send(this.collectBehavior(), true);
        }
    };
    startDevice() {
        if (!this.deviceStarted) {
            this.deviceStarted = true;
            Reflect.apply(this.context.setTimeout, null, [this.deviceReport, this.config.ddrt * 1000]);
        }
    }
    collectBehavior() {
        return {
            wID: { msgType: 2, privacyMode: 0, timestamp: this.context.Date.now() + '' },
            behavior: {
                beMove: this.sources.move.data(), beClick: this.sources.click.data(),
                beClickEnd: this.sources.clickEnd.data(), beKeyboard: this.sources.keyboard.data(),
                windowState: this.sources.windowState.data(), gyro: this.sources.gyro.data(),
                focus: this.sources.focus.data(), screen: Reflect.apply(this.sources.screen, null, []),
            },
        };
    }
}
//# sourceMappingURL=desktop-report-lifecycle.js.map