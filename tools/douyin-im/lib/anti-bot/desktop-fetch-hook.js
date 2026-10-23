import { setDesktopProperty } from './desktop-property-write.js';
export function installDesktopFetchHook(context, tokens, callbacks) {
    if (typeof context.window.fetch !== 'function')
        return;
    const fetch = context.window.fetch;
    setDesktopProperty(context.window, 'fetch', async function (input, options = {}) {
        const isRequest = typeof context.Request !== 'undefined' && input instanceof context.Request;
        const isUrl = typeof context.URL !== 'undefined' && input instanceof context.URL;
        const base = context.location.href;
        const url = isRequest ? new context.URL(input.url, base) : isUrl ? input : new context.URL(input, base);
        if (!Reflect.apply(callbacks.matchesSigning, null, [url.pathname])) {
            return Reflect.apply(fetch, null, [input, options]);
        }
        if (Reflect.apply(callbacks.matchesBehavior, null, [url.pathname])) {
            Reflect.apply(callbacks.reportBehavior, null, []);
        }
        if (tokens.token && !url.searchParams.has('msToken'))
            url.searchParams.append('msToken', tokens.token);
        if (isRequest) {
            return input.clone().text().then(text => {
                const contentType = input.headers?.get('content-type') || undefined;
                const signature = Reflect.apply(callbacks.sign, null, [url.search.slice(1), options.body ?? text, contentType]);
                url.searchParams.append('a_bogus', signature);
                const init = {
                    cache: input.cache, credentials: input.credentials, headers: input.headers,
                    integrity: input.integrity, method: input.method, mode: input.mode,
                    redirect: input.redirect, referrer: input.referrer, referrerPolicy: input.referrerPolicy,
                };
                if (input.body)
                    init.body = text;
                else {
                    setDesktopProperty(Object(options), 'body', options.body ?? text, options);
                    if ((options.method || init.method || 'GET').toUpperCase() === 'GET' && text === '') {
                        setDesktopProperty(Object(options), 'body', null, options);
                    }
                }
                const request = new context.Request(url.href, init);
                return Reflect.apply(fetch, null, [request, options]);
            });
        }
        const signature = Reflect.apply(callbacks.sign, null, [url.search.slice(1), options.body]);
        url.searchParams.append('a_bogus', signature);
        return Reflect.apply(fetch, null, [isUrl ? url : url.href, options]);
    });
}
//# sourceMappingURL=desktop-fetch-hook.js.map