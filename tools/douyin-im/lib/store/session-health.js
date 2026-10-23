export function parseSidGuardTtl(cookies) {
    const match = cookies.match(/sid_guard=([^;]+)/);
    if (!match)
        return undefined;
    const decoded = decodeURIComponent(match[1]);
    const parts = decoded.split('|');
    if (parts.length < 3)
        return undefined;
    const issuedAt = parseInt(parts[1], 10);
    const ttlSec = parseInt(parts[2], 10);
    if (isNaN(issuedAt) || isNaN(ttlSec))
        return undefined;
    const expiresAt = issuedAt + ttlSec;
    return expiresAt - Math.floor(Date.now() / 1000);
}
export function checkSessionHealth(account) {
    const remaining = parseSidGuardTtl(account.session.cookies);
    const expired = remaining !== undefined && remaining <= 0;
    const result = { expired };
    if (remaining !== undefined)
        result.remainingSec = remaining;
    return result;
}
//# sourceMappingURL=session-health.js.map