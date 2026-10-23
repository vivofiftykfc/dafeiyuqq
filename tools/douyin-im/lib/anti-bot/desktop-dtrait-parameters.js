export const DESKTOP_DTRAIT_PARAMETERS_KEY = 'dtrait-sdk/s_sdk_server_cert_key';
export class DesktopDTraitParameters {
    context;
    pending;
    constructor(context) {
        this.context = context;
    }
    get = (aid, useCache = true) => {
        if (!this.pending)
            this.pending = new Promise((resolve, reject) => {
                this.readOrFetch(aid, useCache)
                    .then(resolve)
                    .catch(reject)
                    .finally(() => {
                    this.pending = undefined;
                });
            });
        return this.pending;
    };
    readOrFetch(aid, useCache) {
        try {
            if (useCache) {
                const cached = this.readCache();
                if (cached && !hasEmptyOwnField(cached))
                    return Promise.resolve({ ...cached, dataFrom: 'local' });
                try {
                    this.context.localStorage.removeItem(DESKTOP_DTRAIT_PARAMETERS_KEY);
                }
                catch {
                }
            }
            return this.requestWithTimeout(aid)
                .then(async (response) => {
                const data = (response || {})['data'];
                if (hasEmptyOwnField(data))
                    throw new Error('get empty cert');
                const mapped = {
                    centralRsaPub: data?.['x-tt-session-dtrait-pk1'],
                    centralVersion: data?.['x-tt-session-dtrait-pk1-version'],
                    edgeRsaPub: data?.['x-tt-session-dtrait-pk2'],
                    edgeVersion: data?.['x-tt-session-dtrait-pk2-version'],
                    urlVersion: data?.['x-tt-session-dtrait-fe-url-version'],
                    dTraitVersion: data?.['x-tt-session-dtrait-version'],
                };
                try {
                    this.context.localStorage.setItem(DESKTOP_DTRAIT_PARAMETERS_KEY, this.context.btoa(JSON.stringify({
                        ...mapped,
                        createdTime: this.context.Date.now(),
                    })));
                }
                catch {
                }
                return { ...mapped, dataFrom: 'remote' };
            })
                .catch(error => Promise.reject(error));
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
    readCache() {
        try {
            const text = this.context.localStorage.getItem(DESKTOP_DTRAIT_PARAMETERS_KEY), now = this.context.Date.now();
            if (text && typeof text === 'string') {
                const { createdTime, ...cached } = JSON.parse(this.context.atob(text));
                if (createdTime + 86_400_000 > now)
                    return cached;
            }
        }
        catch {
            return null;
        }
        return undefined;
    }
    async requestWithTimeout(aid) {
        const timeout = new Promise((_resolve, reject) => {
            this.context.setTimeout(() => reject(new Error('get cert timeout')), 3000);
        });
        void timeout.catch(() => undefined);
        return Promise.race([timeout, this.request(aid)]);
    }
    request(aid) {
        if (!this.context.window.XMLHttpRequest || !this.context.window.FormData)
            return Promise.reject(new Error('not support XMLHttpRequest'));
        const xhr = new this.context.XMLHttpRequest();
        return new Promise((resolve, reject) => {
            xhr.open('POST', `/passport/ticket_guard/get_client_cert/?aid=${aid}&type=trait&sdk_version=1.0.23&is_from_ttaccountsdk=1`);
            xhr.onreadystatechange = () => {
                if (xhr.readyState !== 4 || !(xhr.status >= 200 && xhr.status < 300))
                    return;
                try {
                    const response = JSON.parse(xhr.response);
                    if (response.message !== 'success')
                        reject(new Error(response?.data?.description ||
                            response.message ||
                            'get cert error'));
                    resolve(response);
                }
                catch (error) {
                    reject(error);
                }
            };
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            xhr.setRequestHeader('Accept', 'application/json');
            const read = (name) => decodeURIComponent(this.context.document.cookie.replace(new RegExp('(?:(?:^|.*;)\\s*' +
                encodeURIComponent(name).replace(/[-.+*]/g, '\\$&') +
                '\\s*\\=\\s*([^;]*).*$)|^.*$'), '$1')) || null;
            xhr.setRequestHeader('x-tt-passport-csrf-token', read('passport_csrf_token') || read('passport_csrf_token_default') || '');
            xhr.send('server_data=1&need_session_dtrait=1');
        });
    }
}
function hasEmptyOwnField(value) {
    for (const key in value)
        if (value.hasOwnProperty(key) &&
            (value[key] === null || value[key] === undefined || value[key] === ''))
            return true;
    return false;
}
//# sourceMappingURL=desktop-dtrait-parameters.js.map