import { parseJsonResponse } from '../../http/response.js';
import { desktopFingerprintParams, } from './desktop.js';
const DESKTOP_ORIGIN = 'https://imdesktop.douyin.com';
const BATCH_SIZE = 50;
function objectValue(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : undefined;
}
function stringArray(value) {
    return Array.isArray(value)
        ? value.filter((item) => typeof item === 'string' && item.length > 0)
        : [];
}
function normalizeIds(ids, label) {
    const result = [];
    const seen = new Set();
    for (const id of ids) {
        const value = id.trim();
        if (!/^\d+$/.test(value))
            throw new Error(`${label} must be a decimal string`);
        if (!seen.has(value)) {
            seen.add(value);
            result.push(value);
        }
    }
    return result;
}
function batches(values) {
    const result = [];
    for (let offset = 0; offset < values.length; offset += BATCH_SIZE) {
        result.push(values.slice(offset, offset + BATCH_SIZE));
    }
    return result;
}
export function resolveSharedWorkAccess(work) {
    const detail = work.detail;
    const videoControl = objectValue(detail?.['video_control']);
    const awemeControl = objectValue(detail?.['aweme_control']);
    const canDownload = videoControl?.['allow_download'] === true;
    const canShare = typeof awemeControl?.['can_share'] === 'boolean'
        ? awemeControl['can_share']
        : videoControl?.['allow_share'] === true;
    const media = [];
    if (canDownload) {
        const images = detail?.['images'];
        if (Array.isArray(images)) {
            for (const image of images) {
                const urls = stringArray(objectValue(image)?.['download_url_list']);
                if (urls[0])
                    media.push({ kind: 'image', url: urls[0], urls });
            }
        }
        else {
            const downloadAddress = objectValue(objectValue(detail?.['video'])?.['download_addr']);
            const urls = stringArray(downloadAddress?.['url_list']);
            if (urls[0])
                media.push({ kind: 'video', url: urls[0], urls });
        }
    }
    return { workId: work.workId, canShare, canDownload, media };
}
export class ImSharedContent {
    client;
    resolveDeviceId;
    guid;
    screenSize;
    constructor(client, resolveDeviceId, guid = '0', screenSize = { width: 1728, height: 1117 }) {
        this.client = client;
        this.resolveDeviceId = resolveDeviceId;
        this.guid = guid;
        this.screenSize = screenSize;
    }
    async getWorkDetails(conversationShortId, workIds) {
        this.assertConversationShortId(conversationShortId);
        const ids = normalizeIds(workIds, 'work id');
        if (ids.length === 0)
            return [];
        const result = [];
        for (const batch of batches(ids)) {
            const body = new FormData();
            body.append('aweme_ids', `[${batch.join(',')}]`);
            body.append('origin_type', 'chat');
            body.append('request_source', '3');
            body.append('conversation_short_id', conversationShortId);
            const response = await this.post('/aweme/v1/web/multi/aweme/detail/', body);
            const json = parseJsonResponse(response, response.url);
            for (const raw of json.aweme_details ?? []) {
                const detail = objectValue(raw);
                if (!detail)
                    continue;
                const workId = String(detail['aweme_id'] ?? '');
                if (workId)
                    result.push({ workId, filtered: false, detail });
            }
            for (const raw of json.filter_list ?? []) {
                const item = objectValue(raw);
                if (!item)
                    continue;
                const workId = String(item['aweme_id'] ?? '');
                if (workId)
                    result.push({ workId, filtered: true, reason: item['reason'] });
            }
        }
        return result;
    }
    async getCommentStatuses(conversationShortId, commentIds) {
        this.assertConversationShortId(conversationShortId);
        const ids = normalizeIds(commentIds, 'comment id');
        if (ids.length === 0)
            return [];
        const result = [];
        for (const batch of batches(ids)) {
            const body = new FormData();
            body.append('comments_status_req', JSON.stringify({ comment_id_list: batch }));
            body.append('conversation_short_id', conversationShortId);
            const response = await this.post('/aweme/v1/web/im/message/info/other/', body);
            const json = parseJsonResponse(response, response.url);
            for (const raw of json.comment_status_resp?.comments_status ?? []) {
                const item = objectValue(raw);
                if (!item)
                    continue;
                const commentId = String(item['comment_id'] ?? '');
                if (!commentId)
                    continue;
                const isShow = item['is_show'];
                result.push({
                    commentId,
                    ...(typeof isShow === 'boolean' ? { isShown: isShow }
                        : typeof isShow === 'number' ? { isShown: isShow !== 0 }
                            : {}),
                    raw: item,
                });
            }
        }
        return result;
    }
    assertConversationShortId(value) {
        if (!/^\d+$/.test(value))
            throw new Error('conversationShortId must be a decimal string');
    }
    async post(path, body) {
        const deviceId = this.client.getDeviceId?.() ?? await this.resolveDeviceId();
        const params = desktopFingerprintParams(deviceId, this.guid, this.screenSize, this.client.getUserAgent());
        params.set('iid', this.client.getInstallId?.() ?? '0');
        const url = `${DESKTOP_ORIGIN}${path}?${params}`;
        const response = await this.client.requestRaw(url, {
            method: 'POST',
            headers: {
                bgint_json_parser: '2',
                'User-Agent': this.client.getUserAgent(),
                Referer: DESKTOP_ORIGIN,
            },
            body,
        });
        return { ...response, url };
    }
}
//# sourceMappingURL=shared-content.js.map