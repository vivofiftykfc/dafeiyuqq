import { DesktopBehaviorState } from './desktop-behavior.js';
export class DesktopBehaviorCollector extends DesktopBehaviorState {
    context;
    constructor(context) {
        super(context.performance.now());
        this.context = context;
        this.queueFrame();
    }
    startCollection = () => {
        this.context.document.addEventListener('mousemove', event => this.recordMove(this.mousePoint(event)));
        this.context.document.addEventListener('touchmove', event => this.recordMove(this.touchPoint(event)));
        this.context.document.addEventListener('mousedown', event => this.recordClickStart(this.mousePoint(event)));
        this.context.document.addEventListener('touchstart', event => this.recordClickStart(this.touchPoint(event)));
        this.context.document.addEventListener('mouseup', event => this.recordClickEnd(this.mousePoint(event)));
        this.context.document.addEventListener('touchend', event => this.recordClickEnd(this.touchPoint(event)));
        this.context.document.addEventListener('keydown', () => this.recordKeySample(() => this.context.Date.now()));
        this.context.document.addEventListener('mouseover', event => this.recordHover(this.hoverPoint(event, 1)));
        this.context.document.addEventListener('mouseout', event => this.recordHover(this.hoverPoint(event, 0)));
        if (this.context.window.self === this.context.window.top) {
            this.context.window.addEventListener('deviceorientation', event => {
                const input = event;
                const x = input.beta, y = input.gamma, z = input.alpha;
                this.recordOrientationSample(x, y, z, () => this.context.Date.now(), () => this.context.Math.random());
            });
        }
        this.context.document.addEventListener('visibilitychange', () => this.recordVisibilitySample(() => this.context.document.visibilityState, () => this.context.Date.now()));
    };
    queueFrame() {
        this.context.window.requestAnimationFrame(() => {
            this.recordFrame(() => this.context.performance.now());
            if (!this.frameSamplingComplete)
                this.queueFrame();
        });
    }
    mousePoint(event) {
        const input = event;
        return { x: input.clientX, y: input.clientY, ts: this.context.Date.now() };
    }
    touchPoint(event) {
        const point = event.touches?.item(0);
        if (point)
            return this.mousePoint(point);
        return undefined;
    }
    hoverPoint(event, mode) {
        const target = event.target;
        if (!(target instanceof this.context.HTMLElement))
            return undefined;
        const nodeName = target.nodeName;
        if (nodeName == 'BODY' || nodeName == 'HTML')
            return undefined;
        let text = '';
        try {
            text = Reflect.apply(this.context.encodeURI, null, [target.innerText.slice(0, 15)]);
        }
        catch { }
        if (text)
            return { target: text, mode, ts: this.context.Date.now() };
        return undefined;
    }
}
//# sourceMappingURL=desktop-behavior-collector.js.map