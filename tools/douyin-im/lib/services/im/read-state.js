import protobuf from 'protobufjs';
import { desktopCookieProtoOptions } from './desktop.js';
export function equalConversationReadSummaries(left, right) {
    if (left.conversationId !== right.conversationId || left.conversationShortId !== right.conversationShortId ||
        left.conversationType !== right.conversationType || left.clientMessageId !== right.clientMessageId ||
        left.serverMessageId !== right.serverMessageId || left.createTime !== right.createTime || left.isAllRead !== right.isAllRead ||
        left.readUsers.length !== right.readUsers.length)
        return false;
    const sorted = (rows) => [...rows].sort((a, b) => BigInt(a.uid) > BigInt(b.uid) ? -1 : BigInt(a.uid) < BigInt(b.uid) ? 1 : 0);
    const a = sorted(left.readUsers), b = sorted(right.readUsers);
    return a.every((row, i) => row.uid === b[i].uid && row.secUid === b[i].secUid &&
        row.readIndex === b[i].readIndex && row.minIndex === b[i].minIndex);
}
export function selectLastSentMessage(messages, conversationId, selfUid) {
    let selected;
    for (const message of messages) {
        if (message.threadId !== conversationId || message.senderUid !== selfUid || message.status !== 0 ||
            message.deleted || message.ext?.['s:is_recalled'] === 'true' || [1, 1001, 1002, 1010].includes(message.msgType))
            continue;
        if (!Number.isSafeInteger(message.createTime))
            throw new Error('cached message createTime is not an exact integer');
        const order = BigInt(int64(message.orderIndex ?? message.orderInConversation ?? '0'));
        const previousOrder = selected && BigInt(int64(selected.orderIndex ?? selected.orderInConversation ?? '0'));
        if (!selected || order > previousOrder || (order === previousOrder && message.createTime > selected.createTime))
            selected = message;
    }
    return selected;
}
export function calculateConversationReadSummary(conversationId, message, selfUid, participants, cursors) {
    validateStoredReadCursors(cursors);
    if (!Number.isSafeInteger(message.createTime))
        throw new Error('cached message createTime is not an exact integer');
    const index = BigInt(int64(message.indexInConversation ?? '0'));
    const members = new Map(participants.map(member => [member.uid, member]));
    const readUsers = [];
    let eligible = 0;
    for (const cursor of cursors) {
        const member = members.get(cursor.uid);
        if (!member || cursor.uid === selfUid)
            continue;
        const minimum = BigInt(cursor.minIndex);
        if (BigInt.asIntN(64, minimum < 0n ? -minimum : minimum) > index)
            continue;
        eligible++;
        const visible = message.ext?.['s:visible'];
        const invisible = visible ? !visible.split(',').includes(cursor.uid) : !!message.ext?.['s:invisible']?.split(',').includes(cursor.uid);
        if (index <= BigInt(cursor.readIndex) && !invisible) {
            readUsers.push({ uid: cursor.uid, readIndex: cursor.readIndex, minIndex: cursor.minIndex, secUid: member.secUid ?? '' });
        }
    }
    return { conversationId, conversationShortId: message.conversationShortId ?? '0', conversationType: message.conversationType ?? 0,
        clientMessageId: message.ext?.['s:client_message_id'] ?? '', serverMessageId: message.msgId, createTime: String(message.createTime),
        readUsers, isAllRead: readUsers.length > 0 && readUsers.length === eligible };
}
export function validateStoredReadCursors(rows) {
    for (const row of rows) {
        int64(row.uid, true);
        int64(row.readIndex);
        int64(row.minIndex);
    }
}
export function mergeReadCursorState(current, response) {
    const rows = new Map(current.map(row => [row.uid, { ...row }]));
    for (const row of response.readIndexes) {
        const previous = rows.get(row.uid) ?? { uid: row.uid, readIndex: '0', minIndex: '0' };
        rows.set(row.uid, { ...previous, readIndex: row.index ?? '0' });
    }
    for (const row of response.minIndexes) {
        const previous = rows.get(row.uid) ?? { uid: row.uid, readIndex: '0', minIndex: '0' };
        rows.set(row.uid, { ...previous, minIndex: row.index ?? '0' });
    }
    const result = [...rows.values()];
    validateStoredReadCursors(result);
    return result;
}
export function readIndexFromP2PContent(content) {
    try {
        const original = JSON.parse(content);
        const canonical = JSON.stringify(original);
        let prefix = '__desktop_integer__';
        while (canonical.includes(prefix))
            prefix += '_';
        const data = JSON.parse(content.replace(/"(?:\\.|[^"\\])*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/g, token => /^-?\d+$/.test(token) ? JSON.stringify(prefix + token) : token), (_key, value) => typeof value === 'string' && value.startsWith(prefix) ? BigInt(value.slice(prefix.length)) : value);
        const payload = record(data);
        const sender = payload['P2PSender'];
        if (typeof sender !== 'bigint' || sender <= 0n || sender > MAX_I64)
            return undefined;
        const rawIndex = payload['P2PSenderReadIndex'];
        const index = typeof rawIndex === 'bigint' && rawIndex >= MIN_I64 && rawIndex <= MAX_I64 ? rawIndex : 0n;
        return { uid: sender.toString(), index: index.toString() };
    }
    catch {
        return undefined;
    }
}
const LONG = protobuf.util.Long;
const MAX_I64 = 9223372036854775807n;
const MIN_I64 = -9223372036854775808n;
function int64(value, positive = false) {
    if (typeof value !== 'string' || !/^(0|-?[1-9]\d*)$/.test(value))
        throw new Error('invalid int64');
    const n = BigInt(value);
    if (n < MIN_I64 || n > MAX_I64 || (positive && n <= 0n))
        throw new Error('invalid int64 range');
    return value;
}
function record(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('invalid body');
    return value;
}
function address(options) {
    if (typeof options.threadId !== 'string' || !options.threadId || ![1, 2].includes(options.conversationType)) {
        throw new Error('读游标查询需要有效的会话地址');
    }
    return { conversationId: options.threadId,
        conversationShortId: LONG.fromString(int64(options.conversationShortId, true)),
        conversationType: options.conversationType };
}
function cursors(value, includeMin) {
    if (value === undefined)
        return [];
    if (!Array.isArray(value))
        throw new Error('invalid indexes');
    const seen = new Set();
    return value.map(item => {
        const raw = record(item);
        const uid = int64(raw['userId'], true);
        if (seen.has(uid))
            throw new Error('duplicate participant');
        seen.add(uid);
        const row = { uid };
        if (raw['secUid'] !== undefined) {
            if (typeof raw['secUid'] !== 'string')
                throw new Error('invalid secUid');
            row.secUid = raw['secUid'];
        }
        if (raw['index'] !== undefined)
            row.index = int64(raw['index']);
        if (raw['indexV2'] !== undefined)
            row.indexV2 = int64(raw['indexV2']);
        if (includeMin && raw['indexMin'] !== undefined)
            row.minIndex = int64(raw['indexMin']);
        return row;
    });
}
function envelope(decoded) {
    return { statusCode: Number(decoded['statusCode'] ?? 0), statusMsg: String(decoded['errorDesc'] ?? '') };
}
export class ImReadStateApi {
    transport;
    deviceId;
    constructor(transport, deviceId) {
        this.transport = transport;
        this.deviceId = deviceId;
    }
    getReadIndexes(options) {
        return this.query(options, 2000, 'participantsReadIndexBody', '/v3/conversation/get_read_index');
    }
    getMinIndexes(options) {
        return this.query(options, 2001, 'participantsMinIndexBody', '/v3/conversation/get_min_index');
    }
    async getState(options) {
        const [read, min] = await Promise.all([this.getReadIndexes(options), this.getMinIndexes(options)]);
        if (read.statusCode !== 0 || min.statusCode !== 0) {
            const failure = read.statusCode !== 0 ? read : min;
            return { statusCode: failure.statusCode, statusMsg: failure.statusMsg, readIndexes: [], minIndexes: [] };
        }
        return { statusCode: 0, statusMsg: '', readIndexes: read.indexes, minIndexes: min.indexes };
    }
    async getBatchReadIndexes(options) {
        const requested = new Map();
        for (const item of options) {
            address(item);
            const prior = requested.get(item.threadId);
            if (prior && (prior.conversationShortId !== item.conversationShortId || prior.conversationType !== item.conversationType)) {
                throw new Error('同一会话存在冲突的读游标地址');
            }
            requested.set(item.threadId, { ...item });
        }
        const all = [...requested.values()];
        if (!all.length)
            return { statusCode: 0, statusMsg: '', conversations: [], missingConversationIds: [] };
        const decoded = await this.transport.sendCookieProto(2038, 1, '/v1/conversation/batch_get_conversation_participants_readindex', {
            batchGetConversationParticipantsReadindex: {
                conversationId: all.map(item => item.threadId),
                conversationShortId: all.map(item => LONG.fromString(item.conversationShortId)),
                requestFrom: 'impc-chat',
            },
        }, desktopCookieProtoOptions(this.deviceId));
        const status = envelope(decoded);
        const failed = (result) => ({ ...result, conversations: [], missingConversationIds: [...requested.keys()] });
        if (status.statusCode !== 0 && status.statusCode !== 200)
            return failed(status);
        try {
            const body = record(record(decoded['body'])['batchGetConversationParticipantsReadindex']);
            const items = body['conversationParticipantsReadIndex'] ?? [];
            if (!Array.isArray(items))
                throw new Error('invalid conversations');
            const seen = new Set();
            const conversations = items.map(item => {
                const raw = record(item);
                const id = raw['conversationId'];
                if (typeof id !== 'string' || !requested.has(id) || seen.has(id))
                    throw new Error('unexpected conversation');
                seen.add(id);
                const shortId = int64(raw['conversationShortId'], true);
                if (shortId !== requested.get(id).conversationShortId)
                    throw new Error('mismatched conversation');
                return { conversationId: id, conversationShortId: shortId, indexes: cursors(raw['participantReadIndex'], true) };
            });
            return { ...status, statusCode: 0, conversations, missingConversationIds: [...requested.keys()].filter(id => !seen.has(id)) };
        }
        catch {
            return failed({ statusCode: -3, statusMsg: 'Desktop invalid batch read-index response' });
        }
    }
    async query(options, cmd, key, path) {
        const decoded = await this.transport.sendCookieProto(cmd, 1, path, { [key]: address(options) }, desktopCookieProtoOptions(this.deviceId));
        const status = envelope(decoded);
        if (status.statusCode !== 0 && status.statusCode !== 200)
            return { ...status, indexes: [] };
        try {
            const body = record(record(decoded['body'])[key]);
            return { ...status, statusCode: 0, indexes: cursors(body['indexes'], cmd === 2000) };
        }
        catch {
            return { statusCode: -3, statusMsg: `Desktop invalid ${key} response`, indexes: [] };
        }
    }
}
//# sourceMappingURL=read-state.js.map