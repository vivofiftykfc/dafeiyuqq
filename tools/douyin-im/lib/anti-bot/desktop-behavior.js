export class DesktopBehaviorState {
    startPerformanceTime;
    moves = [];
    clickStarts = [];
    keydowns = [];
    clickEnds = [];
    windowStates = [];
    orientations = [];
    focus = [];
    frameCount = 0;
    interval = 16;
    constructor(startPerformanceTime) {
        this.startPerformanceTime = startPerformanceTime;
    }
    get sampleIntervalMs() { return this.interval; }
    recordFrame(performanceTime) {
        if (this.frameCount >= 60)
            return;
        this.frameCount++;
        if (this.frameCount === 60) {
            const time = typeof performanceTime === 'function' ? performanceTime() : performanceTime;
            this.interval = (time - this.startPerformanceTime) / 60;
        }
    }
    get frameSamplingComplete() { return this.frameCount >= 60; }
    recordMove(point) {
        this.recordPoint(this.moves, point, 400);
    }
    recordClickStart(point) {
        this.recordPoint(this.clickStarts, point, 100);
    }
    recordClickEnd(point) {
        this.recordPoint(this.clickEnds, point, 200);
    }
    recordVisibility(visibilityState, ts) {
        this.recordVisibilitySample(() => visibilityState, () => ts);
    }
    recordVisibilitySample(readVisibility, now) {
        const previous = this.windowStates.at(-1);
        const v = readVisibility() === 'visible' ? 1 : 2;
        const ts = now();
        if (previous?.v === v)
            return;
        this.push(this.windowStates, { v, ts }, 50);
    }
    recordHover(point) {
        if (!point)
            return;
        if (point.mode === 1) {
            this.push(this.focus, { ...point }, 50);
            return;
        }
        const previous = this.focus.at(-1);
        if (!previous)
            return;
        if (point.ts - previous.ts >= 350)
            this.push(this.focus, { ...point }, 50);
        else
            this.focus.shift();
    }
    recordOrientation(point, random) {
        this.recordOrientationSample(point.x, point.y, point.z, () => point.ts, random);
    }
    recordOrientationSample(x, y, z, now, random) {
        if (!x || !y || !z)
            return;
        const previous = this.orientations.at(-1);
        const point = { x, y, z, ts: now() };
        const interval = random() * 90000 + 60000;
        if (previous && point.ts - previous.ts < interval)
            return;
        this.push(this.orientations, { x: point.x, y: point.y, z: point.z, ts: point.ts }, 50);
    }
    recordKeydown(ts) {
        this.recordKeySample(() => ts);
    }
    recordKeySample(now) {
        const previous = this.keydowns.at(-1);
        const ts = now();
        if (previous?.ts === ts)
            return;
        this.push(this.keydowns, { ts }, 100);
    }
    mask(trackMode = 0) {
        if (trackMode !== 0)
            return 0;
        let result = this.clickStarts.length ? 0 : 4;
        if (!this.moves.length)
            result |= 2;
        else if (this.moves.length > 1) {
            let sum = 0;
            for (let index = 1; index < this.moves.length; index++) {
                const previous = this.moves[index - 1], point = this.moves[index];
                sum += Math.sqrt((point.x - previous.x) ** 2 + (point.y - previous.y) ** 2) / (point.ts - previous.ts);
            }
            if (sum / (this.moves.length - 1) > 18)
                result |= 16;
        }
        if (!this.keydowns.length)
            result |= 8;
        else if (this.keydowns.length >= 6) {
            let sum = 0;
            for (let index = 1; index < this.keydowns.length; index++) {
                sum += 1 / (this.keydowns[index].ts - this.keydowns[index - 1].ts);
            }
            if (sum / (this.keydowns.length - 1) > 0.2)
                result |= 32;
        }
        return result;
    }
    getSnapshot() {
        return {
            moves: this.moves.map(point => ({ ...point })),
            clickStarts: this.clickStarts.map(point => ({ ...point })),
            keydowns: this.keydowns.map(point => ({ ...point })),
            clickEnds: this.clickEnds.map(point => ({ ...point })),
            windowStates: this.windowStates.map(point => ({ ...point })),
            orientations: this.orientations.map(point => ({ ...point })),
            focus: this.focus.map(point => ({ ...point })),
        };
    }
    createReportSources(screen) {
        const view = (queue) => ({ data: () => queue.map(point => ({ ...point })) });
        return {
            move: view(this.moves), click: view(this.clickStarts), clickEnd: view(this.clickEnds),
            keyboard: view(this.keydowns), windowState: view(this.windowStates), gyro: view(this.orientations),
            focus: view(this.focus), screen,
        };
    }
    recordPoint(queue, point, capacity) {
        if (!point)
            return;
        const previous = queue.at(-1);
        if (previous && (point.ts - previous.ts <= this.interval || (point.x === previous.x && point.y === previous.y)))
            return;
        this.push(queue, { x: point.x, y: point.y, ts: point.ts }, capacity);
    }
    push(queue, value, capacity) {
        if (queue.length === capacity)
            queue.shift();
        queue.push(value);
    }
}
//# sourceMappingURL=desktop-behavior.js.map