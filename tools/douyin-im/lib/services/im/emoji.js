import { DouyinResponseError, parseJsonResponse } from '../../http/response.js';
import { ActionChallengeError } from '../../http/action-challenge.js';
import { desktopFingerprintParams } from './desktop.js';
const ORIGIN = 'https://imdesktop.douyin.com';
export class ImEmojiApi {
    client;
    deviceId;
    guid;
    screenSize;
    constructor(client, deviceId = '', guid = '', screenSize = { width: 1728, height: 1117 }) {
        this.client = client;
        this.deviceId = deviceId;
        this.guid = guid;
        this.screenSize = screenSize;
    }
    async getResources() {
        const body = await this.request('/aweme/v1/web/im/resources/emoji/', 'GET');
        const status = result(body, true);
        if (status.statusCode !== 0)
            return status;
        const resource = record(body['android_emoji_resource']);
        const resourceStatus = body['android_emoji_status'];
        if (resource && resourceStatus === 1)
            return { ...status, androidResourceStatus: 1 };
        if (!resource || typeof resource['resource_url'] !== 'string' || !resource['resource_url'] ||
            typeof resource['md5'] !== 'string' || !resource['md5']) {
            return { statusCode: -3, statusMsg: 'Desktop response missing emoji resource manifest' };
        }
        return { ...status, androidResource: { url: resource['resource_url'], md5: resource['md5'] },
            ...(typeof resourceStatus === 'number' && Number.isSafeInteger(resourceStatus)
                ? { androidResourceStatus: resourceStatus } : {}) };
    }
    async collect(options) {
        const decimal = (value) => typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value);
        if ((options.imageId !== undefined && !decimal(options.imageId)) ||
            (options.resourceId !== undefined && !decimal(options.resourceId)) ||
            (options.stickerUri !== undefined && typeof options.stickerUri !== 'string') ||
            (options.stickerUrl !== undefined && typeof options.stickerUrl !== 'string') ||
            !Number.isSafeInteger(options.stickerType) || options.stickerType < 0 ||
            (!options.imageId && !options.stickerUri && !options.stickerUrl)) {
            throw new TypeError('Invalid Desktop emoji collection options');
        }
        const query = new URLSearchParams({ action: '1', sticker_ids: `[${options.imageId ?? ''}]` });
        if (options.stickerUri !== undefined)
            query.set('sticker_uri', options.stickerUri);
        if (options.stickerUrl !== undefined)
            query.set('sticker_url', options.stickerUrl);
        if (options.resourceId !== undefined)
            query.set('resource_id', options.resourceId);
        query.set('sticker_type', String(options.stickerType));
        const body = await this.request('/aweme/v1/web/im/resources/sticker/collect/', 'POST', query);
        const status = result(body);
        if (status.statusCode !== 0)
            return { ...status, successItems: [] };
        const items = body['success_items'];
        if (!Array.isArray(items) || !items.length || !items.every(item => record(item) !== undefined) ||
            !Object.keys(items[0]).length) {
            return { statusCode: -3, statusMsg: 'Desktop response missing collected sticker records', successItems: [] };
        }
        return { ...status, successItems: items };
    }
    async getCollected(cursor = '0') {
        if (typeof cursor !== 'string' || !/^(0|[1-9]\d*)$/.test(cursor))
            throw new TypeError('Invalid Desktop emoji cursor');
        const query = new URLSearchParams({ scenes: 'CUSTOM_STICKER_PAGE', need_ai_emoji: 'true', custom_cursor: cursor, custom_limit: '50' });
        const body = await this.request('/aweme/v1/web/im_communication/resources/list/aggregation/', 'GET', query);
        const status = result(body, true);
        const invalid = () => status.statusCode !== 0 ? status : invalidPage();
        const data = record(body['custom_sticker_page_list']);
        if (!data || !Array.isArray(data['resources']))
            return invalid();
        if (!data['resources'].length)
            return status;
        const first = record(data['resources'][0]);
        const nextCursor = decimalId(data['next_cursor']);
        const completed = data['is_completed'];
        const enabled = data['sticker_enabled_status'];
        if (!first || nextCursor === undefined || ![true, false, 0, 1].includes(completed) ||
            (enabled !== undefined && enabled !== null && !['number', 'string', 'boolean'].includes(typeof enabled)))
            return invalid();
        const page = { nextCursor, hasMore: !completed,
            ...(enabled !== undefined ? { stickerEnabledStatus: enabled } : {}) };
        if (!Object.keys(first).length)
            return { ...status, page };
        const stickers = first['stickers'] ?? [];
        const forbidden = data['forbidden_sticker_ids'] ?? [];
        if (!Array.isArray(stickers) || !Array.isArray(forbidden) || !stickers.every(item => record(item) && emojiKey(item['id']) !== undefined) ||
            !forbidden.every(id => typeof id === 'string' || typeof id === 'number'))
            return invalid();
        page.stickers = stickers.filter(item => typeof item['video_id'] !== 'string' || item['video_id'].length === 0 || !forbidden.includes(item['video_id'])).reverse();
        return { ...status, page };
    }
    async request(path, method, query) {
        const params = desktopFingerprintParams((this.client.getDeviceId?.() ?? this.deviceId) || '0', this.guid || '0', this.screenSize, this.client.getUserAgent());
        params.set('iid', this.client.getInstallId?.() || '0');
        query?.forEach((value, key) => params.set(key, value));
        const url = `${ORIGIN}${path}?${params}`;
        const response = await this.client.requestRaw(url, {
            method, headers: { Accept: 'application/json, text/plain, */*', Referer: ORIGIN,
                'User-Agent': this.client.getUserAgent(), bgint_json_parser: '2' },
            ...(method === 'POST' ? { body: '' } : {}), signal: AbortSignal.timeout(15_000),
        }, false);
        if (response.headers.get('x-tt-verify-passport-decision')) {
            throw new ActionChallengeError('passport-decision', response.headers.get('x-tt-verify-passport-decision'));
        }
        if (response.headers.get('bdturing-verify'))
            throw new ActionChallengeError('bdturing', response.headers.get('bdturing-verify'));
        if (response.headers.get('x-vc-bdturing-parameters'))
            throw new DouyinResponseError('captcha', response.status, url, response.headers);
        const body = parseJsonResponse(response, url, { preserveLargeIntegers: true });
        if (!record(body))
            throw new DouyinResponseError('invalid-json', response.status, url, response.headers);
        const data = body;
        if (typeof data['verifyData'] === 'string' && data['verifyData'])
            throw new ActionChallengeError('bdturing', data['verifyData']);
        if (data['verifyData'])
            throw new DouyinResponseError('captcha', response.status, url, response.headers);
        return data;
    }
}
export function mergeCollectedEmojiPage(current, page, firstPage) {
    const entries = new Map();
    if (!(firstPage && page.stickers !== undefined)) {
        for (const item of current?.stickers ?? [])
            entries.set(String(item['id']), item);
    }
    for (const item of page.stickers ?? []) {
        const id = String(item['id']);
        if (firstPage || !entries.has(id))
            entries.set(id, item);
    }
    return structuredClone({ stickers: [...entries.values()], nextCursor: page.nextCursor,
        hasMore: page.hasMore, ...(page.stickerEnabledStatus !== undefined ? { stickerEnabledStatus: page.stickerEnabledStatus } : {}) });
}
export function addCollectedEmoji(current, item) {
    const id = emojiKey(item['id']);
    if (id === undefined)
        return current;
    const base = current ?? { stickers: [], nextCursor: '0', hasMore: false, stickerEnabledStatus: 1 };
    if (base.stickers.some(existing => String(existing['id']) === id))
        return current;
    const entities = Object.create(null);
    for (const existing of base.stickers)
        entities[String(existing['id'])] = existing;
    return structuredClone({ ...base, stickers: [item, ...Object.values(entities)] });
}
function emojiKey(value) {
    if (typeof value === 'string' && value.length)
        return value;
    return typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : undefined;
}
function decimalId(value) {
    if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0)
        return String(value);
    return typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value) ? value : undefined;
}
function invalidPage() {
    return { statusCode: -3, statusMsg: 'Desktop response missing or invalid collected emoji page' };
}
function record(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : undefined;
}
function result(body, optionalStatus = false) {
    const raw = body['status_code'];
    const code = raw === undefined && optionalStatus ? 0 : typeof raw === 'number' && Number.isSafeInteger(raw) ? raw : -3;
    return { statusCode: code === 200 ? 0 : code, statusMsg: typeof body['status_msg'] === 'string' ? body['status_msg'] : '' };
}
//# sourceMappingURL=emoji.js.map