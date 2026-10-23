import { parseJsonResponse } from '../../http/response.js';
import { desktopFingerprintParams } from './desktop.js';
const DESKTOP_ORIGIN = 'https://imdesktop.douyin.com';
const USER_PROFILE_ENDPOINT = `${DESKTOP_ORIGIN}/aweme/v1/web/user/profile/other/`;
const USER_INFO_ENDPOINT = `${DESKTOP_ORIGIN}/aweme/v1/web/im/user/info/`;
const USER_BLOCK_ENDPOINT = 'https://imdesktop.douyin.com/aweme/v1/web/user/block/';
function uidString(value) {
    if (typeof value === 'string' && /^\d+$/.test(value))
        return value;
    if (typeof value === 'bigint')
        return value.toString();
    if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0)
        return String(value);
    return '';
}
export class ImUserDirectory {
    client;
    deviceId;
    cache = new Map();
    constructor(client, deviceId) {
        this.client = client;
        this.deviceId = deviceId;
    }
    async getActiveStatus(secUids, conversationIds = []) {
        for (const ids of [secUids, conversationIds]) {
            if (!Array.isArray(ids) || Array.from(ids).some(id => typeof id !== 'string' || !id.trim())) {
                throw new TypeError('active status IDs must be arrays of non-empty strings');
            }
        }
        const form = new FormData();
        form.append('source', 'session_list');
        form.append('sec_user_ids', JSON.stringify(secUids));
        form.append('conv_ids', JSON.stringify(conversationIds));
        const url = `${DESKTOP_ORIGIN}/aweme/v1/web/im/user/active/status/?${this.commonParams()}`;
        const response = await this.client.requestRaw(url, {
            method: 'POST', body: form,
            headers: { Accept: 'application/json, text/plain, */*', Referer: DESKTOP_ORIGIN, 'User-Agent': this.client.getUserAgent() },
            signal: AbortSignal.timeout(15_000),
        }, false);
        const body = parseJsonResponse(response, url, { preserveLargeIntegers: true });
        return mapActiveStatus(body);
    }
    async searchUsers(keyword, cursor = 0) {
        if (typeof keyword !== 'string')
            throw new TypeError('search keyword must be a string');
        if (!Number.isSafeInteger(cursor) || cursor < 0 || cursor % 30 !== 0 || cursor > Number.MAX_SAFE_INTEGER - 30) {
            throw new RangeError('search cursor must be a non-negative safe multiple of 30 with room for the next page');
        }
        const params = this.commonParams();
        for (const [key, value] of Object.entries({
            keyword, search_source: 'search_sug', count: '30', cursor: String(cursor), type: '1',
            search_scene: 'douyin_search', enter_from: 'homepage_hot', version_code: '21.6.0',
        }))
            params.set(key, value);
        const url = `https://www.douyin.com/aweme/v1/web/discover/search/?${params}`;
        const response = await this.client.requestRaw(url, {
            method: 'GET',
            headers: { Accept: 'application/json, text/plain, */*', Referer: DESKTOP_ORIGIN, 'User-Agent': this.client.getUserAgent() },
            signal: AbortSignal.timeout(15_000),
        }, false);
        const body = parseJsonResponse(response, url, { preserveLargeIntegers: true });
        const empty = { keyword, cursor, hasMore: false, users: [] };
        const statusCode = body['status_code'] === undefined ? 0
            : typeof body['status_code'] === 'number' && Number.isSafeInteger(body['status_code']) ? body['status_code'] : -3;
        const statusMsg = typeof body['status_msg'] === 'string' ? body['status_msg'] : '';
        if (statusCode !== 0)
            return { ...empty, statusCode, statusMsg };
        if (body['input_keyword'] !== keyword) {
            return { ...empty, statusCode: -3, statusMsg: 'Desktop search response keyword mismatch' };
        }
        const list = body['user_list'], more = body['has_more'];
        if (!Array.isArray(list) || typeof more !== 'number' || !Number.isSafeInteger(more) || more < 0) {
            return { ...empty, statusCode: -3, statusMsg: 'Desktop search response missing or invalid page' };
        }
        const users = [];
        for (const item of list) {
            const user = item && typeof item === 'object' ? item.user_info : undefined;
            const profile = mapProfile(user);
            if (!profile)
                return { ...empty, statusCode: -3, statusMsg: 'Desktop search response invalid user_info' };
            users.push({ ...profile, ...(typeof user.unique_id === 'string' ? { uniqueId: user.unique_id } : {}) });
        }
        return { keyword, cursor, statusCode, statusMsg, users, hasMore: more > 0,
            ...(more > 0 ? { nextCursor: cursor + 30 } : {}) };
    }
    async resolve(secUids) {
        const unique = [...new Set(secUids.filter(Boolean))];
        const missing = unique.filter((secUid) => !this.cache.has(secUid));
        for (let offset = 0; offset < missing.length; offset += 50) {
            const batch = missing.slice(offset, offset + 50);
            const form = new FormData();
            form.append('sec_user_ids', JSON.stringify(batch));
            const url = `${USER_INFO_ENDPOINT}?${this.commonParams()}`;
            try {
                const response = await this.client.requestRaw(url, {
                    method: 'POST', body: form, headers: { Referer: DESKTOP_ORIGIN, 'User-Agent': this.client.getUserAgent() },
                    signal: AbortSignal.timeout(15_000),
                }, false);
                const body = parseJsonResponse(response, url);
                if (body.status_code !== 0 || !Array.isArray(body.data))
                    continue;
                for (const item of body.data) {
                    const profile = mapProfile(item);
                    if (profile && batch.includes(profile.secUid))
                        this.cache.set(profile.secUid, profile);
                }
            }
            catch { }
        }
        return unique.flatMap((secUid) => {
            const profile = this.cache.get(secUid);
            return profile ? [profile] : [];
        });
    }
    async setBlocked(options) {
        if (!/^\d+$/.test(options.uid))
            throw new Error('uid must be a decimal string');
        if (!options.secUid.trim())
            throw new Error('secUid is required to change block status');
        const params = this.commonParams();
        params.set('user_id', options.uid);
        params.set('sec_user_id', options.secUid);
        params.set('block_type', options.blocked ? '1' : '0');
        params.set('source', String(options.source ?? 0));
        const url = `${USER_BLOCK_ENDPOINT}?${params}`;
        const response = await this.client.requestRaw(url, {
            method: 'GET',
            headers: { Referer: 'https://imdesktop.douyin.com' },
            signal: AbortSignal.timeout(15_000),
        });
        const decoded = parseJsonResponse(response, url);
        return {
            statusCode: response.ok && decoded.status_code != null
                ? Number(decoded.status_code)
                : response.ok ? -1 : response.status,
            statusMsg: String(decoded.status_msg ?? decoded.message ?? ''),
        };
    }
    async getProfile(secUid) {
        if (!secUid.trim())
            throw new Error('secUid is required to read a profile');
        const params = this.commonParams();
        params.set('sec_user_id', secUid);
        params.set('source', 'together');
        const url = `${USER_PROFILE_ENDPOINT}?${params}`;
        const response = await this.client.requestRaw(url, {
            method: 'GET',
            headers: {
                Referer: DESKTOP_ORIGIN,
                'User-Agent': this.client.getUserAgent(),
            },
            signal: AbortSignal.timeout(15_000),
        }, false);
        const decoded = parseJsonResponse(response, url);
        if (decoded.status_code !== 0 || !decoded.user)
            return undefined;
        const profile = mapProfile(decoded.user);
        if (profile?.secUid !== secUid)
            return undefined;
        this.cache.set(secUid, profile);
        return profile;
    }
    commonParams() {
        const params = desktopFingerprintParams((this.client.getDeviceId?.() ?? this.deviceId) || '0', this.client.getGuid?.() || '0', this.client.getScreenSize?.() ?? { width: 1728, height: 1117 }, this.client.getUserAgent());
        params.set('iid', this.client.getInstallId?.() || '0');
        return params;
    }
}
function mapActiveStatus(body) {
    const statusCode = body['status_code'] === undefined ? 0
        : typeof body['status_code'] === 'number' && Number.isSafeInteger(body['status_code']) ? body['status_code'] : -3;
    const result = { statusCode, statusMsg: typeof body['status_msg'] === 'string' ? body['status_msg'] : '' };
    if (statusCode !== 0)
        return result;
    const invalid = () => ({ statusCode: -3, statusMsg: 'Desktop active status response missing or invalid data' });
    if (body['data'] === undefined && body['conv_data'] === undefined)
        return invalid();
    if (body['data'] != null) {
        if (!Array.isArray(body['data']))
            return invalid();
        result.users = [];
        for (const item of body['data']) {
            if (!item || typeof item !== 'object' || Array.isArray(item) || typeof item.sec_user_id !== 'string' || !item.sec_user_id)
                return invalid();
            if (item.last_active_time != null && (typeof item.last_active_time !== 'number' || !Number.isSafeInteger(item.last_active_time)))
                return invalid();
            result.users.push({ secUid: item.sec_user_id, ...(item.last_active_time != null ? { lastActiveTime: item.last_active_time } : {}) });
        }
    }
    if (body['conv_data'] != null) {
        if (!Array.isArray(body['conv_data']))
            return invalid();
        result.conversations = [];
        for (const item of body['conv_data']) {
            if (!item || typeof item !== 'object' || Array.isArray(item))
                return invalid();
            const id = typeof item.conv_id === 'string' && item.conv_id ? item.conv_id : uidString(item.conv_id);
            if (!id)
                return invalid();
            if (item.online != null && typeof item.online !== 'boolean'
                && (typeof item.online !== 'number' || !Number.isSafeInteger(item.online)))
                return invalid();
            let toast;
            if (item.toast != null) {
                if (!Array.isArray(item.toast))
                    return invalid();
                toast = [];
                for (const text of item.toast) {
                    if (!text || typeof text !== 'object' || typeof text.lang !== 'string' || typeof text.content !== 'string')
                        return invalid();
                    toast.push({ lang: text.lang, content: text.content });
                }
            }
            result.conversations.push({ conversationId: id, ...(item.online != null ? { online: item.online } : {}), ...(toast !== undefined ? { toast } : {}) });
        }
    }
    return result;
}
export function mapProfile(value) {
    if (!value || typeof value !== 'object')
        return undefined;
    const user = value;
    const uid = uidString(user['uid']);
    const secUid = user['sec_uid'];
    if (!uid || uid === '0' || typeof secUid !== 'string' || !secUid)
        return undefined;
    const avatar = user['avatar_thumb'];
    const avatarThumb = Array.isArray(avatar?.url_list) ? avatar.url_list.find((url) => typeof url === 'string' && url) : undefined;
    return {
        uid, secUid, nickname: typeof user['nickname'] === 'string' ? user['nickname'] : '',
        ...(avatarThumb ? { avatarThumb } : {}),
        ...(typeof user['follow_status'] === 'number' ? { followStatus: user['follow_status'] } : {}),
        ...(typeof user['follower_status'] === 'number' ? { followerStatus: user['follower_status'] } : {}),
        ...(typeof user['remark_name'] === 'string' ? { remark: user['remark_name'] } : {}),
        ...([true, false, 0, 1].includes(user['is_block']) ? { blocked: Boolean(user['is_block']) } : {}),
    };
}
//# sourceMappingURL=user-directory.js.map