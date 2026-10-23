import { DesktopWebSecureLocalStorage, type DesktopWebStorageArea, type DesktopWebStorageBackend } from './desktop-web-secure-local-storage.js';
interface StorageError {
    name?: string;
    message?: string;
}
interface RequestEvent {
    preventDefault(): void;
    target: {
        result: DesktopWebIdbDatabase;
    };
}
export interface DesktopWebIdbRequest<T = unknown> {
    result: T;
    error: StorageError | null;
    transaction?: {
        error: StorageError | null;
    } | null;
    onsuccess: (() => void) | null;
    onerror: ((event: RequestEvent) => void) | null;
}
export interface DesktopWebIdbOpenRequest extends DesktopWebIdbRequest<DesktopWebIdbDatabase> {
    onupgradeneeded: ((event: RequestEvent) => void) | null;
}
export interface DesktopWebIdbStore {
    get(key: string): DesktopWebIdbRequest;
    put(value: string, key: string): unknown;
    delete(key: string): DesktopWebIdbRequest;
    openKeyCursor(): DesktopWebIdbRequest<{
        key: unknown;
        continue(): void;
    } | null>;
}
export interface DesktopWebIdbTransaction {
    objectStore(name: string): DesktopWebIdbStore;
    oncomplete: (() => void) | null;
    onabort: (() => void) | null;
    onerror: (() => void) | null;
}
export interface DesktopWebIdbDatabase {
    version: number;
    objectStoreNames: {
        contains(name: string): boolean;
    };
    createObjectStore(name: string): unknown;
    transaction(name: string, mode?: 'readonly' | 'readwrite'): DesktopWebIdbTransaction;
    close(): void;
}
export interface DesktopWebIdbFactory {
    open(name: string, version?: number): DesktopWebIdbOpenRequest;
    databases?: () => Promise<Array<{
        name?: string;
        version?: number;
    }>>;
    deleteDatabase?: (name: string) => DesktopWebIdbRequest | undefined;
}
export interface DesktopWebIdbContext {
    readIndexedDB(): DesktopWebIdbFactory | undefined;
    origin: string;
    setTimeout(callback: () => void, delay: number): unknown;
    clearTimeout(handle: unknown): void;
    onQuotaError?: () => void;
    onBackgroundError?: (error: unknown) => void;
}
export interface DesktopWebIdbConfig {
    dbName?: string;
    storeName?: string;
    closeDBTime?: number;
    version?: number;
    onQuotaErrorCallback?: (clean: (name?: string) => Promise<void>) => void;
}
export declare class DesktopWebSecureIndexedStorageHost {
    private readonly context;
    private readonly databases;
    private readonly timers;
    private queue;
    private attempts;
    private readonly memory;
    constructor(context: DesktopWebIdbContext);
    createLocalStorage(readArea: () => DesktopWebStorageArea | undefined, config?: DesktopWebIdbConfig): DesktopWebSecureLocalStorage;
    createStorage(config?: DesktopWebIdbConfig): DesktopWebStorageBackend;
    closeDB(name: string): Promise<number>;
    private factory;
    private error;
    private openDB;
    private getDatabaseVersion;
    private cleanDB;
    private transactionComplete;
}
export {};
//# sourceMappingURL=desktop-web-secure-indexed-storage.d.ts.map