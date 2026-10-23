import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, } from 'fs';
import { join } from 'path';
import { normalizeStrangerCursors } from './stranger-cursors.js';
import { selectStrangerConversations } from './stranger-list.js';
import { normalizeMessageReadPrivacyQueries } from './user-settings.js';
import { calculateConversationReadSummary, selectLastSentMessage, validateStoredReadCursors } from './read-state.js';
import { messageClientId, normalizeClientId, prepareMessageCacheWrite } from './message-cache.js';
import { ConversationSummaryCache } from './conversation-summary.js';
import { mergeConversationSnapshot } from './conversation-state.js';
import { conversationDeletionPlan, maxStoredMessageIndex, signedMessageIndex } from './conversation-delete.js';
export function validateMessageLocalExt(ext) {
    if (!ext || typeof ext !== 'object' || Array.isArray(ext) || Object.values(ext).some(value => typeof value !== 'string')) {
        throw new TypeError('消息本地扩展字段必须是字符串键值对象');
    }
}
const DEFAULT_MESSAGE_LIMIT = 1_000;
function emptyJsonState() {
    return {
        version: 1,
        conversations: {},
        groupMembers: {},
        completeMemberLists: {},
        messages: {},
    };
}
function clone(value) {
    return JSON.parse(JSON.stringify(value));
}
function privacyKey(conversationId, serverMessageId) {
    return JSON.stringify([conversationId, serverMessageId]);
}
function validatePrivacy(entries) {
    for (const { query, policy } of entries) {
        if (normalizeMessageReadPrivacyQueries([query]).length !== 1 || policy.serverMessageId !== query.serverMessageId ||
            !Number.isSafeInteger(policy.errorCode) || ![policy.on, policy.off].every(list => Array.isArray(list) &&
            list.every(uid => typeof uid === 'string' && /^[1-9]\d*$/.test(uid) && BigInt(uid) <= 9223372036854775807n))) {
            throw new Error('Invalid cached read privacy');
        }
    }
}
function compareMessage(left, right) {
    const a = left.indexInConversationV2 || left.indexInConversation;
    const b = right.indexInConversationV2 || right.indexInConversation;
    if (a && b) {
        try {
            const delta = BigInt(a) - BigInt(b);
            if (delta !== 0n)
                return delta < 0n ? -1 : 1;
        }
        catch {
        }
    }
    return left.createTime - right.createTime;
}
function validateLimit(value, fallback) {
    const limit = value ?? fallback;
    if (!Number.isSafeInteger(limit) || limit < 1) {
        throw new RangeError('message cache count must be a positive safe integer');
    }
    return limit;
}
class JsonImStateStore {
    userId;
    backend = 'json';
    file;
    maxMessages;
    state;
    summaryWrites = 0;
    summaries;
    getReadSummary(conversationId, selfUid) {
        const message = selectLastSentMessage(Object.values(this.state.messages[conversationId] ?? {}), conversationId, selfUid);
        return message && calculateConversationReadSummary(conversationId, message, selfUid, Object.values(this.state.groupMembers[conversationId] ?? {}), this.listReadCursors(conversationId));
    }
    createSummaries(floatHintConfig, userId) {
        return new ConversationSummaryCache({
            conversation: id => this.state.conversations[id],
            load: id => this.state.conversationSummaries?.[id],
            save: (id, summary) => { this.state.conversationSummaries ??= {}; this.state.conversationSummaries[id] = clone(summary); this.summaryWrites++; },
            commitLocalExt: (id, localExt) => {
                const previous = this.state;
                const saved = previous.conversationSummaries?.[id];
                this.state = { ...previous, conversationSummaries: { ...previous.conversationSummaries,
                        [id]: { ...(saved ?? { lastClientId: '', hintClientId: '', lastMessageIndex: '0' }), localExt: clone(localExt) } } };
                try {
                    this.flush();
                }
                catch (error) {
                    this.state = previous;
                    throw error;
                }
                this.summaryWrites++;
            },
            messages: id => Object.values(this.state.messages[id] ?? {}),
        }, floatHintConfig, userId);
    }
    listReadCursors(conversationId) {
        const rows = this.state.readCursors?.[JSON.stringify(conversationId)] ?? [];
        validateStoredReadCursors(rows);
        return clone(rows);
    }
    saveReadCursors(conversationId, rows) {
        validateStoredReadCursors(rows);
        const merged = new Map(this.listReadCursors(conversationId).map(row => [row.uid, row]));
        for (const row of rows)
            merged.set(row.uid, clone(row));
        this.state.readCursors ??= {};
        this.state.readCursors[JSON.stringify(conversationId)] = [...merged.values()];
        this.flush();
    }
    constructor(accountDir, maxMessages, floatHintConfig, userId) {
        this.userId = userId;
        mkdirSync(accountDir, { recursive: true });
        this.file = join(accountDir, 'im-state.json');
        this.maxMessages = maxMessages;
        this.state = this.load();
        this.summaries = this.createSummaries(floatHintConfig, userId);
    }
    getUserRelation(uid) {
        const relation = this.state.userRelations?.[uid];
        return relation ? clone(relation) : undefined;
    }
    setUserRelation(uid, relation) {
        if (!/^\d+$/.test(uid))
            throw new Error('Invalid user relation UID');
        this.state.userRelations ??= {};
        this.state.userRelations[uid] = clone(relation);
        this.flush();
    }
    getMessageReadPrivacy(conversationId, serverMessageId) {
        const entry = this.state.messageReadPrivacy?.[privacyKey(conversationId, serverMessageId)];
        if (!entry)
            return undefined;
        try {
            validatePrivacy([entry]);
            return clone(entry);
        }
        catch {
            return undefined;
        }
    }
    upsertMessageReadPrivacy(entries) {
        validatePrivacy(entries);
        if (!entries.length)
            return;
        this.state.messageReadPrivacy ??= {};
        for (const entry of entries)
            this.state.messageReadPrivacy[privacyKey(entry.query.conversationId, entry.query.serverMessageId)] = clone(entry);
        this.flush();
    }
    deleteMessageReadPrivacy(conversationId, serverMessageId) {
        if (this.state.messageReadPrivacy)
            delete this.state.messageReadPrivacy[privacyKey(conversationId, serverMessageId)];
        this.flush();
    }
    replaceGroups(groups) {
        const groupIds = new Set(groups.map((group) => group.conversationId));
        for (const [id, conversation] of Object.entries(this.state.conversations)) {
            if (!conversation.isGroup)
                continue;
            if (!groupIds.has(id))
                this.removeConversation(id);
        }
        for (const group of groups) {
            this.state.conversations[group.conversationId] = clone(mergeConversationSnapshot(this.getConversation(group.conversationId), group, this.userId));
            this.summaries.saveMerged(group.conversationId);
        }
        this.state.groupSnapshot = true;
        this.flush();
    }
    upsertConversations(conversations, source = 'server') {
        if (conversations.length === 0)
            return;
        for (const conversation of conversations) {
            this.state.conversations[conversation.conversationId] = clone(source === 'local' ? conversation : mergeConversationSnapshot(this.getConversation(conversation.conversationId), conversation, this.userId));
            if (source === 'server')
                this.summaries.saveMerged(conversation.conversationId);
        }
        this.flush();
    }
    patchConversation(conversationId, patch) {
        const current = this.state.conversations[conversationId];
        if (!current)
            return;
        this.state.conversations[conversationId] = { ...current, ...clone(patch) };
        this.flush();
    }
    listGroups() {
        if (!this.state.groupSnapshot)
            return undefined;
        return Object.values(this.state.conversations)
            .filter((conversation) => conversation.isGroup && !conversation.deleted)
            .map(conversation => this.summaries.project(clone(conversation)));
    }
    getConversation(conversationId) {
        const value = this.state.conversations[conversationId];
        return value && !value.deleted ? this.summaries.project(clone(value)) : undefined;
    }
    queryStrangerConversations() {
        const rows = Object.values(this.state.conversations).map(conversation => ({ ...conversation,
            sortOrder: this.state.conversationSummaries?.[conversation.conversationId]?.sortOrder ?? conversation.sortOrder ?? '0',
        }));
        const writes = this.summaryWrites;
        const result = selectStrangerConversations(rows).map(conversation => this.summaries.query(conversation));
        if (this.summaryWrites !== writes)
            this.flush();
        return result;
    }
    getConversationDeletionBoundary(conversationId) {
        return maxStoredMessageIndex(Object.values(this.state.messages[conversationId] ?? {}));
    }
    applyConversationDeletion(conversationId, boundary) {
        const index = signedMessageIndex(boundary);
        const current = this.getConversation(conversationId);
        if (!current)
            return 'missing';
        const plan = conversationDeletionPlan(current, boundary);
        const previous = this.state;
        const next = clone(previous);
        next.conversations[conversationId] = { ...next.conversations[conversationId], minIndex: plan.minIndex,
            ...(plan.deleteConversation ? { deleted: true } : {}) };
        for (const message of Object.values(next.messages[conversationId] ?? {})) {
            if (!plan.deleteAllMessages && signedMessageIndex(message.indexInConversation ?? '0') > index)
                continue;
            message.deleted = true;
            if (plan.deleteAllMessages)
                delete message.propertyList;
            if (next.messageReadPrivacy)
                delete next.messageReadPrivacy[privacyKey(conversationId, message.msgId)];
        }
        this.state = next;
        try {
            this.flush();
        }
        catch (error) {
            this.state = previous;
            throw error;
        }
        if (plan.deleteConversation)
            this.summaries.forget(conversationId);
        return plan.deleteConversation ? 'deleted' : 'retained';
    }
    deleteConversation(conversationId) {
        this.removeConversation(conversationId);
        this.flush();
    }
    replaceGroupMembers(groupId, members) {
        this.state.groupMembers[groupId] = Object.fromEntries(members.map((member) => [member.uid, clone(member)]));
        if (this.state.readCursors)
            this.state.readCursors[JSON.stringify(groupId)] = this.listReadCursors(groupId).filter(row => members.some(member => member.uid === row.uid));
        this.state.completeMemberLists[groupId] = true;
        this.flush();
    }
    upsertGroupMembers(groupId, members) {
        if (members.length === 0)
            return;
        const current = this.state.groupMembers[groupId] ?? {};
        for (const member of members)
            current[member.uid] = clone(member);
        this.state.groupMembers[groupId] = current;
        this.flush();
    }
    removeGroupMembers(groupId, uids) {
        const current = this.state.groupMembers[groupId];
        if (uids.length === 0)
            return;
        for (const uid of uids)
            if (current)
                delete current[uid];
        if (this.state.readCursors)
            this.state.readCursors[JSON.stringify(groupId)] = this.listReadCursors(groupId).filter(row => !uids.includes(row.uid));
        this.flush();
    }
    removeConversationMembers(conversationId, uids) {
        const current = this.getConversation(conversationId);
        if (!current)
            return undefined;
        if (!uids.length)
            return false;
        const removed = new Set(uids);
        const members = current.members?.filter(member => !removed.has(member.uid));
        const changed = members !== undefined && members.length !== current.members?.length;
        const previous = this.state;
        const next = clone(previous);
        if (changed)
            next.conversations[conversationId].members = members;
        for (const uid of uids)
            if (next.groupMembers[conversationId])
                delete next.groupMembers[conversationId][uid];
        const key = JSON.stringify(conversationId);
        if (next.readCursors?.[key])
            next.readCursors[key] = next.readCursors[key].filter(row => !removed.has(row.uid));
        this.state = next;
        try {
            this.flush();
        }
        catch (error) {
            this.state = previous;
            throw error;
        }
        return changed;
    }
    listGroupMembers(groupId) {
        if (!this.state.completeMemberLists[groupId])
            return undefined;
        return Object.values(this.state.groupMembers[groupId] ?? {}).map(clone);
    }
    upsertMessages(messages, source = 'server') {
        const updates = [];
        if (messages.length === 0)
            return updates;
        const touched = new Set();
        for (const message of messages) {
            const current = this.state.messages[message.threadId] ?? {};
            const write = prepareMessageCacheWrite(message, source, new Map(Object.entries(current)));
            if (!write)
                continue;
            this.summaries.prepare(message.threadId);
            for (const key of write.removeKeys)
                delete current[key];
            current[write.key] = write.message;
            updates.push({ message: clone(write.message), isNew: write.isNew });
            this.state.messages[message.threadId] = current;
            if (source === 'server')
                this.summaries.saved(write.message);
            touched.add(message.threadId);
        }
        for (const conversationId of touched) {
            const current = this.state.messages[conversationId] ?? {};
            const sorted = Object.entries(current)
                .sort((left, right) => compareMessage(right[1], left[1]));
            this.state.messages[conversationId] = Object.fromEntries(sorted.slice(0, this.maxMessages));
        }
        this.flush();
        return updates;
    }
    modifyMessageLocalExt({ conversationId, clientMessageId, ext }) {
        validateMessageLocalExt(ext);
        if (!conversationId || !clientMessageId)
            return undefined;
        const rows = this.state.messages[conversationId] ?? {};
        const entry = Object.entries(rows).find(([, message]) => !message.deleted && messageClientId(message) === normalizeClientId(clientMessageId));
        if (!entry)
            return undefined;
        const [key, old] = entry;
        const updated = { ...old, localExt: { ...old.localExt, ...ext } };
        rows[key] = updated;
        try {
            this.flush();
        }
        catch (error) {
            rows[key] = old;
            throw error;
        }
        return clone(updated);
    }
    deleteMessage(conversationId, id, kind = 'server') {
        const current = this.state.messages[conversationId];
        const target = this.getMessage(conversationId, id, kind);
        if (target)
            this.summaries.prepare(conversationId);
        const serverMessageId = kind === 'server' ? id : target?.msgId;
        if (target && current) {
            const clientId = messageClientId(target);
            for (const [key, message] of Object.entries(current)) {
                if (key !== `s:${serverMessageId}` && (!clientId || messageClientId(message) !== clientId))
                    continue;
                message.deleted = true;
                if (this.state.messageReadPrivacy)
                    delete this.state.messageReadPrivacy[privacyKey(conversationId, message.msgId)];
            }
        }
        if (serverMessageId && this.state.messageReadPrivacy)
            delete this.state.messageReadPrivacy[privacyKey(conversationId, serverMessageId)];
        const summaryChanged = target ? this.summaries.removed(conversationId, messageClientId(target)) : false;
        this.flush();
        return summaryChanged;
    }
    listMessages(conversationId, count = 50) {
        const limit = validateLimit(count, 50);
        const messages = Object.values(this.state.messages[conversationId] ?? {})
            .filter(message => message.deleted !== true)
            .sort(compareMessage);
        return messages.slice(-limit).map(clone);
    }
    refreshRecalledSummary(conversationId, clientId) {
        this.summaries.removed(conversationId, clientId);
        this.flush();
    }
    markPropertyRead(conversationId) {
        return this.summaries.markPropertyRead(conversationId);
    }
    getMessage(conversationId, id, kind) {
        if (!conversationId || !id || (kind === 'server' && id === '0'))
            return undefined;
        const messages = this.state.messages[conversationId] ?? {};
        const result = kind === 'server' ? messages[`s:${id}`]
            : Object.values(messages).find(message => message.deleted !== true && messageClientId(message) === normalizeClientId(id));
        return result ? clone(result) : undefined;
    }
    getReferencingMessages(conversationId, serverMessageId) {
        if (!conversationId || !serverMessageId || serverMessageId === '0')
            return [];
        return Object.values(this.state.messages[conversationId] ?? {})
            .filter(message => message.deleted !== true && message.referenceInfo?.refMessageId === serverMessageId)
            .map(clone);
    }
    close() { }
    getStrangerSyncCursors() {
        return normalizeStrangerCursors(this.state.strangerSyncCursors);
    }
    setStrangerSyncCursors(cursors) {
        const next = normalizeStrangerCursors(cursors);
        const previous = this.state.strangerSyncCursors;
        this.state.strangerSyncCursors = next;
        try {
            this.flush();
        }
        catch (error) {
            if (previous === undefined)
                delete this.state.strangerSyncCursors;
            else
                this.state.strangerSyncCursors = previous;
            throw error;
        }
    }
    getFrontierCursors(namespace) {
        const value = this.state.frontierCursors?.[namespace];
        return value ? clone(value) : undefined;
    }
    setFrontierCursors(namespace, cursors) {
        this.state.frontierCursors ??= {};
        this.state.frontierCursors[namespace] = clone(cursors);
        this.flush();
    }
    removeConversation(conversationId) {
        this.summaries.forget(conversationId);
        if (this.state.conversationSummaries)
            delete this.state.conversationSummaries[conversationId];
        if (this.state.readCursors)
            delete this.state.readCursors[JSON.stringify(conversationId)];
        delete this.state.conversations[conversationId];
        delete this.state.groupMembers[conversationId];
        delete this.state.completeMemberLists[conversationId];
        delete this.state.messages[conversationId];
        for (const [key, entry] of Object.entries(this.state.messageReadPrivacy ?? {})) {
            if (entry.query.conversationId === conversationId)
                delete this.state.messageReadPrivacy[key];
        }
    }
    load() {
        if (!existsSync(this.file))
            return emptyJsonState();
        try {
            const parsed = JSON.parse(readFileSync(this.file, 'utf8'));
            if (parsed.version !== 1)
                return emptyJsonState();
            return {
                version: 1,
                conversations: parsed.conversations ?? {},
                ...(parsed.groupSnapshot ? { groupSnapshot: true } : {}),
                groupMembers: parsed.groupMembers ?? {},
                completeMemberLists: parsed.completeMemberLists ?? {},
                messages: parsed.messages ?? {},
                ...(parsed.strangerSyncCursors !== undefined ? { strangerSyncCursors: parsed.strangerSyncCursors } : {}),
                frontierCursors: parsed.frontierCursors ?? {},
                userRelations: parsed.userRelations ?? {},
                messageReadPrivacy: parsed.messageReadPrivacy ?? {},
                readCursors: parsed.readCursors ?? {},
                conversationSummaries: parsed.conversationSummaries ?? {},
            };
        }
        catch {
            return emptyJsonState();
        }
    }
    flush() {
        const temporary = `${this.file}.tmp`;
        writeFileSync(temporary, JSON.stringify(this.state));
        renameSync(temporary, this.file);
    }
}
class SqliteImStateStore {
    userId;
    backend = 'sqlite';
    database;
    maxMessages;
    summaries;
    getReadSummary(conversationId, selfUid) {
        const messages = this.database.prepare('SELECT payload FROM messages WHERE conversation_id = ? ORDER BY rowid').all(conversationId)
            .map(row => JSON.parse(String(row['payload'])));
        const message = selectLastSentMessage(messages, conversationId, selfUid);
        if (!message)
            return undefined;
        const members = this.database.prepare('SELECT payload FROM group_members WHERE group_id = ? ORDER BY rowid').all(conversationId)
            .map(row => JSON.parse(String(row['payload'])));
        return calculateConversationReadSummary(conversationId, message, selfUid, members, this.listReadCursors(conversationId));
    }
    createSummaries(floatHintConfig, userId) {
        return new ConversationSummaryCache({
            conversation: id => {
                const row = this.database.prepare('SELECT payload FROM conversations WHERE conversation_id = ?').get(id);
                return row ? JSON.parse(String(row['payload'])) : undefined;
            },
            load: id => {
                const row = this.database.prepare('SELECT payload FROM conversation_summaries WHERE conversation_id = ?').get(id);
                return row ? JSON.parse(String(row['payload'])) : undefined;
            },
            save: (id, summary) => {
                this.database.prepare(`INSERT INTO conversation_summaries(conversation_id, payload) VALUES (?, ?)
        ON CONFLICT(conversation_id) DO UPDATE SET payload=excluded.payload`).run(id, JSON.stringify(summary));
            },
            commitLocalExt: (id, localExt) => this.transaction(() => {
                const row = this.database.prepare('SELECT payload FROM conversation_summaries WHERE conversation_id = ?').get(id);
                const saved = row ? JSON.parse(String(row['payload']))
                    : { lastClientId: '', hintClientId: '', lastMessageIndex: '0' };
                this.database.prepare(`INSERT INTO conversation_summaries(conversation_id, payload) VALUES (?, ?)
        ON CONFLICT(conversation_id) DO UPDATE SET payload=excluded.payload`).run(id, JSON.stringify({ ...saved, localExt }));
            }),
            messages: id => this.database.prepare('SELECT payload FROM messages WHERE conversation_id = ? ORDER BY rowid').all(id)
                .map(row => JSON.parse(String(row['payload']))),
        }, floatHintConfig, userId);
    }
    listReadCursors(conversationId) {
        const rows = this.database.prepare('SELECT uid, read_index, min_index FROM read_cursors WHERE conversation_id = ? ORDER BY rowid').all(conversationId)
            .map(row => ({ uid: String(row['uid']), readIndex: String(row['read_index']), minIndex: String(row['min_index']) }));
        validateStoredReadCursors(rows);
        return rows;
    }
    saveReadCursors(conversationId, rows) {
        validateStoredReadCursors(rows);
        const upsert = this.database.prepare(`INSERT INTO read_cursors(conversation_id, uid, read_index, min_index) VALUES (?, ?, ?, ?)
      ON CONFLICT(conversation_id, uid) DO UPDATE SET read_index=excluded.read_index, min_index=excluded.min_index`);
        this.transaction(() => { for (const row of rows)
            upsert.run(conversationId, row.uid, row.readIndex, row.minIndex); });
    }
    getUserRelation(uid) {
        const row = this.database.prepare('SELECT payload FROM user_relations WHERE uid = ?').get(uid);
        return row ? JSON.parse(String(row['payload'])) : undefined;
    }
    setUserRelation(uid, relation) {
        if (!/^\d+$/.test(uid))
            throw new Error('Invalid user relation UID');
        this.database.prepare('INSERT INTO user_relations(uid, payload) VALUES (?, ?) ON CONFLICT(uid) DO UPDATE SET payload = excluded.payload')
            .run(uid, JSON.stringify(relation));
    }
    getMessageReadPrivacy(conversationId, serverMessageId) {
        const row = this.database.prepare('SELECT payload FROM message_read_privacy WHERE conversation_id = ? AND message_id = ?')
            .get(conversationId, serverMessageId);
        if (!row)
            return undefined;
        try {
            const entry = JSON.parse(String(row['payload']));
            validatePrivacy([entry]);
            return entry;
        }
        catch {
            return undefined;
        }
    }
    upsertMessageReadPrivacy(entries) {
        validatePrivacy(entries);
        if (!entries.length)
            return;
        const upsert = this.database.prepare(`INSERT INTO message_read_privacy(conversation_id, message_id, payload) VALUES (?, ?, ?)
      ON CONFLICT(conversation_id, message_id) DO UPDATE SET payload = excluded.payload`);
        this.transaction(() => {
            for (const entry of entries)
                upsert.run(entry.query.conversationId, entry.query.serverMessageId, JSON.stringify(entry));
        });
    }
    deleteMessageReadPrivacy(conversationId, serverMessageId) {
        this.database.prepare('DELETE FROM message_read_privacy WHERE conversation_id = ? AND message_id = ?').run(conversationId, serverMessageId);
    }
    constructor(accountDir, maxMessages, floatHintConfig, userId) {
        this.userId = userId;
        mkdirSync(accountDir, { recursive: true });
        this.maxMessages = maxMessages;
        this.database = new DatabaseSync(join(accountDir, 'im-state.sqlite'));
        this.summaries = this.createSummaries(floatHintConfig, userId);
        this.database.exec(`
      PRAGMA busy_timeout = 5000;
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS conversations (
        conversation_id TEXT PRIMARY KEY,
        conversation_type INTEGER NOT NULL,
        payload TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        list_position INTEGER NOT NULL DEFAULT 0
      ) STRICT;
      CREATE TABLE IF NOT EXISTS group_members (
        group_id TEXT NOT NULL,
        uid TEXT NOT NULL,
        payload TEXT NOT NULL,
        PRIMARY KEY (group_id, uid)
      ) STRICT;
      CREATE TABLE IF NOT EXISTS member_snapshots (
        group_id TEXT PRIMARY KEY,
        completed_at INTEGER NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS state_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS user_relations (
        uid TEXT PRIMARY KEY,
        payload TEXT NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS message_read_privacy (
        conversation_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        PRIMARY KEY (conversation_id, message_id)
      ) STRICT;
      CREATE TABLE IF NOT EXISTS read_cursors (
        conversation_id TEXT NOT NULL,
        uid TEXT NOT NULL,
        read_index TEXT NOT NULL,
        min_index TEXT NOT NULL,
        PRIMARY KEY (conversation_id, uid)
      ) STRICT;
      CREATE TABLE IF NOT EXISTS messages (
        conversation_id TEXT NOT NULL,
        message_key TEXT NOT NULL,
        create_time INTEGER NOT NULL,
        payload TEXT NOT NULL,
        PRIMARY KEY (conversation_id, message_key)
      ) STRICT;
      CREATE TABLE IF NOT EXISTS conversation_summaries (
        conversation_id TEXT PRIMARY KEY,
        payload TEXT NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS messages_by_conversation_time
        ON messages (conversation_id, create_time);
      PRAGMA user_version = 1;
    `);
    }
    replaceGroups(groups) {
        this.transaction(() => {
            const incoming = new Set(groups.map((group) => group.conversationId));
            const existing = this.database.prepare('SELECT conversation_id FROM conversations WHERE conversation_type = 2').all();
            for (const row of existing) {
                const id = String(row['conversation_id'] ?? '');
                if (id && !incoming.has(id))
                    this.deleteConversationRows(id);
            }
            const upsert = this.database.prepare(`
        INSERT INTO conversations (
          conversation_id, conversation_type, payload, updated_at, list_position
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(conversation_id) DO UPDATE SET
          conversation_type = excluded.conversation_type,
          payload = excluded.payload,
          updated_at = excluded.updated_at,
          list_position = excluded.list_position
      `);
            const now = Date.now();
            for (const [position, group] of groups.entries()) {
                upsert.run(group.conversationId, group.conversationType, JSON.stringify(mergeConversationSnapshot(this.getConversation(group.conversationId), group, this.userId)), now, position);
                this.summaries.saveMerged(group.conversationId);
            }
            this.database.prepare(`
        INSERT INTO state_meta (key, value) VALUES ('group_snapshot', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run(String(now));
        });
    }
    upsertConversations(conversations, source = 'server') {
        if (conversations.length === 0)
            return;
        const upsert = this.database.prepare(`
      INSERT INTO conversations (conversation_id, conversation_type, payload, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(conversation_id) DO UPDATE SET
        conversation_type = excluded.conversation_type,
        payload = excluded.payload,
        updated_at = excluded.updated_at
    `);
        const now = Date.now();
        this.transaction(() => {
            for (const conversation of conversations) {
                upsert.run(conversation.conversationId, conversation.conversationType, JSON.stringify(source === 'local' ? conversation : mergeConversationSnapshot(this.getConversation(conversation.conversationId), conversation, this.userId)), now);
                if (source === 'server')
                    this.summaries.saveMerged(conversation.conversationId);
            }
        });
    }
    patchConversation(conversationId, patch) {
        const row = this.database.prepare('SELECT payload FROM conversations WHERE conversation_id = ?').get(conversationId);
        if (!row)
            return;
        const current = JSON.parse(String(row['payload'] ?? '{}'));
        const updated = { ...current, ...patch };
        this.database.prepare(`
      UPDATE conversations
      SET conversation_type = ?, payload = ?, updated_at = ?
      WHERE conversation_id = ?
    `).run(updated.conversationType, JSON.stringify(updated), Date.now(), conversationId);
    }
    listGroups() {
        const complete = this.database.prepare("SELECT value FROM state_meta WHERE key = 'group_snapshot'").get();
        if (!complete)
            return undefined;
        return this.database.prepare('SELECT payload FROM conversations WHERE conversation_type = 2 ORDER BY list_position').all().map((row) => JSON.parse(String(row['payload'] ?? '{}')))
            .filter(conversation => !conversation.deleted).map(conversation => this.summaries.project(conversation));
    }
    getConversation(conversationId) {
        const row = this.database.prepare('SELECT payload FROM conversations WHERE conversation_id = ?').get(conversationId);
        const conversation = row ? JSON.parse(String(row['payload'])) : undefined;
        return conversation && !conversation.deleted ? this.summaries.project(conversation) : undefined;
    }
    queryStrangerConversations() {
        const rows = this.database.prepare(`SELECT c.payload, s.payload AS summary_payload
      FROM conversations c LEFT JOIN conversation_summaries s ON s.conversation_id = c.conversation_id`).all()
            .map(row => {
            const conversation = JSON.parse(String(row['payload']));
            const summary = row['summary_payload'] == null ? undefined : JSON.parse(String(row['summary_payload']));
            return { ...conversation, sortOrder: summary?.sortOrder ?? conversation.sortOrder ?? '0' };
        });
        return selectStrangerConversations(rows).map(conversation => this.summaries.query(conversation));
    }
    getConversationDeletionBoundary(conversationId) {
        const rows = this.database.prepare('SELECT payload FROM messages WHERE conversation_id = ?').all(conversationId);
        return maxStoredMessageIndex(rows.map(row => JSON.parse(String(row['payload']))));
    }
    applyConversationDeletion(conversationId, boundary) {
        const index = signedMessageIndex(boundary);
        const outcome = this.transaction(() => {
            const current = this.getConversation(conversationId);
            if (!current)
                return 'missing';
            const plan = conversationDeletionPlan(current, boundary);
            this.patchConversation(conversationId, { minIndex: plan.minIndex, ...(plan.deleteConversation ? { deleted: true } : {}) });
            const rows = this.database.prepare('SELECT message_key, payload FROM messages WHERE conversation_id = ?').all(conversationId);
            const update = this.database.prepare('UPDATE messages SET payload = ? WHERE conversation_id = ? AND message_key = ?');
            const clearPrivacy = this.database.prepare('DELETE FROM message_read_privacy WHERE conversation_id = ? AND message_id = ?');
            for (const row of rows) {
                const message = JSON.parse(String(row['payload']));
                if (!plan.deleteAllMessages && signedMessageIndex(message.indexInConversation ?? '0') > index)
                    continue;
                message.deleted = true;
                if (plan.deleteAllMessages)
                    delete message.propertyList;
                update.run(JSON.stringify(message), conversationId, String(row['message_key']));
                clearPrivacy.run(conversationId, message.msgId);
            }
            return plan.deleteConversation ? 'deleted' : 'retained';
        });
        if (outcome === 'deleted')
            this.summaries.forget(conversationId);
        return outcome;
    }
    deleteConversation(conversationId) {
        this.transaction(() => this.deleteConversationRows(conversationId));
    }
    replaceGroupMembers(groupId, members) {
        this.transaction(() => {
            this.database.prepare('DELETE FROM group_members WHERE group_id = ?').run(groupId);
            const insert = this.database.prepare('INSERT INTO group_members (group_id, uid, payload) VALUES (?, ?, ?)');
            for (const member of members)
                insert.run(groupId, member.uid, JSON.stringify(member));
            this.database.prepare('DELETE FROM read_cursors WHERE conversation_id = ? AND uid NOT IN (SELECT uid FROM group_members WHERE group_id = ?)').run(groupId, groupId);
            this.database.prepare(`
        INSERT INTO member_snapshots (group_id, completed_at) VALUES (?, ?)
        ON CONFLICT(group_id) DO UPDATE SET completed_at = excluded.completed_at
      `).run(groupId, Date.now());
        });
    }
    upsertGroupMembers(groupId, members) {
        if (members.length === 0)
            return;
        const upsert = this.database.prepare(`
      INSERT INTO group_members (group_id, uid, payload) VALUES (?, ?, ?)
      ON CONFLICT(group_id, uid) DO UPDATE SET payload = excluded.payload
    `);
        this.transaction(() => {
            for (const member of members)
                upsert.run(groupId, member.uid, JSON.stringify(member));
        });
    }
    removeGroupMembers(groupId, uids) {
        if (uids.length === 0)
            return;
        const remove = this.database.prepare('DELETE FROM group_members WHERE group_id = ? AND uid = ?');
        this.transaction(() => {
            const removeRead = this.database.prepare('DELETE FROM read_cursors WHERE conversation_id = ? AND uid = ?');
            for (const uid of uids) {
                remove.run(groupId, uid);
                removeRead.run(groupId, uid);
            }
        });
    }
    removeConversationMembers(conversationId, uids) {
        return this.transaction(() => {
            const current = this.getConversation(conversationId);
            if (!current)
                return undefined;
            const removed = new Set(uids);
            const members = current.members?.filter(member => !removed.has(member.uid));
            const changed = members !== undefined && members.length !== current.members?.length;
            if (changed)
                this.patchConversation(conversationId, { members });
            const removeMember = this.database.prepare('DELETE FROM group_members WHERE group_id = ? AND uid = ?');
            const removeRead = this.database.prepare('DELETE FROM read_cursors WHERE conversation_id = ? AND uid = ?');
            for (const uid of uids) {
                removeMember.run(conversationId, uid);
                removeRead.run(conversationId, uid);
            }
            return changed;
        });
    }
    listGroupMembers(groupId) {
        const complete = this.database.prepare('SELECT group_id FROM member_snapshots WHERE group_id = ?').all(groupId).length > 0;
        if (!complete)
            return undefined;
        return this.database.prepare('SELECT payload FROM group_members WHERE group_id = ?').all(groupId).map((row) => JSON.parse(String(row['payload'] ?? '{}')));
    }
    upsertMessages(messages, source = 'server') {
        const updates = [];
        if (messages.length === 0)
            return updates;
        const upsert = this.database.prepare(`
      INSERT INTO messages (conversation_id, message_key, create_time, payload)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(conversation_id, message_key) DO UPDATE SET
        create_time = excluded.create_time,
        payload = excluded.payload
    `);
        const touched = new Set();
        this.transaction(() => {
            const select = this.database.prepare('SELECT message_key, payload FROM messages WHERE conversation_id = ? ORDER BY rowid');
            const remove = this.database.prepare('DELETE FROM messages WHERE conversation_id = ? AND message_key = ?');
            const conversations = new Map();
            for (const message of messages) {
                if (!message.threadId)
                    continue;
                let current = conversations.get(message.threadId);
                if (!current) {
                    current = new Map(select.all(message.threadId).map(row => [String(row['message_key']), JSON.parse(String(row['payload']))]));
                    conversations.set(message.threadId, current);
                }
                const write = prepareMessageCacheWrite(message, source, current);
                if (!write)
                    continue;
                this.summaries.prepare(message.threadId);
                for (const key of write.removeKeys) {
                    remove.run(message.threadId, key);
                    current.delete(key);
                }
                current.set(write.key, write.message);
                upsert.run(message.threadId, write.key, write.message.createTime, JSON.stringify(write.message));
                if (source === 'server')
                    this.summaries.saved(write.message);
                updates.push({ message: clone(write.message), isNew: write.isNew });
                touched.add(message.threadId);
            }
            for (const conversationId of touched) {
                const rows = select.all(conversationId).map(row => ({ key: String(row['message_key']), message: JSON.parse(String(row['payload'])) }));
                rows.sort((left, right) => compareMessage(right.message, left.message));
                for (const row of rows.slice(this.maxMessages))
                    remove.run(conversationId, row.key);
            }
        });
        return updates;
    }
    getMessage(conversationId, id, kind) {
        if (!conversationId || !id || (kind === 'server' && id === '0'))
            return undefined;
        if (kind === 'server') {
            const row = this.database.prepare('SELECT payload FROM messages WHERE conversation_id = ? AND message_key = ?')
                .get(conversationId, `s:${id}`);
            return row ? JSON.parse(String(row['payload'])) : undefined;
        }
        const rows = this.database.prepare('SELECT payload FROM messages WHERE conversation_id = ? ORDER BY rowid').all(conversationId);
        const normalizedId = normalizeClientId(id);
        return rows.map(row => JSON.parse(String(row['payload'])))
            .find(message => message.deleted !== true && messageClientId(message) === normalizedId);
    }
    modifyMessageLocalExt({ conversationId, clientMessageId, ext }) {
        validateMessageLocalExt(ext);
        if (!conversationId || !clientMessageId)
            return undefined;
        let updated;
        this.transaction(() => {
            const rows = this.database.prepare('SELECT message_key, payload FROM messages WHERE conversation_id = ? ORDER BY rowid').all(conversationId);
            const id = normalizeClientId(clientMessageId);
            for (const row of rows) {
                const message = JSON.parse(String(row['payload']));
                if (message.deleted || messageClientId(message) !== id)
                    continue;
                updated = { ...message, localExt: { ...message.localExt, ...ext } };
                this.database.prepare('UPDATE messages SET payload = ? WHERE conversation_id = ? AND message_key = ?')
                    .run(JSON.stringify(updated), conversationId, String(row['message_key']));
                break;
            }
        });
        return updated;
    }
    deleteMessage(conversationId, id, kind = 'server') {
        let summaryChanged = false;
        this.transaction(() => {
            const target = this.getMessage(conversationId, id, kind);
            if (target)
                this.summaries.prepare(conversationId);
            const serverMessageId = kind === 'server' ? id : target?.msgId;
            if (target) {
                const clientId = messageClientId(target);
                const rows = this.database.prepare('SELECT message_key, payload FROM messages WHERE conversation_id = ?').all(conversationId);
                const update = this.database.prepare('UPDATE messages SET payload = ? WHERE conversation_id = ? AND message_key = ?');
                const clearPrivacy = this.database.prepare('DELETE FROM message_read_privacy WHERE conversation_id = ? AND message_id = ?');
                for (const row of rows) {
                    const message = JSON.parse(String(row['payload']));
                    if (row['message_key'] !== `s:${serverMessageId}` && (!clientId || messageClientId(message) !== clientId))
                        continue;
                    message.deleted = true;
                    update.run(JSON.stringify(message), conversationId, String(row['message_key']));
                    clearPrivacy.run(conversationId, message.msgId);
                }
            }
            if (serverMessageId)
                this.database.prepare('DELETE FROM message_read_privacy WHERE conversation_id = ? AND message_id = ?').run(conversationId, serverMessageId);
            if (target)
                summaryChanged = this.summaries.removed(conversationId, messageClientId(target));
        });
        return summaryChanged;
    }
    getReferencingMessages(conversationId, serverMessageId) {
        if (!conversationId || !serverMessageId || serverMessageId === '0')
            return [];
        return this.database.prepare('SELECT payload FROM messages WHERE conversation_id = ?').all(conversationId)
            .map(row => JSON.parse(String(row['payload'])))
            .filter(message => message.deleted !== true && message.referenceInfo?.refMessageId === serverMessageId);
    }
    refreshRecalledSummary(conversationId, clientId) {
        this.transaction(() => { this.summaries.removed(conversationId, clientId); });
    }
    markPropertyRead(conversationId) {
        return this.summaries.markPropertyRead(conversationId);
    }
    listMessages(conversationId, count = 50) {
        const limit = validateLimit(count, 50);
        const rows = this.database.prepare(`
      SELECT payload FROM messages
      WHERE conversation_id = ?
      ORDER BY rowid
    `).all(conversationId);
        return rows
            .map((row) => JSON.parse(String(row['payload'] ?? '{}')))
            .filter(message => message.deleted !== true)
            .sort(compareMessage)
            .slice(-limit);
    }
    close() {
        this.database.close();
    }
    getFrontierCursors(namespace) {
        const row = this.database.prepare('SELECT value FROM state_meta WHERE key = ?').get(`frontier:${namespace}`);
        return row ? JSON.parse(String(row['value'])) : undefined;
    }
    getStrangerSyncCursors() {
        const row = this.database.prepare("SELECT value FROM state_meta WHERE key = 'stranger_sync_cursors'").get();
        return normalizeStrangerCursors(row ? JSON.parse(String(row['value'])) : undefined);
    }
    setStrangerSyncCursors(cursors) {
        const next = normalizeStrangerCursors(cursors);
        this.database.prepare(`
      INSERT INTO state_meta (key, value) VALUES ('stranger_sync_cursors', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(JSON.stringify(next));
    }
    setFrontierCursors(namespace, cursors) {
        this.database.prepare(`
      INSERT INTO state_meta (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(`frontier:${namespace}`, JSON.stringify(cursors));
    }
    deleteConversationRows(conversationId) {
        this.summaries.forget(conversationId);
        this.database.prepare('DELETE FROM conversation_summaries WHERE conversation_id = ?').run(conversationId);
        this.database.prepare('DELETE FROM read_cursors WHERE conversation_id = ?').run(conversationId);
        this.database.prepare('DELETE FROM conversations WHERE conversation_id = ?').run(conversationId);
        this.database.prepare('DELETE FROM group_members WHERE group_id = ?').run(conversationId);
        this.database.prepare('DELETE FROM member_snapshots WHERE group_id = ?').run(conversationId);
        this.database.prepare('DELETE FROM messages WHERE conversation_id = ?').run(conversationId);
        this.database.prepare('DELETE FROM message_read_privacy WHERE conversation_id = ?').run(conversationId);
    }
    transaction(action) {
        this.database.exec('BEGIN IMMEDIATE');
        try {
            const result = action();
            this.database.exec('COMMIT');
            return result;
        }
        catch (error) {
            this.database.exec('ROLLBACK');
            throw error;
        }
    }
}
export function createImStateStore(options) {
    const maxMessages = validateLimit(options.maxMessagesPerConversation, DEFAULT_MESSAGE_LIMIT);
    return options.backend === 'json'
        ? new JsonImStateStore(options.accountDir, maxMessages, options.floatHintConfig, options.userId)
        : new SqliteImStateStore(options.accountDir, maxMessages, options.floatHintConfig, options.userId);
}
//# sourceMappingURL=state-store.js.map