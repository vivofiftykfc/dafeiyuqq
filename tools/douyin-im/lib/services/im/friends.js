import { DouyinResponseError, parseJsonResponse } from '../../http/response.js';
import { ActionChallengeError } from '../../http/action-challenge.js';
import { desktopFingerprintParams, } from './desktop.js';
const DESKTOP_ORIGIN = 'https://imdesktop.douyin.com';
const FAMILIAR_LIST_PATH = '/aweme/v1/web/familiar/list/';
export class ImFriendApi {
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
    async getRecommendedContacts() {
        const params = this.commonParams();
        params.set('source', 'im_desktop');
        const url = `${DESKTOP_ORIGIN}/aweme/v1/web/im/friend/recommend/?${params}`;
        const response = await this.client.requestRaw(url, {
            method: 'GET', headers: { Accept: 'application/json, text/plain, */*',
                Referer: DESKTOP_ORIGIN, 'User-Agent': this.client.getUserAgent() },
            signal: AbortSignal.timeout(15_000),
        }, false);
        const body = parseJsonResponse(response, url, { preserveLargeIntegers: true });
        const statusCode = body['status_code'] === undefined ? 0
            : typeof body['status_code'] === 'number' && Number.isSafeInteger(body['status_code']) ? body['status_code'] : -3;
        const statusMsg = typeof body['status_msg'] === 'string' ? body['status_msg'] : '';
        if (statusCode !== 0)
            return { statusCode, statusMsg, contacts: [] };
        if (!body['friends'])
            return { statusCode, statusMsg, contacts: [] };
        const invalid = () => ({ statusCode: -3,
            statusMsg: 'Desktop response invalid recommended contacts', contacts: [] });
        if (!Array.isArray(body['friends']))
            return invalid();
        const contacts = [];
        for (const value of body['friends']) {
            if (!value || typeof value !== 'object' || Array.isArray(value))
                return invalid();
            const contact = {};
            for (const [key, field] of [['name', 'name'], ['avatar', 'url'], ['secUid', 'sec_uid']]) {
                if (value[field] == null)
                    continue;
                if (typeof value[field] !== 'string')
                    return invalid();
                contact[key] = value[field];
            }
            if (value.conversation_id != null) {
                if (typeof value.conversation_id === 'string')
                    contact.conversationId = value.conversation_id;
                else if (typeof value.conversation_id === 'number' && Number.isSafeInteger(value.conversation_id)) {
                    contact.conversationId = String(value.conversation_id);
                }
                else
                    return invalid();
            }
            if (value.active_time != null) {
                if (typeof value.active_time !== 'number' || !Number.isFinite(value.active_time))
                    return invalid();
                contact.lastActiveTime = value.active_time;
            }
            contacts.push(contact);
        }
        return { statusCode, statusMsg, contacts };
    }
    async readFollowerNoticePage(maxTime = '0', minTime = '1') {
        if (![maxTime, minTime].every(value => typeof value === 'string' && /^\d+$/.test(value))) {
            throw new TypeError('notice cursors must be non-negative decimal strings');
        }
        const params = this.commonParams();
        for (const [key, value] of Object.entries({ address_book_access: '1', appTheme: 'light', count: '20', gps_access: '0',
            is_mark_read: '1', is_new_notice: '1', max_time: maxTime, min_time: minTime, notice_group: '401', top_group: '0',
            user_avatar_shrink: '144_144', video_cover_shrink: '192_192' }))
            params.set(key, value);
        const url = `${DESKTOP_ORIGIN}/aweme/v1/web/notice/?${params}`;
        const response = await this.client.requestRaw(url, {
            method: 'GET', headers: { Accept: 'application/json, text/plain, */*', Referer: DESKTOP_ORIGIN,
                'User-Agent': this.client.getUserAgent() }, signal: AbortSignal.timeout(15_000),
        }, false);
        const body = parseJsonResponse(response, url, { preserveLargeIntegers: true });
        const statusCode = body['status_code'] === undefined ? 0
            : typeof body['status_code'] === 'number' && Number.isSafeInteger(body['status_code']) ? body['status_code'] : -3;
        const statusMsg = typeof body['status_msg'] === 'string' ? body['status_msg'] : '';
        if (statusCode !== 0)
            return { statusCode, statusMsg, notices: [], hasMore: false };
        const invalid = () => ({ statusCode: -3, statusMsg: 'Desktop response invalid follower notice page', notices: [], hasMore: false });
        if (!Array.isArray(body['notice_list_v2']) || ![0, 1, '0', '1'].includes(body['has_more']))
            return invalid();
        const notices = [];
        for (const raw of body['notice_list_v2']) {
            const notice = mapFollowerNotice(raw);
            if (!notice)
                return invalid();
            notices.push(notice);
        }
        const hasMore = body['has_more'] === 1 || body['has_more'] === '1';
        const nextMax = noticeCursor(body['max_time']), nextMin = noticeCursor(body['min_time']);
        if (hasMore && (!nextMax || !nextMin))
            return invalid();
        return { statusCode: 0, statusMsg, notices, hasMore,
            ...(nextMax !== undefined ? { maxTime: nextMax } : {}), ...(nextMin !== undefined ? { minTime: nextMin } : {}) };
    }
    async getNewFollowerCount() {
        const params = this.commonParams();
        params.set('is_new_notice', '1');
        params.set('need_social_count', '1');
        const url = `${DESKTOP_ORIGIN}/aweme/v1/web/notice/count/?${params}`;
        const response = await this.client.requestRaw(url, {
            method: 'GET',
            headers: {
                Accept: 'application/json, text/plain, */*',
                'User-Agent': this.client.getUserAgent(),
                Referer: DESKTOP_ORIGIN,
            },
            signal: AbortSignal.timeout(15_000),
        }, false);
        const body = parseJsonResponse(response, url);
        const statusCode = body['status_code'] === undefined ? 0
            : typeof body['status_code'] === 'number' && Number.isSafeInteger(body['status_code'])
                ? body['status_code'] : -3;
        const result = { statusCode, statusMsg: typeof body['status_msg'] === 'string' ? body['status_msg'] : '' };
        if (statusCode !== 0)
            return result;
        const counts = body['notice_count'];
        if (!Array.isArray(counts))
            return { statusCode: -3, statusMsg: 'Desktop response missing or invalid notice_count' };
        for (const item of counts) {
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
                return { statusCode: -3, statusMsg: 'Desktop response invalid notice_count entry' };
            }
            if (item.group !== 401 && item.group !== '401')
                continue;
            if (typeof item.count !== 'number' || !Number.isSafeInteger(item.count) || item.count < 0) {
                return { statusCode: -3, statusMsg: 'Desktop response invalid group401 count' };
            }
            return { ...result, count: item.count };
        }
        return result;
    }
    async list(options = {}) {
        const count = options.count ?? 100;
        if (!Number.isSafeInteger(count) || count < 1 || count > 100) {
            throw new RangeError('friend list count must be an integer between 1 and 100');
        }
        const params = this.commonParams();
        const sourceParams = {
            version_code: '21.6.0',
            cursor: String(options.cursor ?? 0),
            vcd_count: '0',
            hotsoon_has_more: '0',
            only_total: '0',
            count: String(count),
            order_by: '1',
            need_all_friend: '1',
            recommend_type: '22',
        };
        for (const [key, value] of Object.entries(sourceParams))
            params.set(key, value);
        const url = `${DESKTOP_ORIGIN}${FAMILIAR_LIST_PATH}?${params}`;
        const response = await this.client.requestRaw(url, {
            method: 'GET',
            headers: {
                Accept: 'application/json, text/plain, */*',
                'User-Agent': this.client.getUserAgent(),
                Referer: DESKTOP_ORIGIN,
                bgint_json_parser: '2',
            },
            signal: AbortSignal.timeout(15_000),
        }, false);
        const body = parseJsonResponse(response, url, { preserveLargeIntegers: true });
        const apiStatus = body.status_code == null ? -1 : Number(body.status_code);
        const statusCode = response.ok ? apiStatus : response.status;
        const result = {
            statusCode,
            statusMsg: String(body.status_msg ?? ''),
        };
        return {
            ...result,
            hasMore: statusCode === 0 && Boolean(body.has_more),
            cursor: String(body.cursor ?? '0'),
            total: String(body.total ?? body.total_count ?? '0'),
            userList: statusCode === 0 ? mapFamiliarUsers(body) : [],
            friendUids: statusCode === 0 ? (body.friend_list ?? []).map(String) : [],
            ...(Array.isArray(body.close_friend_list) ? { closeFriendUids: body.close_friend_list.map(String) } : {}),
        };
    }
    async setFollowed(options) {
        assertUid(options.uid);
        if (!options.secUid.trim())
            throw new Error('secUid is required to follow a user');
        if (typeof options.followed !== 'boolean')
            throw new TypeError('followed must be a boolean');
        if (this.client.requiresTicket?.(`${DESKTOP_ORIGIN}/aweme/v1/web/commit/follow/user/`) !== false && !this.client.hasBoundTicket?.()) {
            throw new Error('当前 Session 缺少绑定的 Desktop 安全票据，无法关注；需要同一账号登录响应建立 native BDTicket 绑定');
        }
        const params = this.commonParams();
        params.set('user_id', options.uid);
        params.set('secUid', options.secUid);
        params.set('type', options.followed ? '1' : '0');
        params.set('tag', 'frienddetail');
        params.set('verifyFp', `verify_${params.get('device_id')}`);
        const url = `${DESKTOP_ORIGIN}/aweme/v1/web/commit/follow/user/?${params}`;
        const response = await this.client.requestRaw(url, {
            method: 'POST',
            headers: { Accept: 'application/json, text/plain, */*', 'Content-Type': 'application/x-www-form-urlencoded',
                Referer: DESKTOP_ORIGIN, 'User-Agent': this.client.getUserAgent() },
            body: '',
            signal: AbortSignal.timeout(15_000),
        }, false);
        if (!response.ok)
            throw new DouyinResponseError('http', response.status, url, response.headers);
        const bdturing = response.headers.get('bdturing-verify');
        let bdturingBody;
        if (bdturing) {
            try {
                bdturingBody = JSON.parse(response.rawText);
            }
            catch {
                bdturingBody = response.rawText;
            }
            if (bdturingBody !== null && typeof bdturingBody !== 'object') {
                throw new DouyinResponseError(response.rawText.trim() ? 'invalid-json' : 'empty', response.status, url, response.headers);
            }
        }
        if (response.headers.get('x-tt-verify-passport-decision')) {
            throw new ActionChallengeError('passport-decision', response.headers.get('x-tt-verify-passport-decision'));
        }
        if (bdturing && bdturingBody !== null) {
            throw new ActionChallengeError('bdturing', bdturing);
        }
        if (response.headers.get('x-vc-bdturing-parameters')) {
            throw new DouyinResponseError('captcha', response.status, url, response.headers);
        }
        const body = parseJsonResponse(response, url);
        if (typeof body['verifyData'] === 'string' && body['verifyData'])
            throw new ActionChallengeError('bdturing', body['verifyData']);
        if (body['verifyData'])
            throw new DouyinResponseError('captcha', response.status, url, response.headers);
        const statusCode = typeof body['status_code'] === 'number' && Number.isSafeInteger(body['status_code'])
            ? body['status_code'] : -1;
        const followStatus = body['follow_status'];
        const knownState = typeof followStatus === 'number' && [0, 1, 2, 4].includes(followStatus);
        return {
            statusCode: statusCode === 0 && !knownState ? -1 : statusCode,
            statusMsg: typeof body['status_msg'] === 'string' ? body['status_msg'] : '',
            ...(statusCode === 0 && knownState ? { followStatus: followStatus } : {}),
        };
    }
    async setRemark(options) {
        assertUid(options.uid);
        if (!options.secUid.trim())
            throw new Error('secUid is required to set a remark');
        if (typeof options.remark !== 'string')
            throw new TypeError('remark must be a string');
        if (options.remark.length > 20)
            throw new RangeError('remark must not exceed 20 characters');
        const remark = /^\s*$/.test(options.remark) ? '' : options.remark;
        const form = new FormData();
        form.append('user_id', options.uid);
        form.append('sec_user_id', options.secUid);
        form.append('remark_name', remark);
        const url = `${DESKTOP_ORIGIN}/aweme/v1/web/user/remark/name/?${this.commonParams()}`;
        const response = await this.client.requestRaw(url, {
            method: 'POST',
            headers: { Referer: DESKTOP_ORIGIN },
            body: form,
            signal: AbortSignal.timeout(15_000),
        });
        const decoded = parseJsonResponse(response, url);
        const code = decoded['status_code'];
        const numericCode = typeof code === 'number' || (typeof code === 'string' && /^-?\d+$/.test(code)) ? Number(code) : -1;
        const statusCode = Number.isSafeInteger(numericCode) ? numericCode : -1;
        const statusMsg = typeof decoded['status_msg'] === 'string' ? decoded['status_msg'] : '';
        if (statusCode !== 0 && statusCode !== 200)
            return { statusCode, statusMsg };
        if (typeof decoded['remark_name'] !== 'string' || decoded['remark_name'] !== remark) {
            return { statusCode: -3, statusMsg: 'Desktop response did not confirm requested remark' };
        }
        return { statusCode: 0, statusMsg, remark: decoded['remark_name'] };
    }
    commonParams() {
        const deviceId = this.client.getDeviceId?.() ?? this.deviceId;
        const params = desktopFingerprintParams(deviceId || '0', this.guid || '0', this.screenSize, this.client.getUserAgent());
        params.set('iid', this.client.getInstallId?.() || '0');
        return params;
    }
}
function noticeCursor(value) {
    if (typeof value === 'string' && /^\d+$/.test(value))
        return value;
    if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0)
        return String(value);
    return undefined;
}
function mapFollowerNotice(value) {
    const object = (raw) => raw && typeof raw === 'object' && !Array.isArray(raw)
        ? raw : undefined;
    const raw = object(value), follow = object(raw?.['follow']), user = object(follow?.['from_user']);
    if (!raw || !follow || !user)
        return undefined;
    const uid = noticeCursor(user['uid']);
    if (!uid || uid === '0' || typeof user['sec_uid'] !== 'string' || typeof user['nickname'] !== 'string')
        return undefined;
    const avatar = object(user['avatar_300x300']);
    if (!avatar || !Array.isArray(avatar['url_list']) || avatar['url_list'].some(url => typeof url !== 'string'))
        return undefined;
    const result = { uid, secUid: user['sec_uid'], nickname: user['nickname'] };
    if (avatar['url_list'].length)
        result.avatar = avatar['url_list'][0];
    for (const [key, source, field] of [
        ['remark', user, 'remark_name'], ['avatarUri', avatar, 'uri'], ['content', follow, 'content'],
    ]) {
        const text = source[field];
        if (text !== undefined && text !== null) {
            if (typeof text !== 'string')
                return undefined;
            result[key] = text;
        }
    }
    for (const [key, source, field] of [
        ['createTime', raw, 'create_time'], ['followStatus', user, 'follow_status'], ['followerStatus', user, 'follower_status'],
    ]) {
        const number = source[field];
        if (number !== undefined && number !== null) {
            if (typeof number !== 'number' || !Number.isSafeInteger(number))
                return undefined;
            result[key] = number;
        }
    }
    const hasRead = raw['has_read'];
    if (hasRead !== undefined && hasRead !== null) {
        if (typeof hasRead !== 'boolean' && (typeof hasRead !== 'number' || !Number.isSafeInteger(hasRead)))
            return undefined;
        result.hasRead = hasRead;
    }
    return result;
}
function mapFamiliarUsers(body) {
    return (body.user_list ?? [])
        .filter((user) => Number(user.user_canceled ?? 0) === 0)
        .filter(user => user.uid != null && String(user.uid) !== '' && String(user.uid) !== '0')
        .map(user => {
        const uid = String(user.uid);
        const avatar = firstUrl(user.avatar_thumb) || firstUrl(user.avatar_168x168);
        return {
            uid,
            nickname: String(user.nickname ?? ''),
            ...(avatar ? { avatar } : {}),
            ...(user.sec_uid ? { secUid: user.sec_uid } : {}),
            ...(typeof user.remark_name === 'string' ? { remark: user.remark_name } : {}),
            ...(typeof user.signature === 'string' ? { signature: user.signature } : {}),
        };
    });
}
function firstUrl(value) {
    return value?.url_list?.find(Boolean) ?? '';
}
function assertUid(uid) {
    if (!/^\d+$/.test(uid))
        throw new Error('uid must be a decimal int64 string');
}
//# sourceMappingURL=friends.js.map