export function messageContentBytes(value) {
    if (value instanceof Uint8Array)
        return value;
    if (typeof value === 'string')
        return Buffer.from(value, 'utf8');
    return new Uint8Array(0);
}
export function messageContentText(value) {
    if (typeof value === 'string')
        return value;
    return new TextDecoder().decode(messageContentBytes(value));
}
//# sourceMappingURL=message-content.js.map