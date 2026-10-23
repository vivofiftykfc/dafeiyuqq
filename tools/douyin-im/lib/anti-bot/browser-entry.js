import { installDesktopBdms } from './desktop-runtime.js';
const context = new Proxy(globalThis, {
    get(target, key) {
        if (key === 'webpackGlobal')
            return globalThis;
        return Reflect.get(target, key, target);
    },
});
installDesktopBdms(context);
//# sourceMappingURL=browser-entry.js.map