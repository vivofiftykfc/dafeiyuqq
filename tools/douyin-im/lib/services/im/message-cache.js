export function isOrdinaryMessageType(type) {
    return type < 50000 && type !== 40001;
}
function messageKey(message) {
    if (message.msgId && message.msgId !== '0')
        return `s:${message.msgId}`;
    if (message.clientMessageId)
        return `c:${message.clientMessageId}`;
    return undefined;
}
export function normalizeClientId(id) {
    return id.replace(/[A-Z]/g, character => character.toLowerCase());
}
export function messageClientId(message) {
    return normalizeClientId(message.ext?.['s:client_message_id'] ?? message.clientMessageId ?? '');
}
function positiveOrder(value) {
    if (!value || !/^[0-9]+$/.test(value))
        return false;
    const order = BigInt(value);
    return order > 0n && order <= 9223372036854775807n;
}
export function prepareMessageCacheWrite(incoming, source, current) {
    if (source === 'server' && !isOrdinaryMessageType(incoming.msgType))
        return undefined;
    const message = structuredClone(incoming);
    const id = messageClientId(message);
    if (id)
        message.clientMessageId = id;
    else
        delete message.clientMessageId;
    if (message.ext && Object.hasOwn(message.ext, 's:client_message_id')) {
        message.ext = { ...message.ext, 's:client_message_id': id };
    }
    const key = messageKey(message);
    if (!key || !message.threadId)
        return undefined;
    const matches = id ? [...current].filter(([, old]) => messageClientId(old) === id) : [];
    const visibleMatches = matches.filter(([, old]) => old.deleted !== true);
    if (source === 'send-ack' && (current.has(key) || matches.length > 0))
        return undefined;
    if (source === 'local-update' && !current.has(key) && matches.length === 0)
        return undefined;
    delete message.deleted;
    if (source === 'server') {
        const old = visibleMatches[0]?.[1];
        delete message.orderIndex;
        if (message.orderInConversation !== undefined)
            message.orderIndex = message.orderInConversation;
        if (old) {
            if (old.ext || message.ext)
                message.ext = { ...old.ext, ...message.ext };
            if (old.localExt || message.localExt)
                message.localExt = { ...old.localExt, ...message.localExt };
            if (!message.content && old.content)
                message.content = old.content;
            const previousOrder = old.orderIndex ?? old.orderInConversation;
            if (previousOrder !== undefined && positiveOrder(previousOrder))
                message.orderIndex = previousOrder;
        }
    }
    return { key, message, isNew: (!current.has(key) || current.get(key)?.deleted === true) && visibleMatches.length === 0,
        removeKeys: matches.map(([oldKey]) => oldKey).filter(oldKey => oldKey !== key) };
}
//# sourceMappingURL=message-cache.js.map