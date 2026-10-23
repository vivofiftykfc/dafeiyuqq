export interface ImFrame {
    seqid: number;
    logid: number;
    seqidString: string;
    logidString: string;
    service: number;
    method: number;
    headers: {
        key: string;
        value: string;
    }[];
    payloadEncoding?: string;
    payloadType?: string;
    payload: Uint8Array;
    logIdNew?: string;
    serverTiming?: string;
    msgId?: string;
    frameType?: number;
}
export declare function encodeFrame(opts: {
    service: number;
    method: number;
    payload?: Uint8Array;
    seqid?: number | string;
    logid?: number | string;
    headers?: {
        key: string;
        value: string;
    }[];
    payloadEncoding?: string;
    payloadType?: string;
    logIdNew?: string;
    serverTiming?: string;
    msgId?: string;
    frameType?: number;
}): Promise<Uint8Array>;
export declare function decodeFrame(buffer: Uint8Array): Promise<ImFrame>;
export declare function frameHeader(frame: Pick<ImFrame, 'headers'>, key: string): string | undefined;
export declare function encodeFrontierAck(frame: ImFrame): Promise<Uint8Array | undefined>;
//# sourceMappingURL=frame.d.ts.map