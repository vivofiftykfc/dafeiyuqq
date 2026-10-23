import protobuf from 'protobufjs';
import { desktopCookieProtoOptions } from './desktop.js';
import { mapProtoMessage } from './mappers.js';
const LONG = protobuf.util.Long;
export class ImStrangerApi {
    transport;
    deviceId;
    constructor(transport, deviceId = '') {
        this.transport = transport;
        this.deviceId = deviceId;
    }
    cookieOptions() {
        return desktopCookieProtoOptions(this.deviceId || '0');
    }
    async getRecentMessages(options) {
        const latest = signedInt64(options.latestStrangerVersion, 'latestStrangerVersion');
        const earliest = signedInt64(options.earliestStrangerVersion, 'earliestStrangerVersion');
        const inboxType = options.inboxType ?? 1;
        if (!Number.isInteger(inboxType) || inboxType < -2147483648 || inboxType > 2147483647) {
            throw new RangeError('inboxType must be an int32');
        }
        const decoded = await this.transport.sendCookieProto(2047, inboxType, '/v1/message/get_recent_stranger_message', {
            getRecentStrangerMessage: {
                latestStrangerVersion: LONG.fromString(latest),
                earliestStrangerVersion: LONG.fromString(earliest),
                source: 'code_up', newUser: 0, bizInfo: '',
            },
        }, this.cookieOptions());
        const result = envelopeResult(decoded);
        const empty = { nextStrangerVersion: '0', hasMore: false, messages: [], logId: String(decoded['logId'] ?? '') };
        if (result.statusCode !== 0 && result.statusCode !== 200)
            return { ...result, ...empty };
        const body = record(record(decoded['body'])?.['getRecentStrangerMessage']);
        if (!body)
            return { statusCode: -3, statusMsg: 'IM response missing getRecentStrangerMessage', ...empty };
        try {
            if (typeof body['hasMore'] !== 'boolean')
                throw new Error('hasMore must be a boolean');
            const nextStrangerVersion = signedInt64(body['nextStrangerVersion'], 'nextStrangerVersion');
            const rows = records(body['messages'], 'messages');
            const messages = rows.map(row => {
                if (typeof row['conversationId'] !== 'string')
                    throw new Error('conversationId must be a string');
                const badgeCount = row['badgeCount'] ?? 0;
                if (typeof badgeCount !== 'number' || !Number.isInteger(badgeCount) ||
                    badgeCount < -2147483648 || badgeCount > 2147483647)
                    throw new Error('badgeCount must be an int32');
                return {
                    conversationId: row['conversationId'],
                    conversationShortId: signedInt64(row['conversationShortId'], 'conversationShortId'),
                    version: signedInt64(row['version'], 'version'),
                    badgeCount,
                    messages: records(row['messages'], 'messages').map(message => ({ ...mapProtoMessage(message), inboxType })),
                };
            });
            return { statusCode: 0, statusMsg: result.statusMsg, ...empty, nextStrangerVersion, hasMore: body['hasMore'], messages };
        }
        catch (error) {
            return { statusCode: -3, statusMsg: `Invalid recent stranger page: ${error instanceof Error ? error.message : String(error)}`, ...empty };
        }
    }
    async getMessages(conversationShortId, resetUnreadCount = false) {
        assertInt64('conversationShortId', conversationShortId);
        const decoded = await this.transport.sendCookieProto(1002, 1, '/v1/stranger/get_messages', {
            getStrangerMessagesBody: {
                conversationShortId: LONG.fromString(conversationShortId),
                resetUnreadCount,
            },
        }, this.cookieOptions());
        const result = envelopeResult(decoded);
        const payload = decoded['body'];
        const body = payload?.['getStrangerMessagesBody'];
        if (result.statusCode === 0 && !body) {
            return {
                statusCode: -3,
                statusMsg: 'IM response missing getStrangerMessagesBody',
                messages: [],
            };
        }
        return {
            ...result,
            messages: result.statusCode === 0 ? (body?.messages ?? []).map(mapProtoMessage) : [],
        };
    }
    deleteMessage(conversationShortId, serverMessageId) {
        assertInt64('conversationShortId', conversationShortId);
        assertInt64('serverMessageId', serverMessageId);
        return this.emptyAction(1003, '/v1/stranger/delete_message', 'deleteStrangerMessageBody', {
            serverMessageId: LONG.fromString(serverMessageId),
            conversationShortId: LONG.fromString(conversationShortId),
        });
    }
    deleteAllConversations() {
        return this.emptyAction(1005, '/v1/stranger/delete_all_conversations', 'deleteStrangerAllConversationBody', {});
    }
    markRead(conversationShortId) {
        assertInt64('conversationShortId', conversationShortId);
        return this.emptyAction(1006, '/v1/stranger/mark_read_conversation', 'markStrangerConversationReadBody', {
            conversationShortId: LONG.fromString(conversationShortId),
        });
    }
    markAllRead() {
        return this.emptyAction(1007, '/v1/stranger/mark_read_all_conversations', 'markStrangerAllConversationReadBody', {});
    }
    async getUnreadCount(resetUnreadCount = false) {
        const decoded = await this.transport.sendCookieProto(1008, 1, '/v1/stranger/get_unread_count', { getStrangerUnreadCountBody: { resetUnreadCount } }, this.cookieOptions());
        const result = envelopeResult(decoded);
        const payload = decoded['body'];
        const body = payload?.['getStrangerUnreadCountBody'];
        if (result.statusCode === 0 && !body) {
            return {
                statusCode: -3,
                statusMsg: 'IM response missing getStrangerUnreadCountBody',
                unreadCount: '0',
            };
        }
        return { ...result, unreadCount: String(body?.userUnreadCount ?? '0') };
    }
    async emptyAction(cmd, endpoint, bodyKey, body) {
        const decoded = await this.transport.sendCookieProto(cmd, 1, endpoint, { [bodyKey]: body }, this.cookieOptions());
        return envelopeResult(decoded);
    }
}
function envelopeResult(decoded) {
    return {
        statusCode: Number(decoded['statusCode'] ?? 0),
        statusMsg: String(decoded['errorDesc'] ?? ''),
    };
}
function assertInt64(name, value) {
    if (!/^\d+$/.test(value))
        throw new Error(`${name} must be a decimal int64 string`);
}
function signedInt64(value, name) {
    if (typeof value !== 'string' || !/^-?\d+$/.test(value))
        throw new TypeError(`${name} must be a decimal int64 string`);
    const number = BigInt(value);
    if (number < -9223372036854775808n || number > 9223372036854775807n)
        throw new RangeError(`${name} is outside int64`);
    return number.toString();
}
function record(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : undefined;
}
function records(value, name) {
    if (value === undefined)
        return [];
    if (!Array.isArray(value) || value.some(item => !record(item)))
        throw new Error(`${name} must contain objects`);
    return value;
}
//# sourceMappingURL=stranger.js.map