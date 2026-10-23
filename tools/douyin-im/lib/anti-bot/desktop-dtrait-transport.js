const singletonHeaders = [
    'age',
    'authorization',
    'content-length',
    'content-type',
    'etag',
    'expires',
    'from',
    'host',
    'if-modified-since',
    'if-unmodified-since',
    'last-modified',
    'location',
    'max-forwards',
    'proxy-authorization',
    'referer',
    'retry-after',
    'user-agent',
];
export function parseDesktopDTraitResponseHeaders(raw) {
    const headers = {};
    if (!raw)
        return headers;
    raw.split('\n').forEach(line => {
        const colon = line.indexOf(':');
        const name = line.substring(0, Math.max(0, colon)).trim().toLowerCase();
        const value = line.substring(colon + 1).trim();
        if (!name)
            return;
        if (headers[name] && singletonHeaders.indexOf(name) >= 0)
            return;
        headers[name] =
            name === 'set-cookie'
                ? (headers[name] || []).concat([value])
                : headers[name]
                    ? headers[name] + ', ' + value
                    : value;
    });
    return headers;
}
export function createDesktopDTraitTransportInstaller(realm, diagnostics = {}) {
    const fetchPresent = 'fetch' in realm.window, requestPresent = 'Request' in realm.window, headersPresent = 'Headers' in realm.window;
    const parseUrl = (input) => {
        try {
            const url = new realm.URL(input, realm.window.location.href);
            const { host, pathname, searchParams } = url;
            const query = {};
            for (const [key, value] of searchParams.entries())
                query[key] = value;
            return {
                host,
                pathname,
                urlObj: url,
                query,
                fullUrl: input,
            };
        }
        catch {
            return { pathname: input };
        }
    };
    const observe = (task) => {
        void task.catch(error => {
            try {
                diagnostics.onBackgroundError?.(error);
            }
            catch {
            }
        });
    };
    return (callbacks) => {
        const nativeOpen = realm.window.XMLHttpRequest.prototype.open;
        const nativeSend = realm.window.XMLHttpRequest.prototype.send;
        const nativeSetHeader = realm.window.XMLHttpRequest.prototype.setRequestHeader;
        const nativeFetch = realm.window.fetch;
        const owner = {
            processResponseConfig: callbacks.processResponseConfig,
            processRequestConfig: callbacks.processRequestConfig,
            hookConfig: callbacks.hookConfig,
            errorRequestConfig: callbacks?.errorRequestConfig || (() => null),
        };
        realm.XMLHttpRequest.prototype.open = function () {
            this.secureOpenArgs = arguments;
            this.ucProxyParam = { startTime: realm.Date.now() };
            nativeOpen.apply(this, arguments);
        };
        realm.XMLHttpRequest.prototype.send = function () {
            const xhr = this, openArgs = this.secureOpenArgs, args = arguments;
            const method = openArgs[0] || 'GET';
            const config = Object.assign({}, parseUrl(openArgs[1]) || {}, { method });
            const { needProxy = false, onlyProxyReq = false, onlyProxyResp = false, } = owner.hookConfig(config) || {};
            if (!needProxy && !onlyProxyReq && !onlyProxyResp)
                return nativeSend.apply(xhr, args);
            const error = (errType, err) => owner.errorRequestConfig?.({ config, errType, err, instance: xhr });
            xhr.addEventListener('error', event => {
                error('error', event);
            });
            xhr.addEventListener('abort', event => {
                error('abort', event);
            });
            xhr.addEventListener('timeout', event => {
                error('timeout', event);
            });
            const reqHeaders = {};
            let extras = {};
            const wrap = (previous) => async function (...values) {
                if (xhr.readyState === 4 &&
                    'getAllResponseHeaders' in xhr &&
                    typeof xhr.getAllResponseHeaders === 'function' &&
                    (needProxy || onlyProxyResp)) {
                    const headers = parseDesktopDTraitResponseHeaders(xhr.getAllResponseHeaders());
                    await owner.processResponseConfig({
                        config,
                        headers: headers || {},
                        reqHeaders,
                        extras,
                        httpCode: xhr.status,
                    }, xhr);
                }
                if (previous)
                    return previous.apply(xhr, values);
                return undefined;
            };
            if ('onloadend' in xhr && typeof xhr.onloadend === 'function') {
                const previous = xhr.onloadend;
                xhr.onloadend = wrap(previous);
            }
            else {
                const previous = xhr.onreadystatechange;
                const hasPrevious = 'onreadystatechange' in xhr && typeof previous === 'function';
                xhr.onreadystatechange = wrap(hasPrevious
                    ? previous
                    : undefined);
            }
            if ((openArgs.length >= 3 && !openArgs[2]) || onlyProxyResp)
                return nativeSend.apply(xhr, args);
            const pending = owner.processRequestConfig?.(config, xhr).then(value => {
                const { headers = {}, extras: nextExtras = {} } = value || {};
                extras = nextExtras;
                Object.keys(headers).forEach(key => {
                    reqHeaders[key] = headers[key];
                    nativeSetHeader.call(xhr, key, headers[key]);
                });
                return nativeSend.apply(xhr, args);
            });
            if (pending)
                observe(pending);
            return undefined;
        };
        if (fetchPresent)
            realm.window.fetch = function (input, init) {
                const receiver = this;
                const isRequest = () => requestPresent && input instanceof realm.Request;
                let url, method;
                if (isRequest()) {
                    url = input.url;
                    method = input.method;
                }
                else {
                    url = input;
                    method = init && init.method ? init.method : 'GET';
                }
                const meta = {
                    ucProxyParam: { startTime: realm.Date.now() },
                };
                const config = Object.assign({}, parseUrl(url) || {}, { method });
                const { needProxy = false, onlyProxyReq = false, onlyProxyResp = false, } = owner.hookConfig(config) || {};
                const response = (value, reqHeaders, extras) => {
                    if (needProxy || onlyProxyResp) {
                        const headers = {};
                        if (value?.headers) {
                            if (typeof value?.headers?.forEach === 'function')
                                value?.headers?.forEach?.((item, key) => {
                                    headers[key] = item;
                                });
                            else if (typeof value?.headers?.get === 'function') {
                                for (const key of [
                                    'x-tt-session-dtrait-token',
                                    'bd-ticket-guard-server-data',
                                    'bd-ticket-guard-result',
                                    'x-tt-logid',
                                ])
                                    headers[key] = value?.headers?.get(key) || '';
                            }
                            return owner
                                .processResponseConfig({ config, headers, reqHeaders, extras }, meta)
                                .then(() => value);
                        }
                    }
                    return value;
                };
                if (needProxy || onlyProxyReq)
                    return owner.processRequestConfig(config, meta).then(value => {
                        const { headers = {}, extras = {} } = value || {};
                        try {
                            if (isRequest())
                                Object.keys(headers).forEach(key => {
                                    input.headers.set(key, headers[key]);
                                });
                            else {
                                init = init || {};
                                init.headers = init.headers || {};
                                if (headersPresent && init?.headers instanceof realm.Headers)
                                    Object.keys(headers).forEach(key => {
                                        init?.headers?.set?.(key, headers[key]);
                                    });
                                else if (init && init.headers && Array.isArray(init.headers))
                                    Object.keys(headers).forEach(key => {
                                        if (init && init.headers && Array.isArray(init.headers))
                                            init?.headers?.push([
                                                key,
                                                headers[key],
                                            ]);
                                    });
                                else
                                    Object.keys(headers).forEach(key => {
                                        init.headers[key] = headers[key];
                                    });
                            }
                        }
                        catch {
                            diagnostics.onDiagnostic?.('fetch-headers');
                        }
                        return nativeFetch
                            .call(receiver, input, init)
                            .then(value => response(value, headers, extras))
                            .catch(error => {
                            owner.errorRequestConfig?.({
                                config,
                                err: error,
                                instance: meta,
                                errType: 'error',
                            });
                            return Promise.reject(error);
                        });
                    });
                return nativeFetch
                    .call(this, input, init)
                    .then(value => response(value));
            };
    };
}
//# sourceMappingURL=desktop-dtrait-transport.js.map