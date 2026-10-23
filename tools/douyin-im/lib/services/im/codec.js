import { fileURLToPath } from 'node:url';
import protobuf from 'protobufjs';
import { DESKTOP_IM_PROFILE } from './desktop.js';
const PROTO_PATH = fileURLToPath(new URL('./proto/im.proto', import.meta.url));
const SDK_VERSION = DESKTOP_IM_PROFILE.version;
const BUILD_NUMBER = DESKTOP_IM_PROFILE.buildNumber;
let rootPromise;
function loadRoot() {
    if (!rootPromise) {
        rootPromise = protobuf.load(PROTO_PATH);
    }
    return rootPromise;
}
function assertKnownMessageFields(type, value, path) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return;
    for (const [key, child] of Object.entries(value)) {
        const field = type.fields[key];
        if (!field)
            throw new Error(`unknown protobuf field: ${path}.${key}`);
        if (!(field.resolvedType instanceof protobuf.Type))
            continue;
        if (field.map) {
            if (!child || typeof child !== 'object' || Array.isArray(child))
                continue;
            for (const [mapKey, mapValue] of Object.entries(child)) {
                assertKnownMessageFields(field.resolvedType, mapValue, `${path}.${key}[${mapKey}]`);
            }
            continue;
        }
        const children = field.repeated && Array.isArray(child) ? child : [child];
        children.forEach((item, index) => {
            const childPath = field.repeated ? `${path}.${key}[${index}]` : `${path}.${key}`;
            assertKnownMessageFields(field.resolvedType, item, childPath);
        });
    }
}
let sequenceCounter = 0;
export async function encodeRequest(opts) {
    const root = await loadRoot();
    const RequestEnvelope = root.lookupType('im_proto.Request');
    sequenceCounter += 1;
    const access = opts.access ?? DESKTOP_IM_PROFILE.access;
    const envelope = {
        cmd: opts.cmd,
        sequenceId: opts.sequenceId ?? sequenceCounter,
        sdkVersion: opts.sdkVersion ?? SDK_VERSION,
        token: opts.token,
        refer: opts.refer ?? 3,
        inboxType: opts.inboxType ?? 1,
        buildNumber: opts.buildNumber ?? BUILD_NUMBER,
        deviceId: opts.deviceId ?? '',
        devicePlatform: opts.devicePlatform ?? (process.platform === 'win32' ? 'windows' : 'mac'),
        versionCode: opts.versionCode ?? '',
        headers: opts.headers ?? {},
        authType: opts.authType ?? 1,
        biz: opts.biz ?? DESKTOP_IM_PROFILE.biz,
        access,
    };
    if (opts.body) {
        assertKnownMessageFields(root.lookupType('im_proto.RequestBody'), opts.body, 'Request.body');
        envelope['body'] = opts.body;
    }
    const errMsg = RequestEnvelope.verify(envelope);
    if (errMsg) {
        throw new Error(`protobuf verify failed: ${errMsg}`);
    }
    const message = RequestEnvelope.create(envelope);
    return RequestEnvelope.encode(message).finish();
}
export async function decodeResponse(buffer) {
    const root = await loadRoot();
    const ResponseEnvelope = root.lookupType('im_proto.Response');
    const decoded = ResponseEnvelope.decode(buffer);
    const seqId = decoded.sequenceId;
    let sequenceId = 0;
    if (typeof seqId === 'number') {
        sequenceId = seqId;
    }
    else if (seqId && typeof seqId.toNumber === 'function') {
        sequenceId = seqId.toNumber();
    }
    return {
        cmd: decoded.cmd ?? 0,
        sequenceId,
        statusCode: decoded.statusCode ?? 0,
        errorDesc: decoded.errorDesc ?? '',
        inboxType: decoded.inboxType ?? 0,
        body: decoded.body ?? null,
        logId: decoded.logId ?? '',
    };
}
export async function decodeRequestRaw(buffer) {
    const root = await loadRoot();
    const RequestEnvelope = root.lookupType('im_proto.Request');
    const decoded = RequestEnvelope.decode(buffer);
    return RequestEnvelope.toObject(decoded, {
        longs: String,
        enums: String,
        defaults: false,
    });
}
export async function decodeResponseRaw(buffer) {
    const root = await loadRoot();
    const ResponseEnvelope = root.lookupType('im_proto.Response');
    const decoded = ResponseEnvelope.decode(buffer);
    return ResponseEnvelope.toObject(decoded, {
        longs: String,
        enums: Number,
        defaults: false,
    });
}
//# sourceMappingURL=codec.js.map