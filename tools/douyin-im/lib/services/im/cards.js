function required(value, name) {
    if (!value?.trim())
        throw new Error(`${name} is required`);
    return value;
}
function httpUrl(value) {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol))
        throw new Error('card URL must use HTTP(S)');
    return url.href;
}
const urlObject = (url) => ({
    uri: url ? httpUrl(url) : '',
    url_list: url ? [httpUrl(url)] : [],
});
export function buildCardMessage(message) {
    let value;
    let messageType;
    switch (message.type) {
        case 'group-invite': {
            const group = message.group;
            for (const [name, value] of [['groupId', group.groupId], ['shortId', group.shortId], ['inviterUid', group.inviterUid]]) {
                if (!value || !/^\d+$/.test(value))
                    throw new Error(`${name} must be a decimal string`);
            }
            required(group.inviterSecUid, 'inviterSecUid');
            let uri;
            try {
                const url = new URL(group.avatarUrl);
                uri = (url.pathname + url.search).replace(/^\//, '');
            }
            catch { }
            messageType = 58;
            value = {
                aweme_invite_card: {
                    card_type: 0,
                    conversation_id: group.groupId,
                    conversation_short_id: group.shortId,
                    from_uid: group.inviterUid,
                    sec_from_uid: group.inviterSecUid,
                    group_icon: { ...(uri !== undefined ? { uri } : {}), url_list: [group.avatarUrl] },
                    group_member_count: group.memberCount ?? 1,
                    ...(group.name !== undefined ? { group_name: group.name } : {}),
                    group_owner_nickname: group.ownerName,
                    ...(group.ownerUid !== undefined ? { group_owner_uid: group.ownerUid } : {}),
                    is_in: 1,
                    scene: 0,
                    ...(group.ownerSecUid !== undefined ? { sec_group_owner_uid: group.ownerSecUid } : {}),
                },
                aweType: 0, createAt: Date.now(), is_card: false,
            };
            break;
        }
        case 'share':
        case 'photos': {
            const work = message.work;
            required(work.itemId, 'itemId');
            if (!/^\d+$/.test(work.itemId))
                throw new Error('itemId must be a decimal string');
            const photos = message.type === 'photos';
            const imageCount = work.imageCount ?? 1;
            if (photos && (!Number.isSafeInteger(imageCount) || imageCount < 1))
                throw new Error('imageCount must be positive');
            messageType = photos ? 77 : 8;
            value = {
                aweType: photos ? 0 : 800,
                awemeType: photos ? 68 : 0,
                itemId: work.itemId,
                content_title: work.title ?? '',
                content_name: work.authorName ?? '',
                uid: work.authorUid ?? '',
                secUID: work.authorSecUid ?? '',
                content_thumb: urlObject(work.coverUrl),
                cover_url: urlObject(work.coverUrl),
                cover_height: 0,
                cover_width: 0,
                share_with_timestamp: 0,
                share_id: work.authorUid
                    ? `${work.authorUid}_${Date.now()}_${work.itemId}`
                    : '',
                ai_ext: '{}',
                share_info: [],
                anchor_info: {},
                poi_track_params: {},
                ...(photos
                    ? {
                        image_count: imageCount,
                        image_index: 0,
                        cover_url_v2: urlObject(work.coverUrl),
                    }
                    : {}),
            };
            break;
        }
        case 'link': {
            const link = message.link;
            const target = new URL(httpUrl(link.url));
            if (!target.searchParams.get('pc_iframe_src'))
                target.searchParams.set('pc_iframe_src', target.href);
            messageType = 26;
            value = {
                link_url: target.href,
                title: link.title ?? '',
                desc: link.description ?? '',
                cover_url: link.coverUrl ? httpUrl(link.coverUrl) : '',
            };
            break;
        }
        case 'user':
            messageType = 25;
            value = {
                uid: required(message.user.uid, 'uid'),
                secUID: message.user.secUid ?? '',
                name: message.user.name ?? '',
                avatar: urlObject(message.user.avatarUrl),
                cover_items: [],
                cover_url: [],
            };
            break;
        case 'file': {
            const file = message.file;
            if (!Number.isSafeInteger(file.dataSize) ||
                file.dataSize < 1 ||
                file.dataSize > 10 * 1024 * 1024)
                throw new Error('file size must be between 1 byte and 10 MiB');
            messageType = 6;
            value = {
                aweType: 15001,
                uri: required(file.uri, 'uri'),
                skey: required(file.skey, 'skey'),
                md5: required(file.md5, 'md5'),
                name: required(file.name, 'name'),
                data_size: file.dataSize,
                format: file.name.includes('.')
                    ? file.name.split('.').pop().toLowerCase()
                    : '',
            };
            break;
        }
    }
    return { content: JSON.stringify(value), messageType };
}
//# sourceMappingURL=cards.js.map