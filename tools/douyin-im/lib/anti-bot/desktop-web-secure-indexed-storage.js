import { DesktopWebSecureLocalStorage, DesktopWebSecureMemoryArea, createDesktopWebSecureLocalArea, createDesktopWebSecureMemoryStorage, } from './desktop-web-secure-local-storage.js';
export class DesktopWebSecureIndexedStorageHost {
    context;
    databases = {};
    timers = {};
    queue = Promise.resolve();
    attempts = 0;
    memory = new DesktopWebSecureMemoryArea();
    constructor(context) {
        this.context = context;
    }
    createLocalStorage(readArea, config = {}) {
        const storage = new DesktopWebSecureLocalStorage(createDesktopWebSecureLocalArea(readArea, this.context.origin), this.createStorage({ ...config, onQuotaErrorCallback: () => { storage.emit('log', { name: 'QuotaError' }); this.context.onQuotaError?.(); } }), createDesktopWebSecureMemoryStorage(this.memory), this.context.origin);
        return storage;
    }
    createStorage(config = {}) {
        const settings = { dbName: 'secure-store', storeName: 'cryptvalues', closeDBTime: 20000, ...config };
        const open = () => {
            this.context.clearTimeout(this.timers[settings.dbName]);
            this.timers[settings.dbName] = this.context.setTimeout(() => { void this.closeDB(settings.dbName).catch(() => undefined); }, settings.closeDBTime);
            return this.openDB(settings).then(db => {
                if (!db.objectStoreNames.contains(settings.storeName)) {
                    const version = db.version + 1;
                    return this.closeDB(settings.dbName).then(() => this.openDB(settings, version));
                }
                return db;
            });
        };
        const transaction = (operation) => {
            const run = () => operation().then(value => { this.attempts = 0; return value; }).catch(error => {
                if (this.attempts < 3) {
                    this.attempts++;
                    this.databases[settings.dbName] = undefined;
                    const quota = String(error?.name || '').toLowerCase() === 'quotaexceedederror';
                    void Promise.resolve().then(() => {
                        if (quota)
                            settings.onQuotaErrorCallback?.call(storage, name => this.cleanDB(name || settings.dbName));
                    }).catch(error => { try {
                        this.context.onBackgroundError?.(error);
                    }
                    catch { } });
                    return run();
                }
                this.attempts = 0;
                throw error;
            });
            const result = this.queue.then(run);
            this.queue = result;
            return result;
        };
        const storage = {
            getItemByKeys: keys => transaction(() => open().then(db => {
                const store = db.transaction(settings.storeName, 'readonly').objectStore(settings.storeName);
                return Promise.all(keys.map(key => request(store.get(key)).then(value => JSON.parse((value || '{}')).data)));
            })),
            setItemByKeys: entries => transaction(() => open().then(db => {
                const tx = db.transaction(settings.storeName, 'readwrite'), store = tx.objectStore(settings.storeName);
                return Promise.all(entries.map(([key, value]) => {
                    const serialized = JSON.stringify({ data: value });
                    return request(store.get(key)).then(previous => { if (previous !== serialized)
                        store.put(serialized, key); return value; });
                })).then(values => this.transactionComplete(tx).then(() => values));
            })),
            removeItem: key => open().then(db => {
                const tx = db.transaction(settings.storeName, 'readwrite'), deletion = tx.objectStore(settings.storeName).delete(key);
                return this.transactionComplete(tx, deletion);
            }),
            getKeys: () => transaction(() => open().then(db => {
                const cursor = db.transaction(settings.storeName).objectStore(settings.storeName).openKeyCursor();
                return new Promise((resolve, reject) => {
                    const keys = [];
                    cursor.onsuccess = () => { if (cursor.result) {
                        keys.push(cursor.result.key);
                        cursor.result.continue();
                    }
                    else
                        resolve(keys); };
                    cursor.onerror = () => { reject(cursor.error); };
                });
            })),
        };
        return storage;
    }
    closeDB(name) {
        return new Promise((resolve, reject) => {
            const pending = this.databases[name];
            if (!pending) {
                resolve(-1);
                return;
            }
            void pending.then(db => { this.databases[name] = undefined; try {
                db.close();
                resolve(1);
            }
            catch (error) {
                reject(error);
            } }).catch(reject);
        });
    }
    factory() {
        try {
            return this.context.readIndexedDB();
        }
        catch {
            return undefined;
        }
    }
    error(name, message = '') {
        return Object.assign(new Error(message || ''), { name, origin: this.context.origin });
    }
    openDB(config, version) {
        if (version)
            this.databases[config.dbName] = undefined;
        if (!this.factory())
            return Promise.reject(this.error('DBStorageNotSupport'));
        const factory = this.factory();
        const open = (name, requestedVersion) => new Promise((resolve, reject) => {
            const pending = factory.open(name, requestedVersion);
            pending.onsuccess = () => { resolve(pending.result); };
            pending.onerror = event => { event.preventDefault(); reject(this.error(pending.error?.name || 'IndexedDBOpenError', pending.error?.message)); };
            pending.onupgradeneeded = event => { try {
                (pending.result || event.target.result).createObjectStore(config.storeName);
            }
            catch (error) {
                reject(error);
            } };
        });
        if (!this.databases[config.dbName])
            this.databases[config.dbName] = new Promise((resolve, reject) => {
                try {
                    void open(config.dbName, version || config.version || 1).catch(error => {
                        if (String(error?.name || '').toLowerCase() !== 'versionerror')
                            throw error;
                        return this.getDatabaseVersion(config.dbName).then(actual => actual ? open(config.dbName, actual) : open(config.dbName))
                            .catch(() => open(config.dbName));
                    }).then(resolve).catch(reject);
                }
                catch (error) {
                    reject(this.error('DBStorageNotSupport', error.message));
                }
            });
        return this.databases[config.dbName];
    }
    getDatabaseVersion(name) {
        return new Promise((resolve, reject) => {
            const factory = this.factory();
            if (factory?.databases) {
                void factory.databases().then(entries => { resolve(entries.filter(entry => entry.name === name)[0]?.version); }).catch(reject);
                return;
            }
            reject(new Error(`idb.database is ${typeof factory?.databases}`));
        });
    }
    cleanDB(name) {
        const deletion = this.factory()?.deleteDatabase?.(name);
        return new Promise(resolve => {
            if (deletion) {
                deletion.onsuccess = () => { resolve(); };
                deletion.onerror = () => { resolve(); };
            }
            else
                resolve();
        });
    }
    transactionComplete(tx, operation) {
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => { resolve(); };
            tx.onabort = tx.onerror = () => {
                const error = operation ? operation.error || operation.transaction?.error : { name: 'TransactionAbortOrError', message: '' };
                reject(this.error(error?.name || 'TransactionAbortOrError', error?.message));
            };
        });
    }
}
function request(pending) {
    return new Promise((resolve, reject) => { pending.onsuccess = () => { resolve(pending.result); }; pending.onerror = () => { reject(pending.error); }; });
}
//# sourceMappingURL=desktop-web-secure-indexed-storage.js.map