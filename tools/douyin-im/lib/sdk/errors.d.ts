import type { SendMessageResponse } from '../services/im/types.js';
export declare class SendMessageError extends Error {
    readonly response: SendMessageResponse;
    readonly statusCode: number;
    readonly checkCode?: number;
    constructor(response: SendMessageResponse);
}
export declare function toError(value: unknown): Error;
//# sourceMappingURL=errors.d.ts.map