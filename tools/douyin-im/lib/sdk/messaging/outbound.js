import { ImService, buildDesktopTextContent, buildEmojiContent, buildCollectedStickerContent, buildImageContent, buildReplyPayload, buildVideoContent, } from '../../services/im/service.js';
import { isImageAsset, isTextMessage, prepareTextMessage } from './message.js';
import { resolveImageSource } from './media-source.js';
import { buildCardMessage } from '../../services/im/cards.js';
import { isCollectedStickerEnabled } from '../../services/im/content.js';
import { hasDesktopConversationRisk } from '../../services/im/conversation-risk.js';
const DESKTOP_FORWARDABLE_MESSAGE_TYPES = new Set([
    5, 6, 7, 8, 16, 25, 26, 27, 30, 75, 77, 105,
]);
const DESKTOP_EMPTY_TEXTS = new Set([
    '\u200d', '\n', '\r', '\t', '\v', '\f', '\u00a0', '\u2028', '\u2029', '\u2006', '<br>',
]);
function assertDesktopText(text) {
    if (!text || /^\s+$/u.test(text) || DESKTOP_EMPTY_TEXTS.has(text.replace(/^\s+/gmu, ''))) {
        throw new Error('不能发送空白消息');
    }
    if (text.length > 16_000)
        throw new Error('消息太长，试试分段发送？');
}
function stringifyForwardedContent(value) {
    return JSON.stringify(value).replace(/"(prev_id|root_id)":"(\d+)"/g, '"$1":$2');
}
export class OutboundSender {
    opts;
    im;
    constructor(client, opts = {}) {
        this.opts = opts;
        this.im = new ImService(client, {
            ...(opts.platformUid ? { platformUid: opts.platformUid } : {}),
            ...(opts.deviceId ? { deviceId: opts.deviceId } : {}),
        });
    }
    get imService() {
        return this.im;
    }
    async sendText(opts) {
        this.assertConversationRisk(opts.threadId);
        assertDesktopText(opts.text);
        const sendBase = {
            threadId: opts.threadId,
            conversationShortId: opts.conversationShortId,
            content: buildDesktopTextContent(opts.text, opts.mentions),
            msgType: 7,
        };
        if (opts.conversationType != null)
            sendBase.conversationType = opts.conversationType;
        if (opts.inboxType != null)
            sendBase.inboxType = opts.inboxType;
        if (opts.mentions?.length)
            sendBase.mentionedUsers = [...new Set(opts.mentions.map((mention) => mention.uid))];
        return this.sendPreparedMessage({
            threadId: opts.threadId,
            conversationShortId: opts.conversationShortId,
            conversationType: opts.conversationType ?? 1,
            inboxType: opts.inboxType ?? 0,
            content: sendBase.content,
            messageType: 7,
            ...(sendBase.mentionedUsers ? { mentionedUsers: sendBase.mentionedUsers } : {}),
        });
    }
    async sendMessage(opts) {
        if (isTextMessage(opts.message)) {
            const preparedText = prepareTextMessage(opts.message);
            return this.sendText({
                threadId: opts.threadId,
                conversationShortId: opts.conversationShortId,
                text: preparedText.text,
                ...(preparedText.mentions.length > 0 ? { mentions: preparedText.mentions } : {}),
                ...(opts.conversationType != null ? { conversationType: opts.conversationType } : {}),
                ...(opts.inboxType != null ? { inboxType: opts.inboxType } : {}),
            });
        }
        if (opts.message.type === 'group-invite' && opts.conversationType !== 1) {
            throw new Error('Desktop 群邀请卡只支持私聊发送');
        }
        let content;
        let cardMessageType;
        let reference;
        switch (opts.message.type) {
            case 'file-upload': {
                const file = await this.im.uploadFile(opts.message.data, opts.message.name);
                const card = buildCardMessage({ type: 'file', file });
                content = card.content;
                cardMessageType = card.messageType;
                break;
            }
            case 'share':
            case 'photos':
            case 'link':
            case 'user':
            case 'file':
            case 'group-invite': {
                const card = buildCardMessage(opts.message);
                content = card.content;
                cardMessageType = card.messageType;
                break;
            }
            case 'image': {
                const asset = isImageAsset(opts.message.data)
                    ? opts.message.data
                    : await this.im.uploadImage((await resolveImageSource(opts.message.data)).data);
                content = buildImageContent(asset);
                break;
            }
            case 'video': {
                const [video, poster] = await Promise.all([
                    this.im.uploadVideo(opts.message.data),
                    this.im.uploadImage(opts.message.cover),
                ]);
                content = buildVideoContent({
                    ...video,
                    poster,
                    width: opts.message.width ?? poster.width,
                    height: opts.message.height ?? poster.height,
                });
                break;
            }
            case 'emoji':
                this.assertConversationRisk(opts.threadId);
                content = buildEmojiContent(opts.message);
                break;
            case 'sticker':
                if (opts.conversationType === 2 && !isCollectedStickerEnabled(this.opts.getStickerEnabledStatus?.())) {
                    throw new Error('当前账号尚未允许群聊使用收藏表情，请先刷新收藏列表确认状态');
                }
                this.assertConversationRisk(opts.threadId);
                content = buildCollectedStickerContent(opts.message.sticker);
                cardMessageType = 5;
                break;
            case 'reply': {
                this.assertConversationRisk(opts.threadId);
                assertDesktopText(opts.message.text);
                const payload = buildReplyPayload(opts.message);
                content = payload.content;
                reference = payload.reference;
                break;
            }
        }
        return this.sendPreparedMessage({
            threadId: opts.threadId,
            conversationShortId: opts.conversationShortId,
            conversationType: opts.conversationType ?? 1,
            inboxType: opts.inboxType ?? 0,
            content,
            messageType: cardMessageType ?? (opts.message.type === 'image' ? 27 : opts.message.type === 'video' ? 30 : opts.message.type === 'emoji' ? 5 : 7),
            ...(reference ? { reference } : {}),
        });
    }
    async forwardMessage(opts) {
        if (!DESKTOP_FORWARDABLE_MESSAGE_TYPES.has(opts.messageType)) {
            throw new Error(`message type ${opts.messageType} is not forwardable by Douyin Chat`);
        }
        if (!opts.serverMessageId.trim())
            throw new Error('forward source serverMessageId is required');
        let parsed;
        try {
            const value = JSON.parse(opts.content);
            if (!value || typeof value !== 'object' || Array.isArray(value))
                throw new Error('not an object');
            parsed = value;
        }
        catch {
            throw new Error('forward source content must be a JSON object');
        }
        const sourceId = opts.serverMessageId;
        const rootId = String(parsed['root_id'] ?? sourceId);
        const forwarded = opts.messageType === 7
            ? {
                text: String(parsed['text'] ?? ''),
                type: 700,
                prev_id: sourceId,
                root_id: rootId,
                ...(Array.isArray(parsed['richTextInfos']) ? { richTextInfos: parsed['richTextInfos'] } : {}),
            }
            : { ...parsed, prev_id: sourceId, root_id: rootId };
        return this.sendPreparedMessage({
            threadId: opts.threadId,
            conversationShortId: opts.conversationShortId,
            conversationType: opts.conversationType ?? 1,
            inboxType: opts.inboxType ?? 0,
            content: stringifyForwardedContent(forwarded),
            messageType: opts.messageType,
        });
    }
    assertConversationRisk(conversationId) {
        if (hasDesktopConversationRisk(this.opts.getConversationSettingExt?.(conversationId))) {
            throw new Error('当前会话存在风险，请前往抖音手机端查看');
        }
    }
    async sendPreparedMessage(opts) {
        const sendOptions = {
            threadId: opts.threadId,
            conversationShortId: opts.conversationShortId,
            conversationType: opts.conversationType,
            inboxType: opts.inboxType,
            content: opts.content,
            msgType: opts.messageType,
        };
        if (opts.reference)
            sendOptions.reference = opts.reference;
        if (opts.mentionedUsers?.length)
            sendOptions.mentionedUsers = opts.mentionedUsers;
        const result = await this.im.send(sendOptions);
        this.rememberAcknowledged(opts, result);
        return result;
    }
    rememberAcknowledged(sent, response) {
        if (response.statusCode !== 0 || (!response.serverMessageId && !response.clientMessageId))
            return;
        this.opts.onMessage?.({
            msgId: response.serverMessageId ?? '',
            threadId: sent.threadId,
            conversationShortId: sent.conversationShortId,
            conversationType: sent.conversationType,
            inboxType: sent.inboxType,
            senderUid: this.im.myUid || this.opts.platformUid || '',
            ...(response.clientMessageId ? { clientMessageId: response.clientMessageId } : {}),
            content: sent.content,
            msgType: sent.messageType,
            createTime: Date.now(),
            status: 0,
        });
    }
    recall(options) {
        return this.im.recall(options);
    }
}
//# sourceMappingURL=outbound.js.map