import { DesktopWebSecureEvents } from './desktop-web-secure-events.js';
export interface DesktopWebStorageBackend {
    getItemByKeys(keys: string[]): Promise<unknown[]>;
    setItemByKeys(entries: Array<[string, unknown]>): Promise<unknown[]>;
    removeItem(key: string): Promise<unknown>;
    getKeys(): Promise<unknown[]>;
}
export interface DesktopWebStorageValue {
    value: unknown;
    from: number;
    origin: string;
}
export interface DesktopWebStorageArea {
    readonly length: number;
    key(index: number): string | null;
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}
export declare class DesktopWebSecureMemoryArea implements DesktopWebStorageArea {
    private readonly values;
    get length(): number;
    key(index: number): string | null;
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    keys(): string[];
}
export declare function createDesktopWebSecureMemoryStorage(area: DesktopWebSecureMemoryArea): DesktopWebSecureAreaStorage;
export declare class DesktopWebSecureAreaStorage implements DesktopWebStorageBackend {
    private readonly open;
    constructor(open: () => Promise<DesktopWebStorageArea>);
    getItem: (key: string) => Promise<unknown>;
    setItem: (key: string, value: unknown) => Promise<unknown>;
    getItemByKeys: (keys: string[]) => Promise<unknown[]>;
    setItemByKeys: (entries: Array<[string, unknown]>) => Promise<unknown[]>;
    removeItem: (key: string) => Promise<void>;
    getKeys: () => Promise<string[]>;
}
export declare function createDesktopWebSecureLocalArea(readArea: () => DesktopWebStorageArea | undefined, origin: string): DesktopWebSecureAreaStorage;
export declare class DesktopWebSecureLocalStorage extends DesktopWebSecureEvents {
    readonly localDB: DesktopWebStorageBackend;
    private readonly fallback;
    private readonly origin;
    private readonly db;
    constructor(localDB: DesktopWebStorageBackend, indexed: DesktopWebStorageBackend, fallback: DesktopWebStorageBackend, origin: string);
    getItem: (key: string) => Promise<DesktopWebStorageValue | undefined>;
    setItem: (key: string, value: unknown) => Promise<DesktopWebStorageValue | undefined>;
    getItemByKeys: (keys: string[]) => Promise<DesktopWebStorageValue[]>;
    setItemByKeys: (entries: Array<[string, unknown]>) => Promise<DesktopWebStorageValue[]>;
    removeItem: (key: string) => Promise<unknown>;
    getKeys: () => Promise<unknown[]>;
}
//# sourceMappingURL=desktop-web-secure-local-storage.d.ts.map