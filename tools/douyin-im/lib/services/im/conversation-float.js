import { parseJsonWithBigInts, readJsonInteger } from '../../http/lossless-json.js';
function object(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
export function isDesktopFloatMessage(message, userId, config) {
    const aweType = Number(readJsonInteger(message.content, 'aweType', 32) ?? -1n);
    if (!config?.enable || !config.notFloatMessages?.[message.msgType]?.includes(aweType))
        return true;
    let content;
    try {
        content = parseJsonWithBigInts(message.content);
    }
    catch {
        return false;
    }
    if (!object(content))
        return false;
    if (message.msgType === 1 && aweType === 0)
        return content['tips'] === '创建成功，快邀请你的粉丝进群吧！';
    if (message.msgType !== 1001)
        return false;
    const passive = aweType === 100110 || aweType === 100140;
    if (!passive && ![100118, 100113, 100101, 100102].includes(aweType))
        return false;
    const users = content[passive ? 'passive_users' : 'active_users'];
    if (!Array.isArray(users))
        return false;
    for (const user of users) {
        if (!object(user))
            continue;
        const uid = user['uid'];
        if (typeof uid === 'bigint')
            return String(uid) === userId;
        if (passive)
            return false;
    }
    return false;
}
export const DESKTOP_PIN_OFFSET = 500000000000000;
export function desktopCellSortTime(value) {
    const prefix = value?.match(/^[ \t\n\r\f\v]*[+-]?\d+/)?.[0];
    if (!prefix)
        return 0n;
    const seconds = BigInt(prefix.trim());
    if (seconds < -9223372036854775808n || seconds > 9223372036854775807n)
        return 0n;
    return BigInt.asIntN(64, seconds * 1000n);
}
export function calculateDesktopSortOrder(state, timestamp, pinned, cellSortTime) {
    if (!Number.isSafeInteger(timestamp) || timestamp > DESKTOP_PIN_OFFSET)
        return false;
    state.lastMessageTime = Math.max(state.lastMessageTime, timestamp);
    const previous = state.sortOrder;
    const time = BigInt(state.lastMessageTime);
    state.sortOrder = String(pinned ? time + BigInt(DESKTOP_PIN_OFFSET) : time > cellSortTime ? time : cellSortTime);
    return state.sortOrder !== previous;
}
//# sourceMappingURL=conversation-float.js.map