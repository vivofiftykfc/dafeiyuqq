import { readJsonInteger } from '../../http/lossless-json.js';
export function conversationDeletionCommand(messageType, content) {
    if (messageType !== 50001)
        return undefined;
    const type = readJsonInteger(content, 'command_type', 32);
    if (type !== 3n && type !== 620n && type !== 1010n)
        return undefined;
    const body = JSON.parse(content);
    const index = readJsonInteger(content, 'last_message_index', 64);
    if (typeof body['conversation_id'] !== 'string' || !body['conversation_id'] || index === undefined)
        return undefined;
    return { conversationId: body['conversation_id'], lastMessageIndex: String(index) };
}
export function signedMessageIndex(value) {
    if (typeof value !== 'string' || !/^-?\d+$/.test(value))
        throw new TypeError('Invalid conversation deletion index');
    const index = BigInt(value);
    if (index < -9223372036854775808n || index > 9223372036854775807n)
        throw new RangeError('Conversation deletion index exceeds int64');
    return index;
}
export function maxStoredMessageIndex(messages) {
    let max;
    for (const message of messages) {
        const index = signedMessageIndex(message.indexInConversation ?? '0');
        if (max === undefined || index > max)
            max = index;
    }
    return String(max ?? 0n);
}
export function conversationDeletionPlan(conversation, boundary) {
    const requested = signedMessageIndex(boundary);
    const minimum = signedMessageIndex(conversation.minIndex ?? '0');
    if (minimum >= requested)
        return { minIndex: String(minimum), deleteConversation: true, deleteAllMessages: false };
    const deleteAllMessages = signedMessageIndex(conversation.lastMessageIndex ?? '0') <= requested;
    return { minIndex: String(requested), deleteConversation: deleteAllMessages, deleteAllMessages };
}
//# sourceMappingURL=conversation-delete.js.map