import { setDesktopProperty } from './desktop-property-write.js';
export function installDesktopEventSourceHook(context, tokens, callbacks) {
    if (typeof context.window.EventSource !== 'function')
        return;
    const parent = context.window.EventSource;
    const object = context.Object;
    const typeError = context.TypeError;
    if (typeof parent !== 'function' && parent !== null) {
        throw new typeError('Super expression must either be null or a function');
    }
    let getPrototype;
    const prototypeOf = (value) => {
        if (!getPrototype) {
            if (object.setPrototypeOf) {
                const get = object.getPrototypeOf;
                getPrototype = Reflect.apply(get.bind, get, []);
            }
            else
                getPrototype = value => Reflect.get(value, '__proto__') || object.getPrototypeOf(value);
        }
        return getPrototype(value);
    };
    const Wrapper = function (input, options) {
        if (!(this instanceof Wrapper))
            throw new typeError('Cannot call a class as a function');
        const url = Wrapper.handleUrl(input);
        const superConstructor = prototypeOf(Wrapper);
        let result;
        if (useReflect) {
            const newTarget = Reflect.get(prototypeOf(this), 'constructor');
            result = context.Reflect.construct(superConstructor, [url, options], newTarget);
        }
        else {
            result = superConstructor.apply(this, [url, options]);
        }
        if (result && (typeof result === 'object' || typeof result === 'function'))
            return result;
        if (result !== undefined)
            throw new typeError('Derived constructors may only return object or undefined');
        return this;
    };
    setDesktopProperty(Wrapper, 'prototype', object.create(parent && parent.prototype, {
        constructor: { value: Wrapper, writable: true, configurable: true },
    }));
    object.defineProperty(Wrapper, 'prototype', { writable: false });
    if (parent) {
        if (object.setPrototypeOf) {
            const set = object.setPrototypeOf;
            Reflect.apply(set.bind, set, [])(Wrapper, parent);
        }
        else
            setDesktopProperty(Wrapper, '__proto__', parent);
    }
    const useReflect = nativeReflectConstruct();
    object.defineProperty(Wrapper, 'handleUrl', {
        enumerable: false, configurable: true, writable: true,
        value(input) {
            const isUrl = typeof context.URL !== 'undefined' && input instanceof context.URL;
            const base = context.location.href;
            const url = isUrl ? input : new context.URL(input, base);
            if (!Reflect.apply(callbacks.matchesSigning, null, [url.pathname]))
                return input;
            if (Reflect.apply(callbacks.matchesBehavior, null, [url.pathname]))
                Reflect.apply(callbacks.reportBehavior, null, []);
            if (tokens.token && !url.searchParams.has('msToken'))
                url.searchParams.append('msToken', tokens.token);
            const signature = Reflect.apply(callbacks.sign, null, [url.search.slice(1), {}]);
            url.searchParams.append('a_bogus', signature);
            return url;
        },
    });
    object.defineProperty(Wrapper, 'prototype', { writable: false });
    setDesktopProperty(context.window, 'EventSource', Wrapper);
    function nativeReflectConstruct() {
        if (typeof context.Reflect === 'undefined' || !context.Reflect.construct)
            return false;
        if (context.Reflect.construct.sham)
            return false;
        if (typeof context.Proxy === 'function')
            return true;
        try {
            context.Boolean.prototype.valueOf.call(context.Reflect.construct(context.Boolean, [], function () { }));
            return true;
        }
        catch {
            return false;
        }
    }
}
//# sourceMappingURL=desktop-eventsource-hook.js.map