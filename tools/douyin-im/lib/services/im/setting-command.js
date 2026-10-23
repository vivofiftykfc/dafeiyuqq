import { parseJsonWithBigInts } from '../../http/lossless-json.js';
function field(value, key) {
    return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.hasOwn(value, key)
        ? value[key] : undefined;
}
function integer(value, bits) {
    return typeof value === 'bigint' ? BigInt.asIntN(bits, value) : 0n;
}
function string(value) { return typeof value === 'string' ? value : ''; }
export function settingCommand(messageType, content) {
    if (messageType !== 50001)
        return undefined;
    let raw;
    try {
        raw = parseJsonWithBigInts(content);
    }
    catch {
        return undefined;
    }
    if (integer(field(raw, 'command_type'), 32) !== 4n)
        return undefined;
    const entries = field(raw, 'ext_data');
    return {
        conversationId: string(field(raw, 'conversation_id')),
        version: String(integer(field(raw, 'conversation_version'), 64)),
        entries: Array.isArray(entries) ? entries.map(entry => ({
            key: string(field(entry, 'key')), value: string(field(entry, 'value')),
            version: String(integer(field(entry, 'version'), 64)), op: Number(integer(field(entry, 'op_type'), 32)),
        })) : [],
    };
}
export function conversationIsFolded(ext) {
    return !!ext && Object.hasOwn(ext, 'a:s_is_folded') && ext['a:s_is_folded'] === '1';
}
export function applySettingExt(current, entries) {
    const values = new Map(Object.entries(current.settingExt ?? {}));
    const versions = new Map(Object.entries(current.settingExtVersions ?? {}));
    let changed = false;
    const result = (handled) => ({ handled, changed,
        state: { settingExt: Object.fromEntries(values), settingExtVersions: Object.fromEntries(versions) } });
    if (!entries.length || !versions.size)
        return result(false);
    for (const entry of entries) {
        if (entry.op !== 1 && entry.op !== 2)
            continue;
        const version = BigInt(entry.version);
        const previous = BigInt(versions.get(entry.key) ?? '0');
        if (version > previous) {
            if (entry.op === 1) {
                values.set(entry.key, entry.value);
                versions.set(entry.key, entry.version);
            }
            else {
                values.delete(entry.key);
                versions.delete(entry.key);
            }
            changed = true;
        }
        else if (version === 0n)
            return result(false);
    }
    return result(true);
}
//# sourceMappingURL=setting-command.js.map