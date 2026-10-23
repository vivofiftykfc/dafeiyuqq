import type { HttpResponse } from './types.js';
export type ResponseFailureKind = 'captcha' | 'passport-verification' | 'challenge' | 'empty' | 'invalid-json' | 'http';
export declare class DouyinResponseError extends Error {
    readonly kind: ResponseFailureKind;
    readonly status: number;
    readonly name = "DouyinResponseError";
    readonly endpoint: string;
    readonly logId: string | undefined;
    readonly guardResult: string | undefined;
    readonly hasGuardServerData: boolean;
    readonly contentType: string | undefined;
    readonly contentLength: string | undefined;
    constructor(kind: ResponseFailureKind, status: number, url: string, headers: Headers);
}
export declare function parseJsonResponse<T>(response: HttpResponse<string>, url: string, options?: {
    preserveLargeIntegers?: boolean;
}): T;
//# sourceMappingURL=response.d.ts.map