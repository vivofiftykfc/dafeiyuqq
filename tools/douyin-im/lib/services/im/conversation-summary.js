import { readJsonInteger } from '../../http/lossless-json.js';
import { messageClientId } from './message-cache.js';
import { isDesktopMessageVisible } from './message-display.js';
import { calculateDesktopSortOrder, desktopCellSortTime, isDesktopFloatMessage } from './conversation-float.js';
import { latestMessageProperty, LATEST_MESSAGE_PROPERTY_KEY, readConversationPropertyInfo, serializeConversationPropertyInfo } from './message-property.js';
export function isDesktopHintMessage(message, config) {
    if (!config?.enable)
        return true;
    const excluded = config.notHintMessages[message.msgType];
    const aweType = Number(readJsonInteger(message.content, 'aweType', 32) ?? -1n);
    return !excluded?.includes(aweType);
}
function order(message) {
    return BigInt(message.orderIndex ?? message.orderInConversation ?? '0');
}
function record(summary) {
    return { lastMessageIndex: summary.lastMessageIndex, lastClientId: summary.lastClientId, hintClientId: summary.hintClientId,
        lastMessageTime: summary.lastMessageTime, sortOrder: summary.sortOrder, maxIndex: summary.maxIndex, maxOrder: summary.maxOrder,
        localExt: structuredClone(summary.localExt) };
}
function setLast(summary, message) {
    summary.last = message && structuredClone(message);
    summary.lastClientId = message ? messageClientId(message) : '';
    summary.lastMessageIndex = message?.indexInConversation ?? '0';
}
function setHint(summary, message) {
    summary.hint = message && structuredClone(message);
    summary.hintClientId = message ? messageClientId(message) : '';
}
export class ConversationSummaryCache {
    storage;
    userId;
    cache = new Map();
    floatHintConfig;
    constructor(storage, floatHintConfig, userId = '') {
        this.storage = storage;
        this.userId = userId;
        this.floatHintConfig = floatHintConfig && structuredClone(floatHintConfig);
    }
    get(id) {
        const conversation = this.storage.conversation(id);
        if (!conversation)
            return undefined;
        const cached = this.cache.get(id);
        if (cached)
            return cached;
        const saved = this.storage.load(id);
        const summary = { lastMessageIndex: '0', lastClientId: '', hintClientId: '', ...saved,
            lastMessageTime: saved?.lastMessageTime ?? conversation.lastMessageTime,
            sortOrder: saved?.sortOrder ?? conversation.sortOrder ?? '0',
            maxIndex: saved?.maxIndex ?? conversation.maxIndex ?? '0', maxOrder: saved?.maxOrder ?? conversation.maxOrder ?? '0',
            localExt: structuredClone(saved?.localExt ?? conversation.localExt ?? {}) };
        if (saved) {
            const messages = this.storage.messages(id).filter(message => !message.deleted);
            summary.last = saved.lastClientId ? messages.find(message => messageClientId(message) === saved.lastClientId) : undefined;
            summary.hint = saved.hintClientId ? messages.find(message => messageClientId(message) === saved.hintClientId) : undefined;
            const propertyId = readConversationPropertyInfo(summary.localExt).clientId;
            summary.property = propertyId ? messages.find(message => messageClientId(message) === propertyId) : undefined;
        }
        this.cache.set(id, summary);
        return summary;
    }
    prepare(id) { this.get(id); }
    forget(id) { this.cache.delete(id); }
    saveMerged(id) {
        const conversation = this.storage.conversation(id);
        if (!conversation)
            return;
        const saved = this.storage.load(id);
        const summary = this.cache.get(id) ?? (saved ? this.get(id) : undefined);
        if (!summary)
            return;
        calculateDesktopSortOrder(summary, 0, !!conversation.pinned, desktopCellSortTime(conversation.settingExt?.['a:cell_sort_time']));
        this.storage.save(id, record(summary));
    }
    markPropertyRead(id) {
        if (!id)
            return false;
        const conversation = this.storage.conversation(id);
        if (!conversation)
            return false;
        const cached = this.cache.get(id);
        const saved = this.storage.load(id);
        const info = readConversationPropertyInfo(cached?.localExt ?? saved?.localExt ?? conversation.localExt);
        if (!info.clientId || info.markRead)
            return false;
        const summary = cached ?? this.get(id);
        const localExt = { ...summary.localExt, [LATEST_MESSAGE_PROPERTY_KEY]: serializeConversationPropertyInfo({ ...info, markRead: true }) };
        this.storage.commitLocalExt(id, localExt);
        summary.localExt = localExt;
        return true;
    }
    project(conversation) {
        const summary = this.cache.get(conversation.conversationId) ??
            (this.storage.load(conversation.conversationId) ? this.get(conversation.conversationId) : undefined);
        if (!summary)
            return conversation;
        const project = (message) => message && messageClientId(message) && message.content ? structuredClone(message) : null;
        return { ...conversation, lastMessageIndex: summary.lastMessageIndex,
            lastMessageTime: summary.lastMessageTime, sortOrder: summary.sortOrder, maxIndex: summary.maxIndex, maxOrder: summary.maxOrder,
            localExt: structuredClone(summary.localExt), propertyInfo: readConversationPropertyInfo(summary.localExt), propertyMessage: project(summary.property),
            lastMessage: project(summary.last), hintMessage: project(summary.hint) };
    }
    query(conversation) {
        const id = conversation.conversationId;
        const saved = this.storage.load(id);
        const summary = { lastMessageIndex: conversation.lastMessageIndex ?? '0', lastClientId: '', hintClientId: '', ...saved,
            lastMessageTime: saved?.lastMessageTime ?? conversation.lastMessageTime,
            sortOrder: conversation.sortOrder ?? '0',
            maxIndex: saved?.maxIndex ?? conversation.maxIndex ?? '0', maxOrder: saved?.maxOrder ?? conversation.maxOrder ?? '0',
            localExt: structuredClone(saved?.localExt ?? conversation.localExt ?? {}) };
        const all = this.storage.messages(id);
        if (BigInt(summary.maxIndex) < 0n || BigInt(summary.maxOrder) < 0n) {
            const max = (read) => all.length
                ? all.reduce((value, message) => read(message) > value ? read(message) : value, read(all[0])) : 0n;
            const index = max(message => BigInt(message.indexInConversation ?? '0'));
            const orderIndex = max(order);
            const changed = index > BigInt(summary.maxIndex) || orderIndex > BigInt(summary.maxOrder);
            if (index > BigInt(summary.maxIndex))
                summary.maxIndex = String(index);
            if (orderIndex > BigInt(summary.maxOrder))
                summary.maxOrder = String(orderIndex);
            if (changed)
                this.storage.save(id, record(summary));
        }
        const rows = all.filter(message => !message.deleted);
        const last = summary.lastClientId ? rows.find(message => messageClientId(message) === summary.lastClientId) : undefined;
        const hint = summary.hintClientId ? rows.find(message => messageClientId(message) === summary.hintClientId) : undefined;
        if (last)
            setLast(summary, last);
        if (hint)
            setHint(summary, hint);
        const propertyId = readConversationPropertyInfo(summary.localExt).clientId;
        if (propertyId)
            summary.property = rows.find(message => messageClientId(message) === propertyId);
        if (!summary.last || !summary.hint)
            this.recalculate(id, summary, 20);
        this.cache.set(id, summary);
        return this.project(conversation);
    }
    saved(message) {
        const id = message.threadId;
        const summary = this.get(id);
        if (!summary)
            return;
        if (message.ext?.['s:is_recalled'] === 'true') {
            this.removed(id, messageClientId(message));
            return;
        }
        if (!summary.last || !summary.hint) {
            this.recalculate(id, summary);
            return;
        }
        if (!isDesktopMessageVisible(message))
            return;
        let changed = false;
        const index = BigInt(message.indexInConversation ?? '0');
        if (index > BigInt(summary.maxIndex)) {
            summary.maxIndex = String(index);
            changed = true;
        }
        if (order(message) > BigInt(summary.maxOrder)) {
            summary.maxOrder = String(order(message));
            changed = true;
        }
        if (order(message) >= order(summary.last)) {
            setLast(summary, message);
            changed = true;
        }
        if (order(message) >= order(summary.hint) && isDesktopHintMessage(message, this.floatHintConfig)) {
            setHint(summary, message);
            changed = true;
        }
        if (message.createTime > summary.lastMessageTime && isDesktopFloatMessage(message, this.userId, this.floatHintConfig)) {
            const conversation = this.storage.conversation(id);
            const rawCellTime = conversation.settingExt?.['a:cell_sort_time'];
            const cellTime = desktopCellSortTime(rawCellTime);
            calculateDesktopSortOrder(summary, message.createTime, !!conversation.pinned, cellTime);
            changed = true;
        }
        changed = this.updateProperty(id, summary, message) || changed;
        if (changed)
            this.storage.save(id, record(summary));
    }
    removed(id, clientId) {
        if (!id || !clientId)
            return false;
        const summary = this.get(id);
        if (!summary)
            return false;
        let hit = false;
        if (summary.lastClientId === clientId) {
            setLast(summary);
            hit = true;
        }
        if (summary.hintClientId === clientId) {
            setHint(summary);
            hit = true;
        }
        if (readConversationPropertyInfo(summary.localExt).clientId === clientId)
            summary.property = undefined;
        if (hit)
            this.recalculate(id, summary);
        return hit;
    }
    updateProperty(id, summary, message) {
        if (!this.userId || message.senderUid !== this.userId)
            return false;
        const previous = readConversationPropertyInfo(summary.localExt);
        const next = latestMessageProperty(message, this.userId);
        const newer = BigInt(next.createdAt) > BigInt(previous.createdAt) &&
            BigInt(next.createdAt) > BigInt(Math.trunc(summary.hint.createTime / 1000));
        const cancelled = previous.clientId === messageClientId(message) && BigInt(next.createdAt) < BigInt(previous.createdAt);
        if (newer || cancelled) {
            summary.localExt = { ...summary.localExt, [LATEST_MESSAGE_PROPERTY_KEY]: serializeConversationPropertyInfo(next) };
            summary.property = newer || next.clientId ? structuredClone(message) : undefined;
            if (newer) {
                const conversation = this.storage.conversation(id);
                const timestamp = BigInt.asIntN(64, BigInt(next.createdAt) * 1000n);
                if (timestamp >= BigInt(Number.MIN_SAFE_INTEGER) && timestamp <= BigInt(Number.MAX_SAFE_INTEGER)) {
                    calculateDesktopSortOrder(summary, Number(timestamp), !!conversation.pinned, desktopCellSortTime(conversation.settingExt?.['a:cell_sort_time']));
                }
            }
            return true;
        }
        if (previous.clientId !== messageClientId(message))
            return false;
        summary.property = structuredClone(message);
        return true;
    }
    recalculate(id, summary, maxPages = 10) {
        let cursor = 9223372036854775807n;
        const rows = this.storage.messages(id).filter(message => !message.deleted)
            .sort((a, b) => order(a) > order(b) ? -1 : order(a) < order(b) ? 1 : 0);
        for (let page = 0; page < maxPages && (!summary.last || !summary.hint) && cursor > 0n; page++) {
            const candidates = rows.filter(message => order(message) < cursor).slice(0, 200);
            const byOrder = new Map(candidates.map(message => [order(message), message]));
            if (!byOrder.size)
                break;
            const before = record(summary);
            let last;
            let hint;
            for (const message of byOrder.values()) {
                if (!isDesktopMessageVisible(message))
                    continue;
                last ??= message;
                if (isDesktopHintMessage(message, this.floatHintConfig)) {
                    hint = message;
                    break;
                }
            }
            setLast(summary, last);
            setHint(summary, hint);
            const after = record(summary);
            if (before.lastMessageIndex !== after.lastMessageIndex || before.lastClientId !== after.lastClientId || before.hintClientId !== after.hintClientId) {
                this.storage.save(id, after);
            }
            cursor = [...byOrder.keys()].at(-1);
        }
    }
}
//# sourceMappingURL=conversation-summary.js.map