import { getLogger } from '../../logger.js';
const logger = getLogger('IM:HTTP');
export function buildDesktopTextContent(text, mentions = []) {
    return JSON.stringify({
        aweType: 700,
        type: 0,
        richTextInfos: mentions.map((mention) => ({
            infoType: 1,
            location: mention.location,
            length: mention.length,
            info: { uid: mention.uid },
        })),
        text,
    });
}
export function buildImageContent(image) {
    return JSON.stringify({
        resource_url: {
            oid: image.oid,
            skey: image.skey,
            data_size: image.dataSize,
            md5: image.md5,
        },
        cover_height: image.height,
        cover_width: image.width,
        check_pics: [],
        md5: image.md5,
        from_gallery: 1,
        aweType: image.format === 'gif' ? 2703 : 2702,
    });
}
export function buildVideoContent(video) {
    return JSON.stringify({
        video: { tkey: video.tkey, md5: video.md5, skey: video.skey },
        poster: { oid: video.poster.oid, md5: video.poster.md5, skey: video.poster.skey },
        height: video.height,
        width: video.width,
        check_pics: video.checkPics ?? [],
    });
}
export function buildEmojiContent(options) {
    const width = options.width ?? 100;
    const height = options.height ?? 100;
    return JSON.stringify({
        display_name: options.displayName ?? '',
        height,
        width,
        image_id: 0,
        image_type: options.imageType ?? 'png',
        package_id: options.packageId ?? 0,
        show_notice: false,
        resource_type: 4,
        updateConversationTime: true,
        url: { height: 0, data_size: 0, uri: options.url, url_list: [options.url], width: 0 },
        createdAt: 0,
        is_card: false,
        msgHint: '',
        aweType: 507,
    });
}
export function isCollectedStickerEnabled(value) {
    return ['number', 'string', 'boolean'].includes(typeof value) && Number(value) === 0;
}
export function buildCollectedStickerContent(sticker) {
    if (!sticker || typeof sticker !== 'object' || Array.isArray(sticker) ||
        !(typeof sticker['id'] === 'string' && sticker['id'].length ||
            typeof sticker['id'] === 'number' && Number.isSafeInteger(sticker['id']))) {
        throw new TypeError('A collected sticker needs a lossless platform ID');
    }
    const animated = objectValue(sticker['animate_url']);
    const staticImage = objectValue(sticker['static_url']);
    return JSON.stringify({
        display_name: '',
        height: sticker['height'] ?? 0,
        width: sticker['width'] ?? 0,
        image_id: sticker['id'],
        image_type: sticker['animate_type'],
        package_id: sticker['origin_package_id'],
        show_notice: false,
        resource_type: 0,
        updateConversationTime: true,
        createdAt: 0,
        is_card: false,
        msgHint: '',
        aweType: 501,
        url: {
            height: 0, data_size: 0,
            uri: animated?.['uri'] ?? staticImage?.['uri'],
            url_list: animated?.['url_list'] ?? staticImage?.['url_list'],
            width: 0,
        },
    });
}
export function buildReplyPayload(options) {
    const hint = JSON.stringify({
        refmsg_type: options.referencedMessageType,
        content: options.referencedText ?? '',
        refmsg_uid: options.referencedUid,
        refmsg_sec_uid: options.referencedSecUid ?? '',
        nickname: options.nickname ?? '',
        refmsg_content: '',
        version: 0,
        itemId: '',
        scene_type: 0,
        is_edit: false,
    });
    const reference = {
        referencedMessageId: options.referencedMessageId,
        hint,
    };
    if (options.rootMessageId)
        reference.rootMessageId = options.rootMessageId;
    if (options.rootMessageConvIndex)
        reference.rootMessageConvIndex = options.rootMessageConvIndex;
    return { content: buildDesktopTextContent(options.text), reference };
}
function objectValue(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : undefined;
}
function stringArray(value) {
    return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}
