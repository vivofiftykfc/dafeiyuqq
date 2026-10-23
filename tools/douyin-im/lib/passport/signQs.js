import crypto from 'crypto';
export const DESKTOP_PASSPORT_APP_KEY = '3c452fb664e3de0e936108429a0bc697';
export function passportNoonUtcTs(now = new Date()) {
    return String(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0, 0) / 1_000);
}
export function buildPassportAidSign(input) {
    const key = derivePassportAidSignKey(Buffer.from(input.ts), Buffer.from(input.appKey ?? DESKTOP_PASSPORT_APP_KEY));
    return crypto
        .createHmac('sha256', key)
        .update(`aid=${input.aid}&path=${input.path}&ts=${input.ts}`)
        .digest('hex');
}
function derivePassportAidSignKey(salt, ikm) {
    const extractSalt = salt.length > 0 ? salt : Buffer.alloc(32);
    const prk = crypto.createHmac('sha256', extractSalt).update(ikm).digest();
    return crypto.createHmac('sha256', prk).update(Buffer.from([1])).digest();
}
function sortedParamString(obj, keepFirstN) {
    let keys = Object.keys(obj).sort();
    if (keepFirstN !== undefined && keepFirstN >= 0) {
        keys = keys.slice(0, keepFirstN);
    }
    const str = keys
        .map((k) => {
        const v = obj[k];
        const val = typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v);
        return `${k}=${val}`;
    })
        .join('&');
    return { str, keys };
}
function encodeQsKeyNames(keyNames) {
    const input = keyNames.join(',');
    const out = [];
    for (let i = 0; i < input.length; i++) {
        const cp = input.charCodeAt(i);
        const bytes = [];
        if (cp >= 0 && cp <= 0x7f) {
            bytes.push(cp);
        }
        else if (cp >= 0x80 && cp <= 0x7ff) {
            bytes.push(0xc0 | (31 & (cp >> 6)), 0x80 | (63 & cp));
        }
        else if ((cp >= 0x800 && cp <= 0xd7ff) ||
            (cp >= 0xe000 && cp <= 0xffff)) {
            bytes.push(0xe0 | (15 & (cp >> 12)), 0x80 | (63 & (cp >> 6)), 0x80 | (63 & cp));
        }
        for (const b of bytes) {
            out.push((5 ^ b).toString(16));
        }
    }
    return out.join('');
}
export function buildPassportSignQs(input) {
    const appKey = input.appKey ?? DESKTOP_PASSPORT_APP_KEY;
    const body = input.body ?? {};
    const { str: queryStr, keys } = sortedParamString(input.query, 10);
    const { str: bodyStr } = sortedParamString(body);
    const payload = `${queryStr}&${bodyStr}&app_key=${appKey}`;
    const sign = crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
    const qs = encodeQsKeyNames(keys);
    return { sign, qs };
}
export function parseFormBodyForSign(body) {
    const out = {};
    if (!body)
        return out;
    for (const part of body.split('&')) {
        const eq = part.indexOf('=');
        if (eq === -1) {
            out[decodeURIComponent(part)] = '';
        }
        else {
            out[decodeURIComponent(part.slice(0, eq))] = decodeURIComponent(part.slice(eq + 1));
        }
    }
    return out;
}
//# sourceMappingURL=signQs.js.map