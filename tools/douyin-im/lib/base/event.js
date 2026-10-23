export class BaseEvent {
    account;
    time;
    raw;
    constructor(account, raw, time) {
        this.account = account;
        this.raw = raw;
        this.time = normalizeEventTime(time);
    }
}
export function normalizeEventTime(value) {
    const parsed = typeof value === 'string'
        ? (Number.isNaN(Number(value)) ? Date.parse(value) : Number(value))
        : value;
    if (parsed === undefined || !Number.isFinite(parsed) || parsed <= 0) {
        return Math.floor(Date.now() / 1_000);
    }
    return Math.floor(parsed > 10_000_000_000 ? parsed / 1_000 : parsed);
}
//# sourceMappingURL=event.js.map