function parseTextMentions(value, text) {
    const infos = Array.isArray(value['richTextInfos']) ? value['richTextInfos'] : [];
    const mentions = [];
    for (const raw of infos) {
        const item = objectValue(raw);
        const info = objectValue(item?.['info']);
        if (Number(item?.['infoType'] ?? 0) !== 1)
            continue;
        const uid = String(info?.['uid'] ?? '');
        const location = Number(item?.['location'] ?? -1);
        const length = Number(item?.['length'] ?? 0);
        if (!uid || !Number.isInteger(location) || location < 0 || !Number.isInteger(length) || length <= 0)
            continue;
        mentions.push({ uid, location, length, text: text.slice(location, location + length) });
    }
    return mentions;
}
function imageFromObject(value) {
    const resource = objectValue(value['resource_url']) ?? value;
    const oid = String(resource['oid'] ?? resource['uri'] ?? '');
    const skey = String(resource['skey'] ?? '');
    const urls = (name) => stringArray(resource[name] ?? value[name]);
    if (!oid && !skey && !['origin_url_list', 'large_url_list', 'medium_url_list', 'thumb_url_list'].some((name) => urls(name).some(Boolean)))
        return undefined;
    return {
        oid,
        skey,
        md5: String(resource['md5'] ?? value['md5'] ?? ''),
        dataSize: Number(resource['data_size'] ?? value['data_size'] ?? 0),
        width: Number(value['cover_width'] ?? resource['width'] ?? 0),
        height: Number(value['cover_height'] ?? resource['height'] ?? 0),
        originUrls: urls('origin_url_list'),
        largeUrls: urls('large_url_list'),
        mediumUrls: urls('medium_url_list'),
        thumbUrls: urls('thumb_url_list'),
    };
}
export function parseMessageContent(content, messageType) {
    let value;
    try {
        const decoded = JSON.parse(content);
        if (!objectValue(decoded))
            return { kind: 'unknown', text: content, aweType: 0, value: content };
        value = decoded;
    }
    catch {
        return { kind: 'text', text: content, aweType: 0 };
    }
    const aweType = Number(value['aweType'] ?? value['awe_type'] ?? 0);
    const text = String(value['text'] ?? value['content'] ?? value['display_name'] ?? '');
    if (messageType === 17) {
        const resource = objectValue(value['resource_url']);
        return {
            kind: 'audio', text, aweType,
            audio: { urls: stringArray(resource?.['url_list']), uri: String(resource?.['uri'] ?? '') },
            value,
        };
    }
    if (messageType === 6)
        return {
            kind: 'file', text: String(value['name'] ?? ''), aweType, value,
            file: { uri: String(value['uri'] ?? ''), skey: String(value['skey'] ?? ''), md5: String(value['md5'] ?? ''), name: String(value['name'] ?? ''), dataSize: Number(value['data_size'] ?? 0) },
        };
    if (messageType === 26)
        return {
            kind: 'link', text: String(value['title'] ?? ''), aweType, value,
            link: { url: String(value['link_url'] ?? ''), title: String(value['title'] ?? ''), description: String(value['desc'] ?? ''), coverUrl: String(value['cover_url'] ?? '') },
        };
    if (messageType === 25)
        return {
            kind: 'user', text: String(value['name'] ?? ''), aweType, value,
            user: { uid: String(value['uid'] ?? ''), secUid: String(value['secUID'] ?? ''), name: String(value['name'] ?? ''), avatarUrl: stringArray(objectValue(value['avatar'])?.['url_list'])[0] ?? '' },
        };
    if (messageType === 16 || messageType === 75 || messageType === 105) {
        const commentText = String(value['comment'] ?? value['text'] ?? '');
        const cover = objectValue(value['cover_url']);
        return {
            kind: 'comment', text: commentText, aweType, value,
            comment: {
                workId: String(value['itemId'] ?? value['aweme_id'] ?? ''),
                commentId: String(value['comment_id'] ?? ''),
                authorName: String(value['comment_user_name'] ?? ''),
                coverUrl: stringArray(cover?.['url_list'])[0] ?? '',
            },
        };
    }
    if (messageType === 8 || messageType === 77 || (messageType == null && aweType === 800)) {
        const title = String(value['content_title'] ?? '');
        return {
            kind: 'share', text: text || title, aweType,
            share: {
                itemId: String(value['itemId'] ?? ''), title,
                authorUid: String(value['uid'] ?? ''), authorSecUid: String(value['secUID'] ?? ''),
            },
            value,
        };
    }
    if (messageType != null && ![1, 2, 5, 7, 27, 30].includes(messageType)) {
        return { kind: 'unknown', text, aweType, value };
    }
    const image = imageFromObject(value);
    if (image)
        return { kind: 'image', text, aweType: aweType || 2702, image };
    const videoValue = objectValue(value['video']);
    if (videoValue) {
        const posterValue = objectValue(value['poster']);
        const poster = posterValue ? imageFromObject(posterValue) : undefined;
        const video = {
            tkey: String(videoValue['tkey'] ?? ''),
            skey: String(videoValue['skey'] ?? ''),
            md5: String(videoValue['md5'] ?? ''),
            width: Number(value['width'] ?? 0),
            height: Number(value['height'] ?? 0),
            checkPics: stringArray(value['check_pics']),
            ...(poster ? { poster } : {}),
        };
        return { kind: 'video', text, aweType, video };
    }
    const emojiUrl = objectValue(value['url']);
    const url = [...stringArray(emojiUrl?.['url_list']), String(emojiUrl?.['uri'] ?? '')].find(url => /^https?:\/\//i.test(url)) ?? '';
    if (aweType === 507 || url)
        return { kind: 'emoji', text, aweType: aweType || 507, url };
    if (text || 'text' in value) {
        const mentions = parseTextMentions(value, text);
        return { kind: 'text', text, aweType, ...(mentions.length > 0 ? { mentions } : {}) };
    }
    return { kind: 'unknown', text, aweType, value };
}
export function normalizeDesktopTextMessageContent(content, msgType) {
    if (msgType !== 7)
        return content;
    try {
        const value = JSON.parse(content);
        const keys = Object.keys(value);
        const isPlainText = typeof value['text'] === 'string' &&
            keys.every((key) => ['text', 'aweType', 'type', 'richTextInfos'].includes(key));
        if (!isPlainText)
            return content;
        if (value['aweType'] === 700 &&
            value['type'] === 0 &&
            Array.isArray(value['richTextInfos']))
            return content;
        return buildDesktopTextContent(value['text']);
    }
    catch {
        return buildDesktopTextContent(content);
    }
}
export function isMessageDelivered(res) {
    return (res.statusCode === 0 &&
        Boolean(res.serverMessageId) &&
        res.serverMessageId !== '0' &&
        res.checkCode !== 8610);
}
export function parseCheckMessage(raw) {
    try {
        const j = JSON.parse(raw);
        return {
            statusCode: j.status_code ?? 0,
            tips: j.tips || j.status_msg?.msg_content?.tips || '',
        };
    }
    catch {
        return { statusCode: 0, tips: raw.slice(0, 200) };
    }
}
export function parseSendMessageResponse(decoded, clientMsgId) {
    const statusCode = decoded['statusCode'] ?? 0;
    const respBody = decoded['body'];
    const sendResp = respBody?.['sendMessageBody'];
    const rawCheckCode = Number(sendResp?.checkCode ?? 0);
    let checkCode = rawCheckCode > 0 ? rawCheckCode : undefined;
    let checkTips = '';
    if (sendResp?.checkMessage) {
        const parsed = parseCheckMessage(sendResp.checkMessage);
        if (parsed.statusCode > 0)
            checkCode = parsed.statusCode;
        checkTips = parsed.tips;
    }
    if (sendResp) {
        const audit = checkCode ? ` checkCode=${checkCode}` : '';
        logger.debug('send channel=http status=%s serverMsgId=%s%s', sendResp.status, sendResp.serverMessageId, audit);
        if (checkCode === 8101) {
            logger.success('消息已投递（checkCode=8101）');
        }
        if (checkCode === 10502) {
            logger.warn('消息已提交但可能处于审核中（10502），对方未必立即可见');
        }
        if (checkCode === 8610) {
            logger.warn('内容安全检查未通过（8610），消息未投递');
        }
    }
    const sendStatus = sendResp?.status ?? 0;
    const hasServerMessage = Boolean(sendResp?.serverMessageId) && String(sendResp?.serverMessageId) !== '0';
    const envelopeOk = statusCode === 0 && sendStatus === 0 && hasServerMessage;
    const envelopeMessage = String(decoded['errorDesc'] ?? '');
    const rejectedMessage = checkTips ||
        (checkCode ? `content audit code=${checkCode}` : '') ||
        (envelopeMessage && envelopeMessage !== 'OK' ? envelopeMessage : '') ||
        `send rejected status=${statusCode || sendStatus}`;
    const result = {
        statusCode: statusCode !== 0 ? statusCode : sendStatus !== 0 ? sendStatus : envelopeOk ? 0 : -3,
        statusMsg: envelopeOk ? envelopeMessage : rejectedMessage,
        clientMessageId: sendResp?.clientMessageId ?? clientMsgId,
    };
    if (checkCode && checkCode > 0)
        result.checkCode = checkCode;
    if (sendResp?.serverMessageId) {
        result.serverMessageId = String(sendResp.serverMessageId);
    }
    return result;
}
//# sourceMappingURL=content.js.map
