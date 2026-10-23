export function normalizeStrangerCursors(value) {
    const result = value ?? { version: '0', loadMoreVersion: '-1' };
    const normalize = (input) => {
        if (typeof input !== 'string' || !/^-?\d+$/.test(input))
            throw new TypeError('Invalid stranger sync cursor');
        const number = BigInt(input);
        if (number < -9223372036854775808n || number > 9223372036854775807n)
            throw new RangeError('Stranger sync cursor outside int64');
        return number.toString();
    };
    return { version: normalize(result.version), loadMoreVersion: normalize(result.loadMoreVersion) };
}
//# sourceMappingURL=stranger-cursors.js.map