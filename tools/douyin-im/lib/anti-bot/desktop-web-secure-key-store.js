import { DesktopWebSecureEvents } from './desktop-web-secure-events.js';
import { DesktopWebSecureMemoryCache } from './desktop-web-secure-cache.js';
import { DesktopWebSecureCookieOperator } from './desktop-web-secure-cookie.js';
export const DESKTOP_WEB_SECURE_INIT_KEYS = ['s_sdk_crypt_sdk', 's_sdk_cert_key', 's_sdk_sign_data_key/web_protect'];
export class DesktopWebSecureKeyStore extends DesktopWebSecureEvents {
    context;
    cookieOperate;
    store;
    memoryCache;
    loadIframePromise;
    get;
    set;
    delete;
    getItems;
    setItems;
    getItemsWithOrigin;
    getLocalItem;
    setLocalItem;
    getLocalItems;
    getIframeStatus;
    getStorageStatus;
    startStorageChecker;
    constructor(context, options = {}) {
        super();
        this.context = context;
        this.cookieOperate = new DesktopWebSecureCookieOperator(context.document);
        this.cookieOperate.on('error', event => { this.emit('error', event); });
        const store = this.store = context.createStore();
        this.loadIframePromise = store.loadIframePromise;
        for (const event of ['error', 'load', 'execute', 'log'])
            store.on(event, data => { this.emit(event, data); });
        const cache = this.memoryCache = new DesktopWebSecureMemoryCache(context, options.agId || 1);
        if (options.enableCache === false)
            cache.setDisabled(true);
        const getItems = cache.wrapGetter(store.getItemWithKeys, {});
        const getOrigins = cache.wrapGetter(store.getItemsWithOrigin, {
            extractKeysFromArgs: args => args[0],
            extractDataFromResponse: response => {
                const values = {}, data = (response || {}).data || {};
                for (const key in data)
                    if (Object.prototype.hasOwnProperty.call(data, key))
                        values[key] = data[key].value;
                return values;
            },
            packData: (values, _args, summary) => {
                const data = {};
                for (const key in values)
                    if (Object.prototype.hasOwnProperty.call(values, key))
                        data[key] = { value: values[key], key };
                return { data, from: '-1', summary };
            },
        });
        const get = cache.wrapGetter(store.getItem, { extractKeysFromArgs: args => [args[0]],
            extractDataFromResponse: (value, args) => ({ [args[0]]: value }), packData: (values, args) => values[args[0]],
        });
        const set = cache.wrapSetter(store.setItem, { extractDataFromArgs: args => ({ [args[0]]: args[1] }) });
        const setItems = cache.wrapSetter(store.setItemWithKeys, { extractDataFromArgs: args => {
                const values = {};
                for (let index = 0; index < args[0].length; index++)
                    values[args[0][index]] = args[1][index];
                return values;
            } });
        const remove = cache.wrapUpdater(store.deleteItem, args => args[0], 'delete');
        this.get = this.guard(get, 'iframe get item error', 'getItem', 'storage');
        this.set = this.guard(set, 'iframe set item error', 'setItem', 'storage');
        this.delete = this.guard(remove, 'iframe delete item error', 'deleteItem', 'storage');
        this.getItems = this.guard(getItems, 'iframe get items keys error', 'getKeys', 'storage');
        this.setItems = this.guard(setItems, 'iframe set items keys error', 'setKeys', 'storage');
        this.getItemsWithOrigin = this.guard(getOrigins, 'iframe get items keys with origin error', 'getKeys', 'storage');
        this.getLocalItem = this.guard(store.getLocalItem, 'localstorage get item keys error', 'getItem', 'localstorage');
        this.setLocalItem = this.guard(store.setLocalItem, 'localstorage set item keys error', 'setItem', 'localstorage');
        this.getLocalItems = this.guard(store.getLocalItemsWithKeys, 'localstorage set item keys error', 'setItem', 'localstorage');
        this.getIframeStatus = store.getIframeStatus;
        this.getStorageStatus = store.getStorageStatus;
        this.startStorageChecker = store.startStorageChecker;
        if (cache.isEnabled())
            this.observe(this.getItems(options.getInitKeys ? options.getInitKeys() : [...DESKTOP_WEB_SECURE_INIT_KEYS]));
    }
    reportError = (error, name, scope, operation, args) => {
        try {
            this.emit('error', { error, name });
            if (scope && operation) {
                const key = Array.isArray(args) && args.length > 0 && args[0];
                if (typeof key === 'string')
                    this.emit('log', { content: 'report error', extra: { key: key || '' }, level: 'error' });
                else if (key && Array.isArray(key)) {
                    const fields = {};
                    key.forEach(value => { fields[`${value.replace(/\//g, '_')}`] = '1'; });
                    this.emit('log', { content: 'report error', extra: { ...fields }, level: 'error' });
                }
            }
        }
        catch (failure) {
            this.emit('error', { error: failure, name: 'report error' });
        }
    };
    guard(operation, name, action, scope) {
        const report = this.reportError;
        return async function (...args) {
            try {
                return await operation.apply(this, args);
            }
            catch (error) {
                report(error, name, scope, action, args);
                return undefined;
            }
        };
    }
    observe(pending) { void pending.catch(error => { try {
        this.context.onBackgroundError?.(error);
    }
    catch { } }); }
}
//# sourceMappingURL=desktop-web-secure-key-store.js.map