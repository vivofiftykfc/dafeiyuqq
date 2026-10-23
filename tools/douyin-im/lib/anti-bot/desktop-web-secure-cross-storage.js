import { DesktopWebSecureEvents } from './desktop-web-secure-events.js';
import { DesktopWebSecureSocket } from './desktop-web-secure-socket.js';
const signedKeys = ['security-sdk/s_sdk_crypt_sdk', 'security-sdk/s_sdk_cert_key', 'security-sdk/s_sdk_sign_data_key/web_protect'];
export class DesktopWebSecureCrossStorage extends DesktopWebSecureEvents {
    host;
    bridges;
    context;
    config;
    client;
    storage;
    storageX;
    sign;
    logger;
    constructor(host, bridges, context, config = {}) {
        super();
        this.host = host;
        this.bridges = bridges;
        this.context = context;
        this.config = { debug: false, hostname: context.hostname, ...config };
        this.client = new DesktopWebSecureSocket(host, context, { ...this.config.scoket, protocol: this.config.protocol,
            allowOrigin: this.config.allowOrigin, debug: this.config.debug, url: this.config.url });
        this.storage = context.createLocalStorage(this.config.storage);
        this.storageX = this.storage;
        if (this.config.verifySignMethod)
            this.sign = { verify: values => Promise.resolve(this.config.verifySignMethod(values)) };
        this.logger = { metrics: event => { this.emit('metrics', event); return Promise.resolve(); } };
        this.initBirdgeEvent();
        this.on('error', event => { const error = event; if (!this.config.disableReportLogger)
            void this.client.dispatchParentEvent('error', { name: error.name, message: error.message, origin: error.origin }).catch(() => undefined); });
        this.on('log', event => { if (!this.config.disableReportLogger)
            void this.client.dispatchParentEvent('log', event).catch(() => undefined); });
        this.on('debug', event => { if (this.config.debug) {
            const data = event;
            this.emit('log', { ...data, name: `Debug:${data.name}` });
        } });
        this.client.on('error', error => { error.name = `Socket:${error.name}`; this.emit('error', error); });
        this.storage.on('error', event => { const error = event; error.name = `WebStorage:${error.name}`; this.emit('error', error); });
        this.storage.on('log', event => { this.emit('log', event); });
        for (const name of ['log', 'metrics', 'debug'])
            this.client.on(name, event => { this.emit(name, event); });
        this.observe(this.client.start().catch(error => { this.emit('error', host.error('StartSocketClientError', error.message)); }));
    }
    listen = () => { this.client.listen(); };
    setConfig = (config) => new Promise(resolve => {
        this.config = { ...this.config, ...config };
        this.emit('config', this.config);
        resolve();
    });
    startStorageChecker = () => this.connected().then(() => this.bridges.createBridge(this.client, true, 3000)('config', 'startChecker', []));
    startChecker = () => new Promise(resolve => { const callback = this.config.startStorageCheckerCallBack; callback?.(); resolve(); });
    setOriginStorageConfig = (config) => this.connected().then(() => {
        if (this.client.config.url)
            return this.bridges.createBridge(this.client, true, 30000)('config', 'setConfig', [config]);
        throw new Error('NoOriginStorageURL');
    });
    setItem = (key, value, options) => this.setItemByKeys([[key, value]], options).then(values => values[0]);
    getItem = (key, options) => this.getItemByKeys([key], options).then(values => values[0]);
    getItemByKeys = (keys, options) => {
        const { async: mode, logger = true } = options || {};
        let start = this.host.now(), end = 0, call = 0, status = -1;
        const categories = {};
        const report = () => {
            if (logger)
                try {
                    end = end || this.host.now();
                    call = call || end;
                    this.emit('metrics', { name: 'getOriginItemByKeys', metrics: { duration: end - start, callTime: end - call, startCallTime: call, startTime: start, endTime: end }, categories: { status: String(status), ...categories } });
                }
                catch { }
        };
        const describe = (values) => { status = status > -1 ? status : 1; this.describe(keys, values, categories, true); };
        const read = () => {
            const url = this.client.config.url;
            call = this.host.now();
            const remote = () => this.bridges.createBridge(this.client)('storage', 'getItemByKeys', [keys]).then(result => {
                const values = result;
                end = this.host.now();
                status = 2;
                return Promise.all(values.map((value, index) => {
                    if (value.value === undefined) {
                        status = 3;
                        return this.storage.getItem(keys[index]);
                    }
                    return value;
                }));
            });
            const pending = url ? mode !== undefined
                ? Promise.race([remote(), this.delay(mode).then(() => this.storage.getItemByKeys(keys))])
                : firstResolved([remote, () => this.storage.getItemByKeys(keys).then(values => values.map(value => Object.assign(value, { code: 1001 })))])
                : this.storage.getItemByKeys(keys);
            return settle(pending.catch(() => this.storage.getItemByKeys(keys)).then(values => { describe(values); return values; }).catch(error => { status = 0; throw error; }), report);
        };
        return this.getLocalItemWithSignByKeys(keys).then(result => {
            start = result.st;
            end = result.et;
            status = 12;
            describe(result.values);
            report();
            return result.values;
        }).catch(() => read());
    };
    setItemByKeys = (entries, options) => {
        const { async: mode, logger = true } = options || {}, start = this.host.now();
        let end = 0, status = -1, retries = 0, call = 0;
        const categories = {}, state = { end: false, sync: false, resolve: () => { } };
        this.observe(new Promise(resolve => { state.resolve = resolve; }).then(() => {
            if (logger)
                try {
                    end = end || this.host.now();
                    this.emit('metrics', { name: 'setOriginItemByKeys', metrics: { duration: end - start, callTime: end - call, startCallTime: call, startTime: start, endTime: end, retryCount: retries }, categories: { status: String(status), ...categories } });
                }
                catch { }
        }));
        const done = (key) => { state[key] = true; if (state.end && state.sync)
            state.resolve(); };
        const describe = (values) => { status = status > -1 ? status : 1; this.describe(entries.map(entry => entry[0]), values, categories, false); };
        const url = this.client.config.url;
        call = this.host.now();
        const remote = (timeout) => this.bridges.createBridge(this.client, true, timeout)('storage', 'setItemByKeys', [entries]).then(result => {
            status = 2;
            const values = result;
            describe(values);
            end = this.host.now();
            return values;
        });
        const pending = url ? mode !== undefined ? Promise.race([
            settle(remote(30000).catch(error => {
                const first = error, message = `${first?.name}@${first?.message}`;
                retries++;
                return remote().catch(() => { this.emit('log', { name: 'callBridgeSetItemByKeysRetryError', content: JSON.stringify({ iframe: this.client.getIframeState(), errorMessage: message }) }); throw error; });
            }), () => done('sync')),
            this.delay(mode).then(() => this.storage.setItemByKeys(entries)),
        ]) : lastResolved([
            () => Promise.race([this.delay(2500).then(() => [{ value: 'timeout', from: 'timeout', origin: 'timeout' }]), settle(remote(), () => done('sync'))]),
            () => this.storage.setItemByKeys(entries),
        ]) : this.storage.setItemByKeys(entries);
        return settle(pending.catch(() => this.storage.setItemByKeys(entries)).catch(error => { status = 0; throw error; }).then(values => { describe(values); return values; }), () => done('end'));
    };
    removeItem = (key) => this.client.config.url
        ? Promise.all([this.storage.removeItem(key), this.bridges.createBridge(this.client)('storage', 'removeItem', [key])]).then(() => undefined)
        : this.storage.removeItem(key);
    getLocalItemWithSignByKeys = (keys) => {
        if (this.sign?.verify && keys.every(key => signedKeys.includes(key))) {
            const st = this.host.now();
            return this.storage.localDB.getItemByKeys(signedKeys).then(values => this.sign.verify(values).then(valid => {
                if (valid)
                    return keys.map(key => ({ value: values[signedKeys.indexOf(key)], origin: this.host.context.origin, from: 0, code: 304 }));
                throw new Error('VerifySignFail');
            }).then(values => ({ values, st, et: this.host.now() })));
        }
        return Promise.reject(new Error('NotVerifySignFunction'));
    };
    initBirdgeEvent = () => {
        this.client.on('message', event => {
            const envelope = event;
            const { data, origin, type, sourceWindow } = envelope, id = (data || {}).id;
            if (type === 'event') {
                const { eventName, eventData } = data.message || {};
                if (eventName === 'error') {
                    const error = eventData;
                    this.emit('error', Object.assign(this.host.error(error.name, error.message), { origin: error.origin || this.host.context.origin }));
                }
                else if (eventName === 'log')
                    this.emit('log', eventData);
            }
            else {
                const { callObj, callName, callArgs = [] } = data.message || {};
                const reply = (promiseStatus, message) => this.client.postWindowMessage(sourceWindow, 'function', { id, promiseStatus, message }, origin);
                if (['storage', 'storageX', 'client', 'sign', 'config', 'logger'].includes(callObj))
                    try {
                        const object = ['storage', 'config'].includes(callObj) ? this : this[callObj];
                        const method = object[callName];
                        this.observe(method.apply(this, callArgs).then(value => reply('resolve', value)).catch(error => {
                            this.observe(reply('reject', error.name || error.message || 'UnknowMessageError').catch(() => undefined));
                        }));
                    }
                    catch {
                        this.observe(reply('reject', 'UnknowMessageError').catch(() => undefined));
                    }
            }
        });
    };
    connected() { return new Promise(resolve => { if (this.client.isConnection)
        resolve();
    else
        this.client.on('connection', () => resolve()); }); }
    delay(value) { return new Promise(resolve => { this.host.context.setTimeout(resolve, typeof value === 'number' ? value : 1000); }); }
    describe(keys, values, categories, withCode) {
        try {
            values.forEach((value, index) => {
                for (const field of withCode ? ['from', 'origin', 'status', 'code'] : ['from', 'origin', 'status']) {
                    const key = keys[index], parts = key.split('/'), text = String(field === 'status' ? value.value ? 1 : 0 : value[field]);
                    if (!withCode || text !== 'undefined')
                        categories[`${parts[1] || key}_${field}`] = text;
                }
            });
        }
        catch { }
    }
    observe(pending) { void pending.catch(error => { try {
        this.context.onBackgroundError?.(error);
    }
    catch { } }); }
}
function settle(pending, end) {
    return pending.then(value => Promise.resolve(end()).then(() => value), error => Promise.resolve(end()).then(() => { throw error; }));
}
function firstResolved(operations) {
    let result = Promise.reject(new Error('WebStorageRunSerialQueueIfOneResolveError'));
    for (const operation of operations)
        result = result.then(value => { void operation().catch(() => undefined); return value; }).catch(operation);
    return result;
}
function lastResolved(operations) {
    let result = Promise.reject(new Error('WebStorageRunSerialQueueIfOneResolveError'));
    for (const operation of operations)
        result = result.then(value => operation().catch(() => value)).catch(operation);
    return result;
}
//# sourceMappingURL=desktop-web-secure-cross-storage.js.map