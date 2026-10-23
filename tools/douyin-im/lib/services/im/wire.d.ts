export type WireField = {
    field: number;
    type: 'varint';
    value: bigint;
} | {
    field: number;
    type: 'fixed64';
    value: Uint8Array;
} | {
    field: number;
    type: 'fixed32';
    value: Uint8Array;
} | {
    field: number;
    type: 'string';
    value: string;
} | {
    field: number;
    type: 'message';
    value: WireField[];
} | {
    field: number;
    type: 'bytes';
    value: Uint8Array;
};
export interface WireTreeField {
    f: number;
    t: WireField['type'];
    v: string | WireTreeField[];
}
export declare function decodeWire(data: Uint8Array, depth?: number): WireField[];
export declare function decodeWireTree(data: Uint8Array): WireTreeField[];
//# sourceMappingURL=wire.d.ts.map