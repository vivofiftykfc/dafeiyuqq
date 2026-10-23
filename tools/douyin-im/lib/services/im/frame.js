import { fileURLToPath } from 'node:url';
import protobuf from 'protobufjs';
import { decompressLz4Payload } from './lz4.js';
const PROTO_PATH = fileURLToPath(new URL('./proto/im.proto', import.meta.url));
let rootPromise;
function loadRoot() {
    if (!rootPromise) {
        rootPromise = protobuf.load(PROTO_PATH);
    }
    return rootPromise;
}
export async function encodeFrame(opts) {
    const root = await loadRoot();
    const Frame = root.lookupType('im_proto.Frame');
    const msg = Frame.create({
        seqid: opts.seqid ?? Date.now(),
        logid: opts.logid ?? Date.now(),
        service: opts.service,
        method: opts.method,
        headers: opts.headers ?? [],
        payloadEncoding: opts.payloadEncoding ?? '',
        payloadType: opts.payloadType ?? 'pb',
        payload: opts.payload ?? new Uint8Array(0),
        logIdNew: opts.logIdNew ?? '',
        serverTiming: opts.serverTiming ?? '',
        msgId: opts.msgId ?? '',
        frameType: opts.frameType ?? 0,
    });
    return Frame.encode(msg).finish();
}
export async function decodeFrame(buffer) {
    const root = await loadRoot();
    const Frame = root.lookupType('im_proto.Frame');
    const decoded = Frame.decode(buffer);
    let payload = decoded.payload ?? new Uint8Array(0);
    if (decoded.payloadEncoding === '__lz4' && payload.length > 0) {
        payload = decompressLz4Payload(payload);
    }
    const toNum = (v) => {
        if (typeof v === 'number')
            return v;
        if (v && typeof v.toNumber === 'function')
            return v.toNumber();
        return 0;
    };
    const toString = (v) => v == null ? '0' : typeof v === 'number' ? String(v) : v.toString?.() ?? '0';
    const frame = {
        seqid: toNum(decoded.seqid),
        logid: toNum(decoded.logid),
        seqidString: toString(decoded.seqid),
        logidString: toString(decoded.logid),
        service: decoded.service ?? 0,
        method: decoded.method ?? 0,
        headers: (decoded.headers ?? []).map((h) => ({
            key: h.key ?? '',
            value: h.value ?? '',
        })),
        payload,
    };
    if (decoded.payloadEncoding)
        frame.payloadEncoding = decoded.payloadEncoding;
    if (decoded.payloadType)
        frame.payloadType = decoded.payloadType;
    if (decoded.logIdNew)
        frame.logIdNew = decoded.logIdNew;
    if (decoded.serverTiming)
        frame.serverTiming = decoded.serverTiming;
    if (decoded.msgId)
        frame.msgId = decoded.msgId;
    if (decoded.frameType != null)
        frame.frameType = decoded.frameType;
    return frame;
}
export function frameHeader(frame, key) {
    return frame.headers.find((header) => header.key === key)?.value;
}
export async function encodeFrontierAck(frame) {
    if (frameHeader(frame, 'need_ack') !== '1' || frameHeader(frame, 'is_ack') === '1') {
        return undefined;
    }
    return encodeFrame({
        seqid: frame.seqidString,
        logid: frame.logidString,
        service: frame.service,
        method: frame.method,
        headers: [
            { key: 'is_ack', value: '1' },
            { key: 'ack_id', value: frame.logIdNew ?? '' },
            { key: 'ack_code', value: '0' },
        ],
        payloadType: '',
        logIdNew: frame.logIdNew ?? '',
    });
}
//# sourceMappingURL=frame.js.map