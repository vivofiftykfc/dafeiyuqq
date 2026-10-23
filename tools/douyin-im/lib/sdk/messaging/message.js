export { isImageAsset } from './media-source.js';
function isTextSegment(item) {
    if (typeof item === 'string')
        return true;
    if (!item || typeof item !== 'object' || Array.isArray(item))
        return false;
    const type = item.type;
    return type === 'text' || type === 'at';
}
export function isTextMessage(message) {
    return Array.isArray(message) ? message.every(isTextSegment) : isTextSegment(message);
}
export function prepareTextMessage(message) {
    const segments = Array.isArray(message) ? message : [message];
    let text = '';
    const mentions = [];
    for (const item of segments) {
        if (typeof item === 'string') {
            text += item;
            continue;
        }
        if (item.type === 'text') {
            text += item.text;
            continue;
        }
        const label = `@${item.name}`;
        mentions.push({ uid: item.uid, text: label, location: text.length, length: label.length });
        text += label;
    }
    return { text, mentions };
}
export function messageBrief(message) {
    if (isTextMessage(message))
        return oneLine(prepareTextMessage(message).text);
    switch (message.type) {
        case 'group-invite': return `[群邀请] ${oneLine(message.group.name ?? message.group.groupId)}`;
        case 'image': return '[图片]';
        case 'video': return '[视频]';
        case 'emoji': return `[表情] ${oneLine(message.displayName ?? message.url)}`.trim();
        case 'sticker': return '[收藏表情]';
        case 'file-upload': return `[文件] ${message.name}`;
        case 'file': return `[文件] ${message.file.name}`;
        case 'share': return `[分享作品] ${message.work.title || message.work.itemId}`;
        case 'photos': return `[图集] ${message.work.title || message.work.itemId}`;
        case 'link': return `[链接] ${message.link.title || message.link.url}`;
        case 'user': return `[名片] ${message.user.name || message.user.uid}`;
        case 'reply': return `[回复] ${oneLine(message.text)}`;
    }
}
function oneLine(value) {
    const normalized = value.replace(/\s+/gu, ' ').trim();
    return normalized.length > 80 ? `${normalized.slice(0, 77)}...` : normalized;
}
export const segment = {
    text(text) { return { type: 'text', text }; },
    at(target, name) {
        const uid = typeof target === 'string' ? target : target.uid;
        const resolvedName = name ?? (typeof target === 'string' ? undefined : target.displayName ?? target.nickname) ?? uid;
        if (!/^\d+$/.test(uid))
            throw new Error('mention uid must be a numeric IM uid');
        if (!resolvedName.trim())
            throw new Error('mention name is required');
        return { type: 'at', uid, name: resolvedName };
    },
    share(work) { return { type: 'share', work }; },
    photos(work) { return { type: 'photos', work }; },
    link(link) { return { type: 'link', link }; },
    user(user) { return { type: 'user', user }; },
    file(file, name) {
        if (file instanceof Uint8Array) {
            if (!name?.trim())
                throw new Error('file name is required');
            return { type: 'file-upload', data: file, name };
        }
        return { type: 'file', file };
    },
    image(data) {
        return { type: 'image', data };
    },
    video(data, cover, options = {}) {
        return { type: 'video', data, cover, ...options };
    },
    emoji(options) {
        return { type: 'emoji', ...options };
    },
    sticker(sticker) {
        return { type: 'sticker', sticker };
    },
    reply(options) {
        return { type: 'reply', ...options };
    },
};
//# sourceMappingURL=message.js.map