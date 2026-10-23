export function selectStrangerConversations(rows) {
    return rows.filter(row => row.isInStrangerBox === true && row.deleted !== true)
        .map(row => {
        const value = row.sortOrder ?? '0';
        if (!/^-?\d+$/.test(value))
            throw new Error('Invalid local stranger sort order');
        const order = BigInt(value);
        if (order < -9223372036854775808n || order > 9223372036854775807n)
            throw new Error('Local stranger sort order exceeds int64');
        return { row, order };
    }).filter(item => item.order !== 0n)
        .sort((a, b) => a.order > b.order ? -1 : a.order < b.order ? 1 : 0)
        .map(item => structuredClone(item.row));
}
//# sourceMappingURL=stranger-list.js.map