export interface ReconnectEvent {
    attempt: number;
    delayMs: number;
    code?: number;
    reason?: string;
}
export declare function reconnectDelay(attempt: number): number;
//# sourceMappingURL=reconnect.d.ts.map