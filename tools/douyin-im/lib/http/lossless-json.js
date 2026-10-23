export function parseLosslessJson(text) {
    JSON.parse(text);
    return JSON.parse(text.replace(/"(?:\\.|[^"\\])*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/g, token => {
        if (token.startsWith('"') || !/^-?\d+$/.test(token))
            return token;
        return Number.isSafeInteger(Number(token)) ? token : JSON.stringify(token);
    }));
}
export function parseJsonWithBigInts(text) {
    JSON.parse(text);
    const pattern = /"(?:\\.|[^"\\])*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
    const tokens = text.match(pattern) ?? [];
    const strings = tokens.filter(token => token.startsWith('"')).map(token => JSON.parse(token));
    let marker = '__native_integer__';
    while (strings.some(value => value.startsWith(marker)))
        marker += '_';
    const rewritten = text.replace(pattern, token => /^-?\d+$/.test(token) ? JSON.stringify(marker + token) : token);
    return JSON.parse(rewritten, (_key, value) => {
        if (typeof value !== 'string' || !value.startsWith(marker))
            return value;
        const integer = BigInt(value.slice(marker.length));
        return integer >= -9223372036854775808n && integer <= 18446744073709551615n ? integer : Number(integer);
    });
}
export function readJsonInteger(text, key, bits) {
    let parsed;
    try {
        parsed = JSON.parse(text);
    }
    catch {
        return undefined;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        return undefined;
    const tokens = text.match(/"(?:\\.|[^"\\])*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null|[{}[\]:,]/g) ?? [];
    let depth = 0;
    let literal;
    for (let index = 0; index < tokens.length; index++) {
        const token = tokens[index];
        if (depth === 1 && token.startsWith('"') && tokens[index + 1] === ':' && JSON.parse(token) === key) {
            literal = tokens[index + 2];
        }
        if (token === '{' || token === '[')
            depth++;
        if (token === '}' || token === ']')
            depth--;
    }
    if (!literal || !/^-?\d+$/.test(literal))
        return undefined;
    const value = BigInt(literal);
    if (value < -9223372036854775808n || value > 18446744073709551615n)
        return undefined;
    return BigInt.asIntN(bits, value);
}
//# sourceMappingURL=lossless-json.js.map