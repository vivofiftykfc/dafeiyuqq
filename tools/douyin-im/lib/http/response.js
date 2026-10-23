import { parseLosslessJson } from './lossless-json.js';
export class DouyinResponseError extends Error {
    kind;
    status;
    name = 'DouyinResponseError';
    endpoint;
    logId;
    guardResult;
    hasGuardServerData;
    contentType;
    contentLength;
    constructor(kind, status, url, headers) {
        const endpoint = new URL(url).pathname;
        const logId = headers.get('x-tt-logid') ?? undefined;
        const guardResult = headers.get('bd-ticket-guard-result') ?? undefined;
        const hasGuardServerData = headers.has('bd-ticket-guard-server-data');
        const contentType = headers.get('content-type') ?? undefined;
        const contentLength = headers.get('content-length') ?? undefined;
        const diagnostics = [
            logId ? `logid=${logId}` : '',
            guardResult ? `guard=${guardResult}` : '',
            hasGuardServerData ? 'guard-data=yes' : '',
            contentType ? `content-type=${contentType}` : '',
            contentLength ? `content-length=${contentLength}` : '',
        ].filter(Boolean).join(' ');
        super(`Douyin ${kind}: HTTP ${status} ${endpoint}${diagnostics ? ` (${diagnostics})` : ''}`);
        this.kind = kind;
        this.status = status;
        this.endpoint = endpoint;
        this.logId = logId;
        this.guardResult = guardResult;
        this.hasGuardServerData = hasGuardServerData;
        this.contentType = contentType;
        this.contentLength = contentLength;
    }
}
export function parseJsonResponse(response, url, options = {}) {
    const { status, headers, rawText, ok } = response;
    const fail = (kind) => {
        throw new DouyinResponseError(kind, status, url, headers);
    };
    if (!ok)
        return fail('http');
    let decoded;
    try {
        decoded = options.preserveLargeIntegers ? parseLosslessJson(rawText) : JSON.parse(rawText);
    }
    catch {
        if (headers.get('x-vc-bdturing-parameters'))
            return fail('captcha');
        if (headers.get('x-tt-verify-passport-decision'))
            return fail('passport-verification');
        if (/__ac_nonce|_\$jsvmprt/.test(rawText))
            return fail('challenge');
        return fail(rawText.trim() ? 'invalid-json' : 'empty');
    }
    if (decoded === null || typeof decoded !== 'object')
        return fail('invalid-json');
    return decoded;
}
//# sourceMappingURL=response.js.map