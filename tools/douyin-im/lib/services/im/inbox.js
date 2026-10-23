import protobuf from 'protobufjs';
import { dedupeThreads, mapProtoConversation, mapProtoConversationListItem, mapProtoConversationMeta, mapProtoMessage, } from './mappers.js';
import { desktopCookieProtoOptions } from './desktop.js';
const LONG = protobuf.util.Long;
function pageSize(value, fallback) {
    const count = value ?? fallback;
    if (!Number.isSafeInteger(count) || count < 1 || count > 50) {
        throw new RangeError('message page size must be an integer between 1 and 50');
    }
    return count;
}
function cursorString(value) {
    const cursor = String(value ?? '0');
    return /^\d+$/.test(cursor) ? cursor : '0';
}
export class ImInboxApi {
    transport;
    platformUid;
    deviceId;
    constructor(transport, platformUid = '', deviceId = '') {
        this.transport = transport;
        this.platformUid = platformUid;
        this.deviceId = deviceId;
    }
    cookieOptions() {
        return desktopCookieProtoOptions(this.deviceId || '0');
    }
    async listConversations(options = {}) {
        const decoded = await this.transport.sendCookieProto(2006, 0, '/v1/conversation/list', {
            getConversationListBody: {
                sortType: 1,
                cursor: LONG.fromString(cursorString(options.cursor)),
                conType: 2,
                limit: options.count ?? 20,
            },
        }, this.cookieOptions());
        const statusCode = Number(decoded['statusCode'] ?? 0);
        const body = decoded['body'];
        const list = body?.['getConversationListBody'];
        if (statusCode === 0 && !list) {
            return {
                statusCode: -3,
                statusMsg: 'IM response missing getConversationListBody',
                conversations: [],
            };
        }
        return {
            statusCode,
            statusMsg: String(decoded['errorDesc'] ?? ''),
            conversations: statusCode === 0
                ? (list?.list ?? []).map(mapProtoConversationListItem)
                : [],
        };
    }
    async listThreads(options = {}) {
        const cursor = cursorString(options.cursor);
        const decoded = await this.transport.sendCookieProto(203, options.inboxType ?? 1, '/v2/message/get_by_user_init', { messagesPerUserInitV2Body: { cursor: LONG.fromString(cursor) } }, this.cookieOptions());
        const statusCode = Number(decoded['statusCode'] ?? 0);
        if (statusCode !== 0) {
            return {
                statusCode,
                statusMsg: String(decoded['errorDesc'] ?? ''),
                hasMore: false,
                threads: [],
                cursor: '0',
                conversations: [],
            };
        }
        const body = decoded['body'];
        const inbox = body?.['messagesPerUserInitV2Body'];
        if (!inbox) {
            return {
                statusCode: -3,
                statusMsg: 'IM response missing messagesPerUserInitV2Body',
                hasMore: false,
                threads: [],
                cursor: '0',
                conversations: [],
            };
        }
        const rawMessages = (inbox?.messages ?? []);
        const rawConversations = (inbox?.conversations ?? []);
        const threads = rawConversations.length > 0
            ? rawConversations.map((conversation) => mapProtoConversationMeta(conversation, rawMessages, this.platformUid))
            : dedupeThreads(rawMessages.map((message) => mapProtoConversation(message, this.platformUid)));
        return {
            statusCode: 0,
            statusMsg: String(decoded['errorDesc'] ?? ''),
            hasMore: (inbox?.hasMore ?? 0) > 0,
            threads: dedupeThreads(threads),
            cursor: cursorString(inbox?.nextCursor),
            conversations: rawConversations.map(mapProtoConversationListItem),
        };
    }
    async getMessages(options) {
        const count = pageSize(options.count, 50);
        const direction = options.direction ?? 'older';
        const decoded = await this.transport.sendCookieProto(301, options.inboxType ?? 0, '/v1/message/get_by_conversation', {
            messagesInConversationBody: {
                conversationId: options.threadId,
                conversationType: options.conversationType ?? (/^\d+$/.test(options.threadId) ? 2 : 1),
                conversationShortId: LONG.fromString(options.conversationShortId ?? (/^\d+$/.test(options.threadId) ? options.threadId : '0')),
                direction: direction === 'older' ? 1 : 2,
                anchorIndex: LONG.fromString(cursorString(options.cursor)),
                limit: count,
            },
        }, this.cookieOptions());
        return this.mapMessageListResponse(decoded, options, direction);
    }
    mapMessageListResponse(decoded, options, direction) {
        const statusCode = decoded['statusCode'] ?? 0;
        if (statusCode !== 0) {
            return {
                statusCode,
                statusMsg: decoded['errorDesc'] ?? '',
                hasMore: false,
                messages: [],
                cursor: '0',
                direction,
            };
        }
        const body = decoded['body'];
        const cm = body?.['messagesInConversationBody'];
        if (!cm) {
            return {
                statusCode: -3,
                statusMsg: 'IM response missing messagesInConversationBody',
                hasMore: false,
                messages: [],
                cursor: '0',
                direction,
            };
        }
        let messages = (cm?.messages ?? []).map((m) => mapProtoMessage(m));
        if (options.includeCurrent !== true && options.cursor != null) {
            const anchor = cursorString(options.cursor);
            messages = messages.filter((message) => message.indexInConversationV2 !== anchor && message.indexInConversation !== anchor);
        }
        return {
            statusCode: 0,
            statusMsg: '',
            hasMore: cm?.hasMore ?? false,
            messages,
            cursor: String(cm?.nextCursor ?? 0),
            direction,
        };
    }
}
//# sourceMappingURL=inbox.js.map