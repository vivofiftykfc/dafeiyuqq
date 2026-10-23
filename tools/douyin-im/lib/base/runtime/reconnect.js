export function reconnectDelay(attempt) {
    return Math.min(1_000 * 2 ** Math.max(0, attempt - 1), 30_000);
}
//# sourceMappingURL=reconnect.js.map