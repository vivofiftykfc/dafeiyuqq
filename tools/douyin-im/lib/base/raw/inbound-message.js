export function inboundFromPush(push) {
    if (!push.conversationId || !push.senderUid)
        return null;
    return {
        threadId: push.conversationId,
        ...(push.inboxType !== undefined ? { inboxType: push.inboxType } : {}),
        conversationShortId: push.conversationShortId,
        conversationType: push.conversationType,
        senderUid: push.senderUid,
        ...(push.senderSecUid ? { senderSecUid: push.senderSecUid } : {}),
        ...(push.serverMessageId ? { serverMessageId: push.serverMessageId } : {}),
        ...(push.clientMessageId ? { clientMessageId: push.clientMessageId } : {}),
        ...(push.indexInConversation ? { indexInConversation: push.indexInConversation } : {}),
        ...(push.indexInConversationV2 ? { indexInConversationV2: push.indexInConversationV2 } : {}),
        ...(push.createTime ? { createTime: push.createTime } : {}),
        ...(push.status !== undefined ? { status: push.status } : {}),
        ...(push.version ? { version: push.version } : {}),
        ...(push.orderInConversation ? { orderInConversation: push.orderInConversation } : {}),
        ...(push.ext ? { ext: push.ext } : {}),
        ...(push.referenceInfo ? { referenceInfo: push.referenceInfo } : {}),
        ...(push.propertyList ? { propertyList: push.propertyList } : {}),
        text: extractText(push.content),
        rawContent: push.content,
        messageType: push.messageType,
        raw: push.raw,
    };
}
export function inboundFromThread(thread, message, inboxType) {
    return mappedMessageInbound(message, thread, inboxType);
}
export function inboundFromMessage(message) {
    if (!message.threadId)
        return null;
    return mappedMessageInbound(message, message, message.inboxType);
}
function mappedMessageInbound(message, thread, inboxType) {
    if (!message.senderUid)
        return null;
    return {
        threadId: thread.threadId,
        ...(inboxType !== undefined ? { inboxType } : {}),
        conversationShortId: thread.conversationShortId ?? '',
        conversationType: thread.conversationType ?? 1,
        senderUid: message.senderUid,
        ...(message.senderSecUid ? { senderSecUid: message.senderSecUid } : {}),
        ...(message.msgId ? { serverMessageId: message.msgId } : {}),
        ...(message.clientMessageId ? { clientMessageId: message.clientMessageId } : {}),
        ...(message.indexInConversation ? { indexInConversation: message.indexInConversation } : {}),
        ...(message.indexInConversationV2 ? { indexInConversationV2: message.indexInConversationV2 } : {}),
        ...(message.createTime ? { createTime: String(message.createTime) } : {}),
        status: message.status,
        ...(message.version ? { version: message.version } : {}),
        ...(message.orderInConversation ? { orderInConversation: message.orderInConversation } : {}),
        ...(message.ext ? { ext: message.ext } : {}),
        ...(message.referenceInfo ? { referenceInfo: message.referenceInfo } : {}),
        ...(message.propertyList ? { propertyList: message.propertyList } : {}),
        text: extractText(message.content),
        rawContent: message.content,
        messageType: message.msgType,
        raw: message,
    };
}
function extractText(content) {
    try {
        const parsed = JSON.parse(content);
        return parsed?.text ?? content;
    }
    catch {
        return content;
    }
}
//# sourceMappingURL=inbound-message.js.map