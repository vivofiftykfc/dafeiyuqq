import { type ImFrame } from './frame.js';
export interface FrontierCursor {
    service: number;
    name: string;
    value: string;
}
export interface FrontierCursorStore {
    getFrontierCursors(namespace: string): FrontierCursor[] | undefined;
    setFrontierCursors(namespace: string, cursors: FrontierCursor[]): void;
}
export declare function encodeCursors(cursors: readonly FrontierCursor[]): Buffer;
export declare function decodeCursors(payload: Uint8Array): FrontierCursor[];
export declare class FrontierCursors {
    private readonly deviceId;
    private readonly store?;
    private fileName?;
    private readonly files;
    private seq;
    constructor(deviceId: string, store?: FrontierCursorStore | undefined);
    control(frame: ImFrame): Promise<{
        handled: boolean;
        reply?: Uint8Array;
    }>;
    isDuplicate(frame: ImFrame): boolean;
    commit(frame: ImFrame): void;
    private save;
    private messageCursor;
}
//# sourceMappingURL=frontier-cursors.d.ts.map