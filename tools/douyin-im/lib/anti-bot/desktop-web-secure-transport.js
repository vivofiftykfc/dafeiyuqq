import { DesktopWebSecureEvents } from './desktop-web-secure-events.js';
const features = new WeakMap();
export function captureDesktopWebSecureTransportFeatures(window) {
    let value = features.get(window);
    if (!value) {
        value = Object.freeze({ fetch: 'fetch' in window, request: 'Request' in window, headers: 'Headers' in window });
        features.set(window, value);
    }
    return value;
}
const singletons = ['age', 'authorization', 'content-length', 'content-type', 'etag', 'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since', 'last-modified', 'location', 'max-forwards', 'proxy-authorization', 'referer', 'retry-after', 'user-agent'];
export function parseDesktopWebSecureResponseHeaders(text) {
    const headers = {};
    if (text)
        text.split('\n').forEach(line => {
            const colon = line.indexOf(':'), name = line.substr(0, colon).trim().toLowerCase(), value = line.substr(colon + 1).trim();
            if (!name)
                return;
            if (headers[name] && singletons.includes(name))
                return;
            headers[name] = name === 'set-cookie' ? (headers[name] ? headers[name] : []).concat([value]) : headers[name] ? `${headers[name]}, ${value}` : value;
        });
    return headers;
}
export class DesktopWebSecureTransportHooks extends DesktopWebSecureEvents {
    context;
    pipeline;
    config = {};
    updateData = false;
    login = false;
    initType = 'pubKey';
    signType = 'pubKey';
    nativeOpen;
    nativeSend;
    nativeSetHeader;
    nativeFetch;
    support;
    constructor(context, pipeline) {
        super();
        this.context = context;
        this.pipeline = pipeline;
        this.support = captureDesktopWebSecureTransportFeatures(context.window);
        this.nativeOpen = context.window.XMLHttpRequest.prototype.open;
        this.nativeSend = context.window.XMLHttpRequest.prototype.send;
        this.nativeSetHeader = context.window.XMLHttpRequest.prototype.setRequestHeader;
        this.nativeFetch = context.window.fetch;
        this.patchXhr();
        this.patchFetch();
        for (const name of ['error', 'execute', 'log'])
            pipeline.on(name, event => { this.emit(name, event); });
    }
    setType = ({ initType = 'pubKey', signType = 'pubKey' }) => { this.initType = initType; this.signType = signType; };
    setConfig = (config) => { this.config = config; };
    setUpdateDataWhenVerifySuccess = (value) => { this.updateData = value; };
    setLogin = (value) => { this.login = value; };
    getBdTicketGuardHeader = async (signData) => {
        return this.pipeline.createTicketGuardHeaders({ signData, signType: 'pubKey', certType: 'header' });
    };
    patchXhr() {
        const owner = this, prototype = this.context.XMLHttpRequest.prototype;
        prototype.open = function () {
            this.secureOpenArgs = arguments;
            Reflect.apply(owner.nativeOpen, this, arguments);
        };
        prototype.send = function () {
            const xhr = this, open = this.secureOpenArgs, args = arguments, method = open[0] || 'GET';
            const url = new owner.context.URL(open[1], owner.context.location.href).toString();
            const match = owner.pipeline.classify({ method, url, headers: {} }, owner.config, owner.signType || 'pubKey', owner.initType || 'pubKey');
            const needProxy = match?.needProxy;
            if (!needProxy)
                return Reflect.apply(owner.nativeSend, xhr, args);
            const requestHeaders = {};
            let extras = {};
            const wrap = (callback) => function (...callbackArgs) {
                const task = (async () => {
                    if (xhr.readyState === 4 && 'getAllResponseHeaders' in xhr && typeof xhr.getAllResponseHeaders === 'function' && needProxy) {
                        const raw = Reflect.apply(xhr.getAllResponseHeaders, xhr, []), headers = parseDesktopWebSecureResponseHeaders(raw);
                        await owner.pipeline.complete({ config: { method, url, headers: {}, extras }, headers: headers || {}, reqHeaders: requestHeaders }, match, owner.updateData);
                    }
                    if (callback)
                        return Reflect.apply(callback, xhr, callbackArgs);
                    return undefined;
                })();
                owner.observe(task);
                return task;
            };
            if ('onloadend' in xhr && typeof xhr.onloadend === 'function')
                xhr.onloadend = wrap(xhr.onloadend);
            else {
                const callback = xhr.onreadystatechange, hasCallback = 'onreadystatechange' in xhr && typeof callback === 'function';
                xhr.onreadystatechange = hasCallback ? wrap(callback) : wrap();
            }
            if (open.length >= 3 && !open[2])
                return Reflect.apply(owner.nativeSend, xhr, args);
            const task = owner.pipeline.prepare({ method, url, headers: {} }, match).then(result => {
                const { headers = {}, extras: nextExtras = {} } = result || {};
                extras = nextExtras;
                Object.keys(headers).forEach(name => {
                    const value = headers[name];
                    requestHeaders[name] = value;
                    Reflect.apply(owner.nativeSetHeader, xhr, [name, value]);
                });
                return Reflect.apply(owner.nativeSend, xhr, args);
            });
            owner.observe(task);
            return undefined;
        };
    }
    patchFetch() {
        if (!this.support.fetch)
            return;
        const owner = this;
        this.context.window.fetch = function (input, options) {
            const receiver = this;
            let url, method;
            let init = options;
            if (owner.support.request && input instanceof owner.context.Request) {
                url = input.url;
                method = input.method;
            }
            else {
                url = input;
                method = init && init['method'] ? init['method'] : 'GET';
            }
            const match = owner.pipeline.classify({ method, url: url, headers: {} }, owner.config, owner.signType || 'pubKey', owner.initType || 'pubKey');
            if (!match?.needProxy)
                return Reflect.apply(owner.nativeFetch, receiver, [input, options]);
            return owner.pipeline.prepare({ method, url: url, headers: {} }, match).then(result => {
                const { headers, extras = {} } = result || {};
                try {
                    if (owner.support.request && input instanceof owner.context.Request) {
                        Object.keys(headers).forEach(name => input.headers.set(name, headers[name]));
                    }
                    else {
                        init = init || {};
                        init['headers'] = init['headers'] || {};
                        if (owner.support.headers && init['headers'] instanceof owner.context.Headers) {
                            Object.keys(headers).forEach(name => init?.['headers']?.set?.(name, headers[name]));
                        }
                        else if (init && init['headers'] && Array.isArray(init['headers'])) {
                            Object.keys(headers).forEach(name => { if (init && init['headers'] && Array.isArray(init['headers']))
                                init['headers']?.push([name, headers[name]]); });
                        }
                        else
                            Object.keys(headers).forEach(name => { init['headers'][name] = headers[name]; });
                    }
                }
                catch { }
                const pending = Reflect.apply(owner.nativeFetch, receiver, [input, init]);
                return pending.then(response => {
                    const responseHeaders = {};
                    if (response?.headers) {
                        if (typeof response.headers?.forEach === 'function')
                            response.headers?.forEach?.((value, name) => { responseHeaders[name] = value; });
                        else if (typeof response.headers?.get === 'function') {
                            responseHeaders['bd-ticket-guard-server-data'] = response.headers?.get('bd-ticket-guard-server-data') || '';
                            responseHeaders['bd-ticket-guard-result'] = response.headers?.get('bd-ticket-guard-result') || '';
                        }
                        return owner.pipeline.complete({ config: { method, url: url, headers: {}, extras }, headers: responseHeaders, reqHeaders: headers }, match, owner.updateData)
                            .then(() => response).catch(() => response);
                    }
                    return response;
                });
            });
        };
    }
    observe(task) {
        void task.catch(error => { try {
            this.context.onBackgroundError?.(error);
        }
        catch { } });
    }
}
//# sourceMappingURL=desktop-web-secure-transport.js.map