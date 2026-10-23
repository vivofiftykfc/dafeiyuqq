import type { ImFrame } from './frame.js';
export type WsEventKind = 'open' | 'close' | 'text' | 'frame' | 'protobuf' | 'decode_error' | 'ignored' | 'ack';
export interface WsLogEvent {
    kind: WsEventKind;
    at: number;
    text?: string;
    frame?: ImFrame;
    response?: Record<string, unknown>;
    error?: string;
    note?: string;
}
export declare function cmdLabel(cmd: number): string;
export declare function summarizeResponseBody(body: Record<string, unknown> | null | undefined): Record<string, unknown>;
export declare function formatWsLogEvent(ev: WsLogEvent): string;
//# sourceMappingURL=ws-log.d.ts.map