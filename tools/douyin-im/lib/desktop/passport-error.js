export class PassportRequestError extends Error {
    name = 'PassportRequestError';
    endpoint;
    errorCode;
    #data;
    constructor(endpoint, data) {
        const path = new URL(endpoint, 'https://imdesktop.douyin.com').pathname;
        const code = typeof data['error_code'] === 'number' && Number.isSafeInteger(data['error_code'])
            ? data['error_code'] : undefined;
        super(`Passport 未返回 success: ${path} (code=${code ?? 'unknown'})`);
        this.endpoint = path;
        this.errorCode = code;
        this.#data = structuredClone(data);
    }
    get data() { return structuredClone(this.#data); }
}
//# sourceMappingURL=passport-error.js.map