import { desktopWebSecureCookieDomain } from './desktop-web-secure-cookie.js';
export class DesktopWebSecureMemoryCache {
    context;
    agId;
    store = new Map();
    queue = new Map();
    disabled = false;
    constructor(context, agId) {
        this.context = context;
        this.agId = agId;
    }
    setDisabled = (disabled) => { this.disabled = disabled; };
    isEnabled = () => !this.disabled;
    clear = () => { this.store.clear(); this.queue.clear(); };
    wrapGetter = (read, options) => (...args) => {
        if (this.disabled)
            return Reflect.apply(read, null, args);
        const keys = options.extractKeysFromArgs ? options.extractKeysFromArgs(args) : args[0];
        if (!Array.isArray(keys) && typeof keys !== 'string')
            return Promise.reject(new Error('keys must be string or string[]'));
        return this.get(Array.isArray(keys) ? keys : [keys], missing => Reflect.apply(read, undefined, [missing]), response => options.extractDataFromResponse ? options.extractDataFromResponse(response, args) : response, (data, summary, responses) => options.packData ? options.packData(data, args, summary, responses) : data);
    };
    wrapSetter = (write, options) => (...args) => {
        if (this.disabled)
            return Reflect.apply(write, null, args);
        const data = options.extractDataFromArgs(args) || {};
        const keys = Object.keys(data);
        const result = Reflect.apply(write, null, args);
        this.observe(Promise.resolve(result).then(() => {
            keys.forEach(key => {
                const value = data[key], previous = this.store.get(key);
                if (previous && this.equal(value, previous.value))
                    return;
                this.store.set(key, { value, version: this.updateVersion(key) });
            });
        }));
        return result;
    };
    wrapUpdater = (update, extractKeys = args => args[0], mode = 'update') => (...args) => {
        if (this.disabled)
            return Reflect.apply(update, null, args);
        const keys = extractKeys(args);
        const result = Reflect.apply(update, null, args);
        this.observe(Promise.resolve(result).then(() => {
            (Array.isArray(keys) ? keys : [keys]).forEach(key => {
                if (mode === 'delete')
                    this.clearVersion(key);
                else
                    this.updateVersion(key);
            });
        }));
        return result;
    };
    get(keys, read, extract, pack) {
        const missing = [], pending = [], hits = {};
        keys.forEach(key => {
            if (!this.needUpdate(key) && this.store.has(key))
                hits[key] = this.store.get(key)?.value;
            else if (this.queue.has(key))
                pending.push(key);
            else
                missing.push(key);
        });
        if (!missing.length && !pending.length)
            return Promise.resolve(pack(hits, {
                total: keys.length, hit: keys.length, pending: 0, miss: 0, missKeys: [],
            }));
        const waiting = pending.map(key => this.queue.get(key));
        const batch = missing.length ? read(missing).then(response => {
            Object.entries(extract(response)).forEach(([key, value]) => {
                if (value === '' || value === undefined)
                    return;
                const cookie = this.readVersion(key);
                const version = cookie && !this.store.has(key) ? cookie : this.updateVersion(key);
                this.store.set(key, { value, version });
            });
            return extract(response);
        }) : Promise.resolve(hits);
        missing.forEach(key => {
            const item = batch.then(data => ({ [key]: data?.[key] }));
            this.queue.set(key, item);
            this.observe(item);
        });
        return Promise.all([batch, ...waiting]).then(responses => {
            const combined = responses.reduce((result, value) => Object.assign({}, result, value), {});
            return pack(Object.assign({}, hits, combined), {
                total: keys.length, hit: keys.length - (waiting.length + missing.length),
                pending: waiting.length, miss: missing.length, missKeys: missing,
            }, responses);
        });
    }
    needUpdate(key) {
        if (this.store.has(key) && this.readVersion(key) !== this.store.get(key)?.version) {
            this.store.delete(key);
            this.queue.delete(key);
            return true;
        }
        return !this.store.has(key);
    }
    cookieKey(key) {
        return `__security_mc_${this.agId}_${key.replace(/\//g, '_').replace(/^security-sdk_s_sdk/, 'sk')}`;
    }
    readVersion(key) {
        const cookieKey = this.cookieKey(key), cookies = this.context.document.cookie;
        const escaped = encodeURIComponent(cookieKey).replace(/[-.+*]/g, '\\$&');
        return decodeURIComponent(cookies.replace(new RegExp(`(?:(?:^|.*;)\\s*${escaped}\\s*\\=\\s*([^;]*).*$)|^.*$`), '$1')) || null;
    }
    updateVersion(key) {
        const version = 'xxxxxxxx-4xxx-yxxx'.replace(/[xy]/g, char => {
            const random = 16 * this.context.Math.random() | 0;
            return (char === 'x' ? random : 3 & random | 8).toString(16);
        });
        const cookieKey = this.cookieKey(key), domain = this.domain();
        this.context.document.cookie = `${encodeURIComponent(cookieKey)}=${encodeURIComponent(version)}; max-age=5184000${domain ? `; domain=${domain}` : ''}; path=/`;
        return version;
    }
    clearVersion(key) {
        const cookieKey = this.cookieKey(key), hostname = this.context.document.location.hostname, domain = this.domain();
        for (const target of [hostname, domain, undefined]) {
            this.context.document.cookie = `${encodeURIComponent(cookieKey)}=; expires=Thu, 01 Jan 1970 00:00:00 UTC${target ? `; domain=${target}` : ''}; path=/`;
        }
    }
    domain() {
        return desktopWebSecureCookieDomain(() => this.context.document.location.hostname);
    }
    equal(left, right) {
        if (typeof left !== typeof right)
            return false;
        if (typeof left === 'string' && typeof right === 'string')
            return left === right;
        try {
            return JSON.stringify(left) === JSON.stringify(right);
        }
        catch {
            return false;
        }
    }
    observe(promise) {
        void promise.catch(error => { try {
            this.context.onBackgroundError?.(error);
        }
        catch { } });
    }
}
//# sourceMappingURL=desktop-web-secure-cache.js.map