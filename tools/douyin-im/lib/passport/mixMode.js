export function mixModeEncode(plain) {
    const bytes = Buffer.from(plain.replace(/[\uD800-\uDFFF]/g, ''), 'utf8');
    let out = '';
    for (let i = 0; i < bytes.length; i++) {
        out += (bytes[i] ^ 5).toString(16);
    }
    return out;
}
export function normalizePassportMobile(raw, defaultCountryCode = '86') {
    const separated = raw.trim().match(/^(\+\d{1,3})\s+(.+)$/s);
    if (separated) {
        const local = separated[2].replace(/[\s\-()]/g, '');
        if (!local)
            throw new Error('手机号不能为空');
        if (!/^\d+$/.test(local))
            throw new Error('手机号格式不正确');
        return `${separated[1]} ${local}`;
    }
    const compact = raw.trim().replace(/[\s\-()]/g, '');
    if (!compact)
        throw new Error('手机号不能为空');
    const prefix = `+${defaultCountryCode}`;
    if (compact.startsWith(prefix)) {
        const local = compact.slice(prefix.length);
        if (!local)
            throw new Error('手机号不能为空');
        if (!/^\d+$/.test(local))
            throw new Error('手机号格式不正确');
        return `${prefix} ${local}`;
    }
    if (compact.startsWith('+')) {
        if (!/^\+\d+$/.test(compact))
            throw new Error('手机号格式不正确');
        return compact;
    }
    const digits = compact.replace(/\D/g, '');
    if (!digits)
        throw new Error('手机号格式不正确');
    const local = digits.startsWith(defaultCountryCode) && digits.length > 11
        ? digits.slice(defaultCountryCode.length)
        : digits;
    return `+${defaultCountryCode} ${local}`;
}
export function mixModeEncodeMobile(mobile, countryCode = '86') {
    return mixModeEncode(normalizePassportMobile(mobile, countryCode));
}
export const SEND_CODE_TYPE_PLAIN = '24';
export function mixModeEncodeSendCodeType(typePlain = SEND_CODE_TYPE_PLAIN) {
    return mixModeEncode(typePlain);
}
//# sourceMappingURL=mixMode.js.map