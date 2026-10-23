import crypto from 'crypto';
import protobuf from 'protobufjs';
import { normalizeDesktopTextMessageContent, parseSendMessageResponse, } from './content.js';
import { desktopCookieProtoOptions } from './desktop.js';
function encodeReference(reference, long) {
    const encoded = {
        referencedMessageId: long.fromString(reference.referencedMessageId),
        hint: reference.hint,
    };
    if (reference.rootMessageId) {
        encoded['rootMessageId'] = long.fromString(reference.rootMessageId);
    }
    if (reference.rootMessageConvIndex) {
        encoded['rootMessageConvIndex'] = long.fromString(reference.rootMessageConvIndex);
    }
    return encoded;
}
export class ImSendApi {
    transport;
    deviceId;
    constructor(transport, deviceId = '') {
        this.transport = transport;
        this.deviceId = deviceId;
    }
    async send(options) {
        const clientMsgId = crypto.randomUUID();
        const deviceId = this.deviceId;
        if (!deviceId)
            throw new Error('Cookie IM send requires deviceId');
        const timestamp = Date.now();
        const long = protobuf.util.Long;
        const decoded = await this.transport.sendCookieProto(100, options.inboxType ?? 0, '/v1/message/send', {
            sendMessageBody: {
                conversationId: options.threadId,
                conversationType: options.conversationType ?? 1,
                conversationShortId: long.fromString(options.conversationShortId || '0'),
                content: normalizeDesktopTextMessageContent(options.content, options.msgType ?? 7),
                messageType: options.msgType ?? 7,
                clientMessageId: clientMsgId,
                ext: {
                    's:mentioned_users': '',
                    's:client_message_id': clientMsgId,
                    's:stime': `${timestamp}.${String(timestamp % 10_000).padStart(4, '0')}`,
                },
                ...(options.mentionedUsers?.length
                    ? { mentionedUsers: options.mentionedUsers.map((uid) => long.fromString(uid)) }
                    : {}),
                ...(options.reference ? { refMsgInfo: encodeReference(options.reference, long) } : {}),
            },
        }, desktopCookieProtoOptions(deviceId));
        return parseSendMessageResponse(decoded, clientMsgId);
    }
    async recall(options) {
        const deviceId = this.deviceId;
        if (!deviceId)
            throw new Error('Cookie IM recall requires deviceId');
        const long = protobuf.util.Long;
        const decoded = await this.transport.sendCookieProto(702, 1, '/v1/message/recall', {
            recallMessageBody: {
                conversationId: options.threadId,
                conversationShortId: long.fromString(options.conversationShortId || '0'),
                conversationType: options.conversationType ?? 1,
                serverMessageId: long.fromString(options.serverMessageId),
            },
        }, desktopCookieProtoOptions(deviceId));
        const envelopeStatus = Number(decoded['statusCode'] ?? 0);
        const body = decoded['body'];
        const recall = body?.['recallMessageBody'];
        return {
            statusCode: envelopeStatus,
            statusMsg: String(decoded['errorDesc'] || recall?.toast || ''),
            recalled: envelopeStatus === 0 || envelopeStatus === 200,
        };
    }
}
//# sourceMappingURL=send.js.map