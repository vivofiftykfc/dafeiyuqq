export declare class CookieJar {
    private readonly store;
    constructor(initial?: string);
    get(name: string): string | undefined;
    has(name: string): boolean;
    set(name: string, value: string): void;
    delete(name: string): void;
    merge(raw: string): void;
    toHeader(): string;
    mergeSetCookie(raw: string, now?: number): void;
}
//# sourceMappingURL=cookie-jar.d.ts.map