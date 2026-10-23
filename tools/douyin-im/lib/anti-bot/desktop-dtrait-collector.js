function invoke(task, complete) {
    try {
        const value = task();
        if (value && typeof value.then === 'function')
            value.then(result => complete(true, result), error => complete(false, error));
        else
            complete(true, value);
    }
    catch (error) {
        complete(false, error);
    }
}
function observe(task) {
    void task.then(undefined, () => { });
    return task;
}
async function mapInSlices(context, items, map, budget = 16) {
    const results = Array(items.length);
    let start = context.Date.now();
    for (let i = 0; i < items.length; i++) {
        results[i] = map(items[i], i);
        const now = context.Date.now();
        if (now >= start + budget) {
            start = now;
            await new Promise(resolve => context.setTimeout(() => resolve(), 0));
        }
    }
    return results;
}
export function prepareDesktopDTraitCollection(context, tasks, options, budget) {
    const keys = Object.keys(tasks);
    const prepared = observe(mapInSlices(context, keys, key => {
        const task = tasks[key];
        const stage = observe(new Promise(resolve => {
            const start = context.Date.now();
            invoke(task.bind(null, options), (success, value) => {
                const duration = context.Date.now() - start;
                if (!success)
                    return resolve(() => ({ error: value, duration }));
                if (typeof value !== 'function')
                    return resolve(() => ({ value, duration }));
                resolve(() => new Promise(finish => {
                    const secondStart = context.Date.now();
                    invoke(value, (ok, result) => {
                        const total = duration + context.Date.now() - secondStart;
                        finish(ok
                            ? { value: result, duration: total }
                            : { error: result, duration: total });
                    });
                }));
            });
        }));
        return () => stage.then(run => run());
    }, budget));
    return async () => {
        const stages = await prepared;
        const running = await mapInSlices(context, stages, run => observe(run()), budget);
        const values = await Promise.all(running);
        const result = {};
        for (let i = 0; i < keys.length; i++)
            result[keys[i]] = values[i];
        return result;
    };
}
export class DesktopDTraitCollector {
    context;
    bool;
    str;
    constructor(context, plugins) {
        this.context = context;
        this.str = {
            strFeature: plugins.strFeature,
            canvas: plugins.canvas,
            audio: plugins.audio,
            css: plugins.css,
            domRect: plugins.domRect,
            mediaTypes: plugins.mediaTypes,
            speech: plugins.speech,
            svgRect: plugins.svgRect,
            math: plugins.math,
            webGL: plugins.webGL,
            fonts: plugins.fonts,
        };
        this.bool = { boolFeature: plugins.boolFeature };
    }
    async collectGroup(tasks) {
        const run = prepareDesktopDTraitCollection(this.context, tasks, {
            cache: {},
            debug: false,
        });
        const results = await run();
        let combined = {};
        for (const key of Object.keys(results)) {
            const result = results[key];
            combined = Object.assign(Object.assign({}, combined), result.value);
        }
        return Object.assign({}, combined);
    }
    async collectOnce() {
        const [bool, str] = await Promise.all([
            this.collectGroup(this.bool),
            this.collectGroup(this.str),
        ]);
        return { num: {}, bool, str };
    }
    async collect() {
        try {
            return await new Promise((resolve, reject) => {
                let retries = 3;
                const attempt = () => {
                    void this.collectOnce()
                        .then(resolve)
                        .catch(error => {
                        if (retries-- > 0)
                            attempt();
                        else
                            reject(error);
                    });
                };
                attempt();
            });
        }
        catch {
            return { bool: {}, num: {}, str: {} };
        }
    }
}
//# sourceMappingURL=desktop-dtrait-collector.js.map