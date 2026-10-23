import { DesktopWebSecureEvents } from './desktop-web-secure-events.js';
export class DesktopWebSecureMemoryArea {
    values = {};
    get length() { return Object.keys(this.values).length; }
    key(index) { return Object.keys(this.values)[index] ?? null; }
    getItem(key) { return this.values[key] || null; }
    setItem(key, value) { this.values[key] = `${value}`; }
    removeItem(key) { delete this.values[key]; }
    keys() { return Object.keys(this.values); }
}
export function createDesktopWebSecureMemoryStorage(area) {
    const storage = new DesktopWebSecureAreaStorage(() => Promise.resolve(area));
    storage.getKeys = () => Promise.resolve(area).then(memory => memory.keys());
    return storage;
}
export class DesktopWebSecureAreaStorage {
    open;
    constructor(open) {
        this.open = open;
    }
    getItem = (key) => this.getItemByKeys([key]).then(values => values[0]);
    setItem = (key, value) => this.setItemByKeys([[key, value]]).then(values => values[0]);
    getItemByKeys = (keys) => this.open().then(area => keys.map(key => JSON.parse(area.getItem(key) || '{}').data));
    setItemByKeys = (entries) => this.open().then(area => entries.map(([key, value]) => {
        area.setItem(key, JSON.stringify({ data: value }));
        return value;
    }));
    removeItem = (key) => this.open().then(area => { area.removeItem(key); });
    getKeys = () => this.open().then(area => {
        const keys = [];
        for (let index = 0; index < area.length; index++)
            if (area.key(index))
                keys.push(area.key(index));
        return keys;
    });
}
export function createDesktopWebSecureLocalArea(readArea, origin) {
    return new DesktopWebSecureAreaStorage(() => {
        const area = readArea();
        let supported = false;
        if (area)
            try {
                const key = '__x_storage_test__';
                area.setItem(key, key);
                const value = area.getItem(key);
                area.removeItem(key);
                supported = value === key;
            }
            catch { }
        if (supported)
            return Promise.resolve(readArea());
        return Promise.reject(Object.assign(new Error(''), { name: 'LocalStorageNotSupport', origin }));
    });
}
export class DesktopWebSecureLocalStorage extends DesktopWebSecureEvents {
    localDB;
    fallback;
    origin;
    db;
    constructor(localDB, indexed, fallback, origin) {
        super();
        this.localDB = localDB;
        this.fallback = fallback;
        this.origin = origin;
        this.db = Promise.resolve([localDB, indexed]);
    }
    getItem = (key) => this.getItemByKeys([key]).then(values => values[0]);
    setItem = (key, value) => this.setItemByKeys([[key, value]]).then(values => values[0]);
    getItemByKeys = (keys) => {
        let from = -1;
        const observed = [];
        return this.db.then(backends => runSerial(backends.map((backend, index) => () => backend.getItemByKeys(keys).then(values => {
            observed[index] = keys.map((_key, position) => ({ from: values[position] !== undefined ? index : -1, value: values[position], origin: this.origin }));
            return values;
        })), values => {
            for (let i = 0; i < (values?.length ?? 0); i++)
                if (values?.[i] === undefined)
                    return true;
            return false;
        })).catch(() => this.fallback.getItemByKeys(keys).then(values => { from = 2; return values; })).then(values => {
            if (observed[0])
                return observed[0].map((local, index) => {
                    if (local.value !== undefined)
                        return local;
                    const indexed = observed[1]?.[index];
                    return indexed && indexed.value !== undefined ? indexed : local;
                });
            if (observed[1])
                return observed[1];
            return values.map(value => ({ value, from, origin: this.origin }));
        });
    };
    setItemByKeys = (entries) => {
        let from = -1;
        return this.db.then(backends => runFirstResolved(backends.map((backend, index) => () => backend.setItemByKeys(entries).then(values => {
            from = index;
            return values;
        }))).catch(() => { from = 2; return this.fallback.setItemByKeys(entries); })
            .then(values => values.map(value => ({ value, from, origin: this.origin })))).then(values => values, error => {
            throw error;
        });
    };
    removeItem = (key) => this.db.then(backends => Promise.all(backends.map(backend => backend.removeItem(key)))
        .then(() => this.fallback.removeItem(key)));
    getKeys = () => this.db.then(backends => runSerial(backends.map(backend => () => backend.getKeys()), keys => keys === undefined || keys.length === 0));
}
function runSerial(operations, retryResult) {
    let result = Promise.reject(new Error('WebStorageRunSerialQueueError'));
    for (const operation of operations) {
        result = result.then(value => retryResult(value) || value === undefined ? operation() : value).catch(() => operation());
    }
    return result;
}
function runFirstResolved(operations) {
    let result = Promise.reject(new Error('WebStorageRunSerialQueueIfOneResolveError'));
    for (const operation of operations)
        result = result.then(value => { void operation().catch(() => undefined); return value; }).catch(() => operation());
    return result;
}
//# sourceMappingURL=desktop-web-secure-local-storage.js.map