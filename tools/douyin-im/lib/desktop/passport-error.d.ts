export declare class PassportRequestError extends Error {
    #private;
    readonly name = "PassportRequestError";
    readonly endpoint: string;
    readonly errorCode: number | undefined;
    constructor(endpoint: string, data: Readonly<Record<string, unknown>>);
    get data(): Record<string, unknown>;
}
//# sourceMappingURL=passport-error.d.ts.map