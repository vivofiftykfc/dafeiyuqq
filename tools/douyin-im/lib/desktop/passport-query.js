import { generateABogus, generateDesktopABogus, generateJumpbyteABogus, } from '../anti-bot/aBogus.js';
import { buildPassportSignQs } from '../passport/signQs.js';
export function randomBizTraceId() {
    let timestamp = Date.now();
    let monotonic = typeof performance !== 'undefined' && performance.now ? 1000 * performance.now() : 0;
    return 'xxxxxxxx'.replace(/x/g, () => {
        let digit = 16 * Math.random();
        if (timestamp > 0) {
            digit = (timestamp + digit) % 16 | 0;
            timestamp = Math.floor(timestamp / 16);
        }
        else {
            digit = (monotonic + digit) % 16 | 0;
            monotonic = Math.floor(monotonic / 16);
        }
        return digit.toString(16);
    });
}
export function signPassportQuery(baseQuery, body = {}, extras) {
    const signInput = {
        query: baseQuery,
        body,
    };
    if (extras?.appKey)
        signInput.appKey = extras.appKey;
    const { sign, qs } = buildPassportSignQs(signInput);
    return finishPassportQuery({ ...baseQuery, sign, qs }, extras);
}
export function resumePassportQuery(signedQuery, fp, extras) {
    const query = { ...signedQuery, ...(fp ? { fp, verifyFp: fp } : {}) };
    delete query['isResend'];
    return finishPassportQuery(query, extras);
}
function finishPassportQuery(signedQuery, extras) {
    const query = { ...signedQuery };
    if (extras?.msToken) {
        query['msToken'] = extras.msToken;
    }
    const manualAbogus = extras?.aBogus;
    const compute = !manualAbogus &&
        extras?.enableABogus !== false &&
        Boolean(extras?.userAgent);
    if (manualAbogus) {
        query['a_bogus'] = manualAbogus;
    }
    else if (compute) {
        const queryForAbogus = new URLSearchParams(encodePassportQuery(query)).toString();
        const abOpts = {
            userAgent: extras.userAgent,
            query: queryForAbogus,
            body: extras?.bodyWire ?? '',
        };
        if (extras?.screenFingerprint) {
            abOpts.screenFingerprint = extras.screenFingerprint;
        }
        if (extras?.bdmsPreset) {
            abOpts.bdmsPreset = extras.bdmsPreset;
        }
        query['a_bogus'] = extras?.desktopBdmsState
            ? generateDesktopABogus({
                ...extras.desktopBdmsState,
                userAgent: abOpts.userAgent,
                query: abOpts.query,
                body: abOpts.body ?? '',
            })
            : extras?.aBogusVariant === 'jumpbyte-desktop'
                ? generateJumpbyteABogus({
                    userAgent: abOpts.userAgent,
                    query: abOpts.query,
                    body: abOpts.body ?? '',
                })
                : generateABogus(abOpts);
    }
    const search = compute ? new URLSearchParams(query).toString() : encodePassportQuery(query);
    return { query, search };
}
function encodePassportQuery(query) {
    const encode = (value) => encodeURIComponent(value)
        .replace(/%3A/gi, ':')
        .replace(/%24/g, '$')
        .replace(/%2C/gi, ',')
        .replace(/%20/g, '+')
        .replace(/%5B/gi, '[')
        .replace(/%5D/gi, ']');
    return Object.entries(query).map(([key, value]) => `${encode(key)}=${encode(value)}`).join('&');
}
export function encodeFormBody(body) {
    return Object.keys(body)
        .map((key) => {
        const value = body[key] ?? '';
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
        .join('&');
}
//# sourceMappingURL=passport-query.js.map