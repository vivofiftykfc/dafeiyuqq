import { captureRejectionSymbol } from 'events';
import { ApiConnection } from '../desktop/api-connection.js';
import { DesktopSettings, desktopFloatHintConfig } from '../desktop/settings.js';
import { tryRestoreSession } from '../store/wake.js';
import { AccountAuth } from './auth/account-auth.js';
import { ActionVerification } from './auth/action-verification.js';
import { ActionChallengeError } from '../http/action-challenge.js';
import { openBrowserVerification } from './auth/browser-verification.js';
import { OutboundSender } from './messaging/outbound.js';
import { EventAssembler } from './events/assembler.js';
import { mapProfile } from '../services/im/user-directory.js';
import { addCollectedEmoji, mergeCollectedEmojiPage } from '../services/im/emoji.js';
import { normalizeMessageReadPrivacyQueries } from '../services/im/user-settings.js';
import { equalConversationReadSummaries, mergeReadCursorState, validateStoredReadCursors } from '../services/im/read-state.js';
import { ConversationDeleteNoticeEvent, ConversationReadSummaryNoticeEvent } from './events/notice.js';
import { isOrdinaryMessageType, messageClientId, prepareMessageCacheWrite } from '../services/im/message-cache.js';
import { messageDeletionCommand } from '../services/im/notifications.js';
import { conversationDeletionCommand, conversationDeletionPlan, signedMessageIndex } from '../services/im/conversation-delete.js';
import { participantCommand, participantDecimalId } from '../services/im/participant-command.js';
import { mergeConversationSnapshot, buildStrangerConversation } from '../services/im/conversation-state.js';
import { StrangerSync } from '../services/im/stranger-sync.js';
import { selectStrangerConversations } from '../services/im/stranger-list.js';
import { settingCommand, applySettingExt, conversationIsFolded } from '../services/im/setting-command.js';
import { isDesktopMessageDisplayable } from '../services/im/message-display.js';
import { inboundFromMessage } from '../base/raw/inbound-message.js';
import { parsePeerFromConversationId } from '../services/im/mappers.js';
import { ImInboxQueries } from './messaging/inbox-queries.js';
import { Friend } from './contacts/friend.js';
import { Stranger } from './contacts/stranger.js';
import { Group } from './contacts/group.js';
import { toError } from './errors.js';
import { BaseAccount } from '../base/account.js';
import { emitEventRoutes } from './events/router.js';
import { createImStateStore, validateMessageLocalExt, } from '../services/im/state-store.js';
function groupByInbox(items) {
    const batches = new Map();
    for (const item of items) {
        const inboxType = item.inboxType ?? 0;
        const batch = batches.get(inboxType) ?? [];
        batch.push(item);
        batches.set(inboxType, batch);
    }
    return batches;
}
export class Account extends BaseAccount {
    store;
    auth;
    skipVerify;
    preferredUid;
    localStateOptions;
    onlinePayload;
    accountNickname;
    accountProfile;
    friends = new Map();
    strangers = new Map();
    groups = new Map();
    sender;
    assembler;
    inboxFeature;
    stateStore;
    strangerSync;
    strangerDetailRefreshes = new Map();
    applicationSettings;
    readPrivacyCache = new Map();
    readReceiptSwitch;
    collectedEmojiState;
    transientConversations = new Map();
    pendingSettingExt = new Map();
    settingRefreshes = new Map();
    readPrivacyEpoch = 0;
    readCursors = new Map();
    readSummaryNotifications = new Map();
    receivedMessageKeys = new Set();
    readCursorEpoch = 0;
    qrContinuation;
    restoreController;
    actionVerifications = new Set();
    userRelations = new Map();
    constructor(client, store, options = {}) {
        super({ captureRejections: true });
        this.installAccountRuntime(store, client);
        this.store = store;
        this.skipVerify = options.skipVerify ?? false;
        this.localStateOptions = options.localState ?? {};
        const preferredUid = options.accountId
            ? store.resolvePlatformUid(options.accountId)
            : undefined;
        if (preferredUid) {
            this.preferredUid = preferredUid;
            this.accountNickname = store.load(preferredUid)?.meta.screenName;
            this.refreshLoggerIdentity();
        }
        const login = options.login ?? { method: 'qr' };
        this.auth = new AccountAuth({
            client,
            store,
            loginMethod: login.method,
            ...('mobile' in login ? { mobile: login.mobile } : {}),
            ...('password' in login ? { password: login.password } : {}),
        }, {
            onQrcode: (info) => this.emit('system.login.qrcode', info),
            onQrStatus: (payload) => this.emit('system.login.qrcode.status', payload),
            onSms: (payload) => this.emit('system.login.sms', payload),
            onVoice: (payload) => this.emit('system.login.voice', payload),
            onAccountSelection: (payload) => this.emit('system.login.accounts', payload),
            onSmsRequired: (payload) => this.emit('system.login.sms-required', payload),
            onVerification: (payload) => this.emit('system.login.verification', payload),
            onLoggedIn: (account) => this.onLoggedInAccount(account),
        });
    }
    static create(client, store, options = {}) {
        return new Account(client, store, options);
    }
    get uid() {
        return this.runtime.platformUid ?? this.preferredUid;
    }
    get nickname() {
        return this.accountNickname;
    }
    get profile() { return this.accountProfile; }
    async getProfile() {
        this.ensureOnline();
        const generation = this.loginGeneration;
        const connection = this.runtime.connection;
        const response = await connection.getSelfProfile();
        if (!this.online || generation !== this.loginGeneration || connection !== this.runtime.connection) {
            throw new Error('账号状态已变化，自身资料读取已取消');
        }
        const status = response['status_code'];
        if (status !== undefined && status !== 0)
            throw new Error(`查询自身资料失败: status=${String(status)}`);
        const profile = mapProfile(response['user']);
        if (!profile || profile.uid !== this.uid)
            throw new Error('自身资料响应缺失或身份不匹配');
        this.accountProfile = Object.freeze(profile);
        return this.accountProfile;
    }
    get imUid() {
        return this.sender?.imService.myUid || undefined;
    }
    get localStateBackend() {
        return this.stateStore?.backend;
    }
    get fl() {
        return this.friends;
    }
    get gl() {
        return this.groups;
    }
    get sl() {
        return this.strangers;
    }
    forgetGroup(groupId, expected) {
        if (this.groups.get(groupId) !== expected)
            return;
        this.groups.delete(groupId);
        this.transientConversations.delete(groupId);
        this.pendingSettingExt.delete(groupId);
        this.invalidateReadPrivacy(groupId);
        this.readCursors.delete(groupId);
        this.readCursorEpoch++;
        this.stateStore?.deleteConversation(groupId);
    }
    rememberGroup(group) {
        if (!this.groups.has(group.groupId))
            this.groups.set(group.groupId, group);
    }
    rememberFriend(friend) {
        if (!this.friends.has(friend.uid))
            this.friends.set(friend.uid, friend);
    }
    rememberStranger(stranger) {
        if (!this.strangers.has(stranger.uid))
            this.strangers.set(stranger.uid, stranger);
    }
    forgetFriend(uid) {
        this.friends.delete(uid);
    }
    cachedFriend(uid) {
        return this.friends.get(uid);
    }
    cachedFriendByThreadId(threadId) {
        for (const friend of this.friends.values()) {
            if (friend.threadId === threadId)
                return friend;
        }
        return undefined;
    }
    cachedStranger(uid) {
        return this.strangers.get(uid);
    }
    cachedGroup(groupId) {
        return this.groups.get(groupId);
    }
    cachedGroupMembers(groupId) {
        return this.stateStore?.listGroupMembers(groupId);
    }
    replaceCachedGroupMembers(groupId, members) {
        const present = new Set(members.map(member => member.uid));
        const removed = this.cachedReadCursors(groupId).filter(row => !present.has(row.uid)).map(row => row.uid);
        if (removed.length)
            this.removeCachedGroupMembers(groupId, removed);
        this.stateStore?.replaceGroupMembers(groupId, members);
    }
    upsertCachedGroupMembers(groupId, members) {
        this.stateStore?.upsertGroupMembers(groupId, members);
    }
    removeCachedGroupMembers(groupId, uids) {
        if (!uids.length)
            return;
        this.readCursorEpoch++;
        this.readCursors.set(groupId, this.cachedReadCursors(groupId).filter(row => !uids.includes(row.uid)));
        this.stateStore?.removeGroupMembers(groupId, uids);
    }
    cachedReadCursors(conversationId) {
        if (!this.online && !this.stateStore)
            return [];
        let rows = this.readCursors.get(conversationId);
        if (!rows) {
            rows = this.stateStore?.listReadCursors(conversationId) ?? [];
            this.readCursors.set(conversationId, rows);
        }
        return structuredClone(rows);
    }
    cachedReadSummary(conversationId) {
        const uid = this.imUid ?? this.uid;
        return uid ? this.stateStore?.getReadSummary(conversationId, uid) : undefined;
    }
    updateReadSummaries(conversationIds) {
        if (!this.online)
            return;
        const changed = [];
        for (const id of conversationIds) {
            const summary = this.cachedReadSummary(id);
            if (!summary)
                continue;
            const previous = this.readSummaryNotifications.get(id);
            if (previous && equalConversationReadSummaries(previous, summary))
                continue;
            this.readSummaryNotifications.set(id, structuredClone(summary));
            changed.push(summary);
        }
        if (changed.length)
            emitEventRoutes(this.emit.bind(this), new ConversationReadSummaryNoticeEvent(this, changed));
    }
    async readConversationState(address) {
        this.ensureOnline();
        const generation = this.loginGeneration;
        const epoch = this.readCursorEpoch;
        const result = await this.im.getConversationReadState(address);
        if (!this.online || generation !== this.loginGeneration || epoch !== this.readCursorEpoch) {
            throw new Error('账号或读游标状态已变化，查询结果已取消');
        }
        if (result.statusCode === 0) {
            this.saveReadCursors(address.threadId, mergeReadCursorState(this.cachedReadCursors(address.threadId), result));
            this.updateReadSummaries([address.threadId]);
        }
        return result;
    }
    applyParticipantReadIndex(conversationId, uid, index) {
        if (!this.online || !conversationId || uid === this.uid || uid === this.imUid)
            return false;
        validateStoredReadCursors([{ uid, readIndex: index, minIndex: '0' }]);
        const rows = this.cachedReadCursors(conversationId);
        const previous = rows.find(row => row.uid === uid);
        if (BigInt(index) <= BigInt(previous?.readIndex ?? '-1'))
            return false;
        const next = { uid, readIndex: index, minIndex: previous?.minIndex ?? '0' };
        this.saveReadCursors(conversationId, [...rows.filter(row => row.uid !== uid), next]);
        this.readCursorEpoch++;
        this.updateReadSummaries([conversationId]);
        return true;
    }
    saveReadCursors(conversationId, rows) {
        validateStoredReadCursors(rows);
        this.readCursors.set(conversationId, structuredClone(rows));
        try {
            this.stateStore?.saveReadCursors(conversationId, rows);
        }
        catch {
            this.logger.warn('读游标已更新，但本地状态保存失败');
        }
    }
    cacheMessages(messages, source = 'server') {
        const generation = this.loginGeneration;
        let pending = [];
        for (const message of messages) {
            if (generation !== this.loginGeneration)
                return;
            const deletion = source === 'server' ? messageDeletionCommand(message.msgType, message.content) : undefined;
            const setting = source === 'server' ? settingCommand(message.msgType, message.content) : undefined;
            const conversationCommand = source === 'server' && (message.msgType === 50005 || conversationDeletionCommand(message.msgType, message.content)
                || participantCommand(message.msgType, message.content));
            if (deletion || setting || conversationCommand) {
                if (pending.length)
                    this.stateStore?.upsertMessages(pending, source);
                pending = [];
                if (deletion)
                    this.applyMessageDeletionCommand(deletion.conversationId, deletion.serverMessageId, { ...message });
                else if (conversationCommand)
                    this.applyConversationCommand(message.msgType, message.content, message.threadId, { ...message });
                else
                    this.applySettingCommand(message.msgType, message.content, { ...message });
            }
            else
                pending.push(message);
        }
        if (generation === this.loginGeneration && pending.length)
            this.stateStore?.upsertMessages(pending, source);
    }
    cachedMessages(conversationId, count = 50) {
        return this.stateStore?.listMessages(conversationId, count) ?? [];
    }
    cachedMessage(conversationId, id, kind) {
        return this.stateStore?.getMessage(conversationId, id, kind);
    }
    modifyCachedMessageLocalExt(conversationId, clientMessageId, ext) {
        this.ensureOnline();
        validateMessageLocalExt(ext);
        if (!conversationId || !clientMessageId)
            return;
        if (!this.stateStore)
            throw new Error('修改消息本地扩展字段需要启用本地状态库');
        const conversation = this.stateStore.getConversation(conversationId);
        if (!conversation)
            throw new Error('修改消息本地扩展字段失败：本地会话不存在');
        const message = this.stateStore.modifyMessageLocalExt({ conversationId, clientMessageId, ext });
        if (!message)
            throw new Error('修改消息本地扩展字段失败：本地消息不存在');
        this.assembler?.receiveMessageUpdate({ conversationType: message.conversationType ?? conversation.conversationType, raw: {} }, message);
    }
    batchModifyMessageLocalExt(updates) {
        this.ensureOnline();
        if (!Array.isArray(updates))
            throw new TypeError('批量本地扩展更新必须是数组');
        for (const update of updates) {
            if (!update || typeof update.conversationId !== 'string' || typeof update.clientMessageId !== 'string') {
                throw new TypeError('本地扩展更新需要字符串 conversationId/clientMessageId');
            }
            validateMessageLocalExt(update.ext);
        }
        if (!updates.length)
            return;
        if (!this.stateStore)
            throw new Error('修改消息本地扩展字段需要启用本地状态库');
        for (const update of updates)
            this.stateStore.modifyMessageLocalExt(update);
        const messages = updates.flatMap(update => {
            const message = this.stateStore.getMessage(update.conversationId, update.clientMessageId, 'client');
            return message ? [message] : [];
        });
        this.assembler?.receiveMessageListUpdate(messages);
    }
    cachedConversation(conversationId) {
        const current = this.stateStore ? this.stateStore.getConversation(conversationId) : this.transientConversations.get(conversationId);
        return current && structuredClone({ ...current, ...this.pendingSettingExt.get(conversationId) });
    }
    getConversationDeletionBoundary(conversationId) {
        this.ensureOnline();
        if (!this.stateStore)
            throw new Error('删除会话需要本地消息库；localState: false 无法提供 Desktop 删除边界');
        return this.stateStore.getConversationDeletionBoundary(conversationId);
    }
    applyConversationDeletion(conversationId, conversationType, boundary) {
        this.ensureOnline();
        if (!this.stateStore)
            throw new Error('删除会话的本地消息库已关闭');
        this.applyConversationDeletionState(conversationId, boundary);
        emitEventRoutes(this.emit.bind(this), new ConversationDeleteNoticeEvent({ type: 'conversation.delete',
            conversationId, conversationType, raw: { cmd: 603, lastMessageIndex: boundary } }, this));
    }
    applyConversationLeave(conversationId, boundary) {
        this.ensureOnline();
        if (!this.stateStore)
            throw new Error('退群后的本地消息库已关闭');
        this.applyConversationDeletionState(conversationId, boundary);
        this.scheduleConversationUpdate(conversationId, { cmd: 652, lastMessageIndex: boundary });
    }
    applyConversationDeletionState(conversationId, boundary) {
        let outcome;
        if (this.stateStore)
            outcome = this.stateStore.applyConversationDeletion(conversationId, boundary);
        else {
            const current = this.cachedConversation(conversationId);
            if (!current)
                return;
            const plan = conversationDeletionPlan(current, boundary);
            outcome = plan.deleteConversation ? 'deleted' : 'retained';
            this.patchCachedConversation(conversationId, { minIndex: plan.minIndex });
        }
        this.invalidateReadPrivacy(conversationId);
        if (outcome === 'deleted') {
            this.groups.delete(conversationId);
            for (const [uid, stranger] of this.strangers)
                if (stranger.threadId === conversationId)
                    this.strangers.delete(uid);
            this.transientConversations.delete(conversationId);
            this.pendingSettingExt.delete(conversationId);
            this.readCursors.delete(conversationId);
            this.readCursorEpoch++;
        }
    }
    applyConversationCommand(messageType, content, outerId, raw, hasBatch = false) {
        if (messageType === 50005) {
            if (!this.online || !this.cachedConversation(outerId))
                return true;
            this.patchCachedConversation(outerId, { isParticipant: false });
            this.groups.get(outerId)?.updateMetadata({ isParticipant: false });
            if (!hasBatch)
                this.scheduleConversationUpdate(outerId, raw);
            return true;
        }
        const participants = participantCommand(messageType, content);
        if (participants) {
            if (this.online)
                this.applyParticipantCommand(participants, raw, hasBatch);
            return true;
        }
        const command = conversationDeletionCommand(messageType, content);
        if (!command)
            return false;
        if (!this.online)
            return true;
        const current = this.cachedConversation(command.conversationId);
        if (!current)
            return true;
        const hasNewerMessages = signedMessageIndex(current.lastMessageIndex ?? '0') > signedMessageIndex(command.lastMessageIndex);
        const generation = this.loginGeneration;
        this.applyConversationDeletionState(command.conversationId, command.lastMessageIndex);
        this.scheduleConversationUpdate(command.conversationId, raw);
        queueMicrotask(() => {
            if (!this.online || generation !== this.loginGeneration)
                return;
            this.assembler?.receiveNotice(hasNewerMessages
                ? { type: 'conversation.min-index', conversationId: command.conversationId,
                    conversationType: current.conversationType, minIndex: command.lastMessageIndex, raw }
                : { type: 'conversation.delete', conversationId: command.conversationId,
                    conversationType: current.conversationType, raw });
        });
        return true;
    }
    applyParticipantCommand(command, raw, hasBatch) {
        const id = command.conversationId;
        const generation = this.loginGeneration;
        for (const uid of command.removed) {
            if (uid === participantDecimalId(this.imUid || this.uid || ''))
                this.applyConversationCommand(50005, '', id, raw, hasBatch);
        }
        if (command.removed.length) {
            void Promise.resolve().then(() => {
                if (!this.online || generation !== this.loginGeneration)
                    return;
                const current = this.cachedConversation(id);
                if (!current)
                    return;
                const removed = new Set(command.removed);
                const members = current.members?.filter(member => !removed.has(member.uid));
                const readCursors = this.cachedReadCursors(id).filter(row => !removed.has(row.uid));
                const changed = this.stateStore ? this.stateStore.removeConversationMembers(id, command.removed)
                    : members !== undefined && members.length !== current.members?.length;
                if (changed === undefined)
                    return;
                if (!this.stateStore && changed)
                    this.patchCachedConversation(id, { members });
                this.groups.get(id)?.removeCachedMemberIds(command.removed);
                this.readCursors.set(id, readCursors);
                this.readCursorEpoch++;
                if (changed)
                    this.scheduleConversationUpdate(id, raw);
                queueMicrotask(() => {
                    if (!this.online || generation !== this.loginGeneration)
                        return;
                    this.assembler?.receiveNotice({ type: 'conversation.members-remove', conversationId: id,
                        conversationType: current.conversationType, memberUids: command.removed, raw });
                });
            }).catch(error => {
                if (this.online && generation === this.loginGeneration)
                    this.logger.warn('成员移除本地同步失败: %s', toError(error).message);
            });
        }
        if (command.added.length || command.modified.length) {
            void (async () => {
                const response = await this.im.getConversationInfos([{ threadId: id, conversationShortId: participantDecimalId(id),
                        conversationType: command.conversationType, inboxType: command.inboxType }]);
                if (!this.online || generation !== this.loginGeneration)
                    return;
                if (response.statusCode !== 0)
                    throw new Error(`status=${response.statusCode} ${response.statusMsg}`);
                for (const info of response.conversations)
                    this.applyConversationInfo(info);
                this.scheduleConversationUpdate(id, raw);
            })().catch(error => {
                if (this.online && generation === this.loginGeneration)
                    this.logger.warn('成员变更会话补拉失败: %s', toError(error).message);
            });
        }
    }
    saveConversationSnapshot(info, source = 'server') {
        if (source === 'server')
            info = mergeConversationSnapshot(this.cachedConversation(info.conversationId), info, this.imUid || this.uid);
        if (this.stateStore) {
            this.stateStore.upsertConversations([info], source);
            this.pendingSettingExt.delete(info.conversationId);
            return this.stateStore.getConversation(info.conversationId);
        }
        this.transientConversations.set(info.conversationId, structuredClone(info));
        this.pendingSettingExt.delete(info.conversationId);
        return info;
    }
    applySettingCommand(messageType, content, raw) {
        const command = settingCommand(messageType, content);
        if (!command)
            return false;
        if (!this.online)
            return true;
        const current = this.cachedConversation(command.conversationId);
        if (!current)
            return true;
        const result = applySettingExt(current, command.entries);
        if (result.changed)
            this.pendingSettingExt.set(command.conversationId, result.state);
        if (result.handled) {
            if (result.changed) {
                const saved = { ...result.state, isFolded: conversationIsFolded(result.state.settingExt) };
                this.pendingSettingExt.set(command.conversationId, saved);
                this.patchCachedConversation(command.conversationId, saved);
            }
            this.scheduleConversationUpdate(command.conversationId, raw);
        }
        else if (BigInt(command.version) >= BigInt(current.settingVersion ?? '0')) {
            this.refreshSettingConversation(command, current, raw);
        }
        return true;
    }
    scheduleConversationUpdate(id, raw) {
        const generation = this.loginGeneration;
        queueMicrotask(() => {
            if (!this.online || generation !== this.loginGeneration)
                return;
            const current = this.cachedConversation(id);
            if (current)
                this.assembler?.receiveNotice({ type: 'conversation.update', conversationId: id,
                    conversationType: current.conversationType, raw });
        });
    }
    refreshSettingConversation(command, current, raw) {
        const id = command.conversationId;
        if (!id || this.settingRefreshes.has(id))
            return;
        const generation = this.loginGeneration;
        const task = (async () => {
            const response = await this.im.getConversationInfos([{ threadId: id, conversationShortId: current.conversationShortId,
                    conversationType: current.conversationType, inboxType: current.inboxType ?? 0 }]);
            if (!this.online || generation !== this.loginGeneration)
                return;
            if (response.statusCode !== 0)
                throw new Error(`status=${response.statusCode} ${response.statusMsg}`);
            for (const info of response.conversations)
                this.applyConversationInfo(info);
            this.scheduleConversationUpdate(id, raw);
        })();
        this.settingRefreshes.set(id, task);
        void task.catch(error => {
            if (this.online && generation === this.loginGeneration)
                this.logger.warn('会话设置补拉失败: %s', toError(error).message);
        }).finally(() => {
            if (this.settingRefreshes.get(id) === task)
                this.settingRefreshes.delete(id);
        });
    }
    removeCachedMessage(conversationId, serverMessageId) {
        const message = this.cachedMessage(conversationId, serverMessageId, 'server');
        this.invalidateReadPrivacy(conversationId, serverMessageId);
        this.stateStore?.deleteMessage(conversationId, serverMessageId);
        return message !== undefined && message.deleted !== true;
    }
    applyMessageDeletionCommand(conversationId, serverMessageId, raw) {
        if (!this.online || !conversationId)
            return undefined;
        const original = this.cachedMessage(conversationId, serverMessageId, 'server');
        const clientId = original && messageClientId(original);
        if (!clientId)
            return undefined;
        this.deleteCachedMessageByClientId(conversationId, clientId, true, raw);
        return clientId;
    }
    deleteCachedMessageByClientId(conversationId, clientId, updateReferences, raw = {}) {
        if (!this.online || !conversationId || !clientId)
            return false;
        const target = this.cachedMessage(conversationId, clientId, 'client');
        if (!target)
            return false;
        const assembler = this.assembler;
        const generation = this.loginGeneration;
        this.invalidateReadPrivacy(conversationId, target.msgId);
        const summaryChanged = this.stateStore?.deleteMessage(conversationId, clientId, 'client');
        if (summaryChanged) {
            const conversation = this.cachedConversation(conversationId);
            if (conversation)
                assembler?.receiveNotice({ type: 'conversation.update', conversationId,
                    conversationType: conversation.conversationType, raw });
            if (!this.online || generation !== this.loginGeneration)
                return true;
        }
        const references = updateReferences ? this.stateStore?.getReferencingMessages(conversationId, target.msgId) ?? [] : [];
        for (const reference of references)
            reference.referenceInfo = { ...reference.referenceInfo, refMessageStatus: 4 };
        const updates = this.stateStore?.upsertMessages(references, 'local-update') ?? [];
        for (const { message } of updates) {
            if (!this.online || generation !== this.loginGeneration)
                return true;
            assembler?.receiveMessageUpdate({ conversationType: message.conversationType ?? this.cachedConversation(conversationId)?.conversationType ?? 0, raw }, message);
        }
        if (this.online && generation === this.loginGeneration)
            assembler?.receiveMessageDelete(target, raw);
        return true;
    }
    markCachedMessageRecalled(conversationId, target) {
        if (!conversationId || !target.clientMessageId)
            return undefined;
        const message = (target.clientMessageId ? this.cachedMessage(conversationId, target.clientMessageId, 'client') : undefined)
            ?? (target.serverMessageId ? this.cachedMessage(conversationId, target.serverMessageId, 'server') : undefined);
        if (!message)
            return undefined;
        const now = BigInt(Date.now());
        const rawTime = target.createTime && /^-?\d+$/.test(target.createTime) ? BigInt(target.createTime) : 0n;
        const timestamp = rawTime > 0n && rawTime < now ? rawTime : now;
        message.ext = { ...message.ext, 's:is_recalled': 'true' };
        message.localExt = { ...message.localExt, 's:text_recall_timestamp': String(timestamp) };
        this.invalidateReadPrivacy(conversationId, message.msgId);
        this.stateStore?.deleteMessageReadPrivacy(conversationId, message.msgId);
        const references = this.stateStore?.getReferencingMessages(conversationId, message.msgId) ?? [];
        for (const reference of references) {
            reference.referenceInfo = { ...reference.referenceInfo, refMessageStatus: 3 };
            if (reference.msgId === message.msgId)
                message.referenceInfo = reference.referenceInfo;
        }
        const updates = this.stateStore?.upsertMessages([message], 'local-update') ?? [];
        this.stateStore?.refreshRecalledSummary(conversationId, messageClientId(message));
        updates.push(...this.stateStore?.upsertMessages(references.filter(reference => reference.msgId !== message.msgId), 'local-update') ?? []);
        this.assembler?.receiveMessageBatch(updates.map(update => update.message), [], target.raw ?? {});
        return updates[0]?.message;
    }
    forgetConversation(conversationId) {
        this.groups.delete(conversationId);
        this.transientConversations.delete(conversationId);
        this.pendingSettingExt.delete(conversationId);
        this.invalidateReadPrivacy(conversationId);
        this.readCursors.delete(conversationId);
        this.readCursorEpoch++;
        this.stateStore?.deleteConversation(conversationId);
    }
    invalidateReadPrivacy(conversationId, serverMessageId) {
        this.readPrivacyEpoch++;
        for (const [id, entry] of this.readPrivacyCache) {
            if (entry.query.conversationId === conversationId && (!serverMessageId || serverMessageId === id))
                this.readPrivacyCache.delete(id);
        }
    }
    patchCachedConversation(conversationId, patch) {
        const pending = this.pendingSettingExt.get(conversationId);
        this.stateStore?.patchConversation(conversationId, { ...pending, ...patch });
        const current = this.transientConversations.get(conversationId);
        if (!this.stateStore && current)
            this.transientConversations.set(conversationId, { ...current, ...structuredClone({ ...pending, ...patch }) });
        this.pendingSettingExt.delete(conversationId);
    }
    continueLogin() {
        if (this.qrContinuation)
            return this.qrContinuation;
        const task = this.continueLoginAction(() => this.auth.continueQrLogin());
        this.qrContinuation = task;
        void task.then(() => {
            if (this.qrContinuation === task)
                delete this.qrContinuation;
        }, () => {
            if (this.qrContinuation === task)
                delete this.qrContinuation;
        });
        return task;
    }
    async continueLoginWithSms(code) {
        await this.continueLoginAction(() => this.auth.continueSmsLogin(code));
    }
    async requestLoginSmsCode() {
        await this.continueLoginAction(() => this.auth.requestSmsCode());
    }
    async requestLoginVoiceCode() {
        await this.continueLoginAction(() => this.auth.requestVoiceCode());
    }
    async continueLoginWithSubAccount(selection) {
        await this.continueLoginAction(() => this.auth.continueWithSubAccount(selection));
    }
    async beginLogin(generation) {
        const preferred = this.preferredUid ?? this.store.resolvePlatformUid();
        const saved = preferred ? this.store.load(preferred) : undefined;
        if (preferred && saved) {
            const controller = new AbortController();
            this.restoreController = controller;
            let restored;
            try {
                restored = await tryRestoreSession(this.store, (cfg) => new ApiConnection(cfg), preferred, {
                    skipVerify: this.skipVerify, signal: controller.signal,
                    probeSession: (client, signal) => this.auth.probeRestoredSession(client, signal),
                });
            }
            finally {
                if (this.restoreController === controller)
                    delete this.restoreController;
            }
            this.assertLoginGeneration(generation);
            if (restored.wake) {
                this.emit('system.login.session', {
                    status: restored.outcome === 'ok' && restored.wake.verified
                        ? 'valid'
                        : restored.outcome === 'expired'
                            ? 'expired'
                            : 'unverified',
                    reason: restored.wake.reason,
                });
            }
            if (restored.outcome === 'error') {
                throw new Error(`Session 恢复未通过校验：${restored.wake?.reason ?? '未知错误'}；凭据已保留，请稍后重试登录`);
            }
            if (restored.outcome === 'ok' && restored.wake) {
                const wakeClient = restored.wake.client;
                this.auth.setClient(wakeClient);
                this.runtime.bindRestored(wakeClient, restored.wake.account);
                this.accountNickname = restored.wake.screenName ?? restored.wake.account.meta.screenName;
                await this.goOnline(generation);
                return;
            }
        }
        this.assertLoginGeneration(generation);
        await this.auth.beginLogin();
    }
    cancelLogin() {
        this.restoreController?.abort(new Error('登录已取消'));
        delete this.restoreController;
        this.auth.cancel();
        delete this.qrContinuation;
    }
    onDeviceUpdated() {
        void this.applicationSettings?.restart(this.runtime.connection.getApplicationSettingsUrl());
    }
    async stopRuntime() {
        this.strangerSync?.close();
        delete this.strangerSync;
        this.strangerDetailRefreshes.clear();
        this.applicationSettings?.stop();
        delete this.applicationSettings;
        for (const verification of this.actionVerifications)
            verification.cancel('账号已停止，业务验证已取消');
        try {
            await super.stopRuntime();
        }
        finally {
            this.readPrivacyCache.clear();
            this.readReceiptSwitch = undefined;
            this.collectedEmojiState = undefined;
            this.transientConversations.clear();
            this.pendingSettingExt.clear();
            this.settingRefreshes.clear();
            this.readPrivacyEpoch++;
            this.readCursors.clear();
            this.readCursorEpoch++;
            this.readSummaryNotifications.clear();
            this.receivedMessageKeys.clear();
            const stateStore = this.stateStore;
            this.assembler?.clear();
            delete this.sender;
            delete this.assembler;
            delete this.inboxFeature;
            delete this.stateStore;
            stateStore?.close();
        }
    }
    onLoggedOut() {
        this.userRelations.clear();
        delete this.accountProfile;
        this.friends.clear();
        this.strangers.clear();
        this.groups.clear();
    }
    pickFriend(uid) {
        this.ensureOnline();
        return this.friends.get(uid);
    }
    pickGroup(groupId) {
        this.ensureOnline();
        return this.groups.get(groupId);
    }
    pickStranger(uid) {
        this.ensureOnline();
        return this.strangers.get(uid);
    }
    async createGroup(participantUids, options = {}) {
        this.ensureOnline();
        if (participantUids.length === 0)
            throw new Error('创建群聊至少需要一个其他成员');
        if (participantUids.some((uid) => !/^\d+$/.test(uid))) {
            throw new Error('群成员 uid 必须是数字 IM uid');
        }
        const selfUid = this.imUid || this.uid || '';
        if (!/^\d+$/.test(selfUid))
            throw new Error('当前账号缺少可用的数字 IM uid');
        const participants = [...new Set([selfUid, ...participantUids])];
        if (participants.length < 2)
            throw new Error('创建群聊至少需要一个其他成员');
        const response = await this.im.createGroupConversation(participants, options);
        if (response.statusCode !== 0) {
            throw new Error(`创建群聊失败: status=${response.statusCode}${response.statusMsg ? ` ${response.statusMsg}` : ''}`);
        }
        let info = response.conversation;
        const groupId = info?.conversationId || info?.conversationShortId;
        const shortId = info?.conversationShortId || groupId;
        if (!info || !groupId || !shortId) {
            throw new Error('创建群聊失败: 响应缺少 conversation');
        }
        info = this.saveConversationSnapshot(info);
        const group = this.bindGroup(groupId, shortId, {
            ...(info.name ? { name: info.name } : {}),
            ...(info.description ? { description: info.description } : {}),
            ...(info.notice ? { notice: info.notice } : {}),
            ...(info.avatar ? { avatar: info.avatar } : {}),
            ...(info.ownerUid ? { ownerUid: info.ownerUid } : {}),
            ...(info.participantsCount !== undefined
                ? { memberCount: info.participantsCount }
                : {}),
            ...(info.muted !== undefined ? { muted: info.muted } : {}),
            ...(info.pinned !== undefined ? { pinned: info.pinned } : {}),
            ...(info.favorite !== undefined ? { favorite: info.favorite } : {}),
            ...(info.isParticipant !== undefined ? { isParticipant: info.isParticipant } : {}),
            ...(info.inboxType !== undefined ? { inboxType: info.inboxType } : {}),
            members: info.members,
        });
        this.rememberGroup(group);
        return group;
    }
    async getFriendList() {
        this.ensureOnline();
        const generation = this.loginGeneration;
        const relationsAtStart = new Map(this.userRelations);
        const infos = new Map();
        let friendUids = [];
        let closeFriendUids;
        const seen = new Set();
        let cursor = '0';
        for (;;) {
            const response = await this.inboxQueries.friendList({
                cursor,
                count: 100,
            });
            if (!this.online || generation !== this.loginGeneration)
                throw new Error('账号状态已变化，好友列表读取已取消');
            this.ensureQuerySucceeded('查询好友列表', response.statusCode, response.statusMsg);
            for (const info of response.userList)
                infos.set(info.uid, info);
            friendUids = response.friendUids;
            closeFriendUids = response.closeFriendUids;
            if (!response.hasMore)
                break;
            if (!response.cursor || response.cursor === cursor || seen.has(response.cursor)) {
                throw new Error('查询好友列表失败: 服务端分页游标未推进');
            }
            seen.add(cursor);
            cursor = response.cursor;
        }
        const next = new Map();
        const closeSet = new Set(closeFriendUids ?? []);
        const orderedUids = [...closeSet, ...friendUids.filter(uid => !closeSet.has(uid))];
        for (const uid of orderedUids) {
            const info = infos.get(uid);
            if (!info)
                continue;
            if (info.remark !== undefined && this.userRelations.get(info.uid) === relationsAtStart.get(info.uid)) {
                this.updateUserRelation(info.uid, { remark: info.remark });
            }
            const friend = this.bindFriend(info.uid, info.threadId, info.conversationShortId ?? '', {
                nickname: info.nickname,
                ...(info.avatarThumb ? { avatar: info.avatarThumb } : {}),
                ...(info.secUid ? { secUid: info.secUid } : {}),
                ...(info.remark !== undefined ? { remark: info.remark } : {}),
                ...(info.signature !== undefined ? { signature: info.signature } : {}),
                ...(closeFriendUids !== undefined ? { closeFriend: closeSet.has(uid) } : {}),
            });
            next.set(friend.uid, friend);
        }
        this.replaceCache(this.friends, next);
        return [...this.friends.values()];
    }
    async ensureFriendConversation(friend) {
        if (friend.conversationShortId)
            return;
        const generation = this.loginGeneration;
        const selfUid = this.imUid || this.uid || '';
        if (!/^\d+$/.test(selfUid))
            throw new Error('当前账号缺少可用的数字 IM uid');
        const response = await this.im.createPrivateConversation([selfUid, friend.uid]);
        if (!this.online || generation !== this.loginGeneration)
            throw new Error('账号状态已变化，请核对远端会话创建结果');
        this.ensureQuerySucceeded('创建私聊会话', response.statusCode, response.statusMsg);
        const conversation = response.conversation;
        if (!conversation?.conversationId || !conversation.conversationShortId) {
            throw new Error('创建私聊会话失败: 响应缺少 conversation');
        }
        friend.bindConversation(conversation.conversationId, conversation.conversationShortId);
        this.applyConversationInfo(conversation);
    }
    async getGroupList(force = false) {
        this.ensureOnline();
        const generation = this.loginGeneration;
        const response = await this.inboxQueries.groupList(force);
        if (!this.online || generation !== this.loginGeneration)
            throw new Error('账号状态已变化，群列表读取已取消');
        this.ensureQuerySucceeded('查询群列表', response.statusCode, response.statusMsg);
        const next = new Map();
        const snapshots = [];
        for (const rawInfo of response.groups) {
            const info = response.fromCache ? this.cachedConversation(rawInfo.conversationId) ?? rawInfo : this.saveConversationSnapshot(rawInfo);
            snapshots.push(info);
            const group = this.bindGroup(info.conversationId, info.conversationShortId, {
                ...(info.name ? { name: info.name } : {}),
                ...(info.description ? { description: info.description } : {}),
                ...(info.notice ? { notice: info.notice } : {}),
                ...(info.avatar ? { avatar: info.avatar } : {}),
                ...(info.ownerUid ? { ownerUid: info.ownerUid } : {}),
                ...(info.participantsCount !== undefined ? { memberCount: info.participantsCount } : {}),
                ...(info.muted !== undefined ? { muted: info.muted } : {}),
                ...(info.pinned !== undefined ? { pinned: info.pinned } : {}),
                ...(info.favorite !== undefined ? { favorite: info.favorite } : {}),
                ...(info.isParticipant !== undefined
                    ? { isParticipant: info.isParticipant }
                    : {}),
                inboxType: info.inboxType ?? 0,
                members: info.members,
            });
            next.set(group.groupId, group);
        }
        if (!response.fromCache)
            this.stateStore?.replaceGroups(snapshots);
        for (const [id, group] of this.groups)
            if (!next.has(id))
                this.forgetGroup(id, group);
        for (const [id, conversation] of this.transientConversations) {
            if (conversation.isGroup && !next.has(id))
                this.transientConversations.delete(id);
        }
        this.replaceCache(this.groups, next);
        return [...this.groups.values()];
    }
    getStrangerConversations() {
        this.ensureOnline();
        return this.stateStore?.queryStrangerConversations() ?? selectStrangerConversations([...this.transientConversations.values()]);
    }
    async getStrangerList() {
        const conversations = this.getStrangerConversations();
        const selfUid = this.imUid || this.uid || '';
        const next = new Map();
        for (const info of conversations) {
            if (info.conversationType !== 1 || info.isGroup)
                continue;
            const uid = parsePeerFromConversationId(info.conversationId, selfUid);
            if (!uid || next.has(uid))
                continue;
            const peer = info.members.find(member => member.uid === uid);
            const stranger = this.bindStranger(uid, info.conversationId, info.conversationShortId, {
                ...(peer?.nickname ? { nickname: peer.nickname } : {}),
                ...(peer?.avatar ? { avatar: peer.avatar } : {}),
                ...(peer?.secUid ? { secUid: peer.secUid } : {}),
                inboxType: info.inboxType ?? 1,
            });
            next.set(stranger.uid, stranger);
        }
        this.replaceCache(this.strangers, next);
        return [...this.strangers.values()];
    }
    refreshStrangerConversations() {
        this.ensureOnline();
        return this.strangerSync.refresh();
    }
    loadMoreStrangerConversations() {
        this.ensureOnline();
        return this.strangerSync.loadMore();
    }
    consumeStrangerPage(page, generation) {
        if (generation !== this.loginGeneration)
            throw new Error('账号状态已变化，陌生人同步已取消');
        this.ensureOnline();
        for (const row of page.messages) {
            if (generation !== this.loginGeneration)
                throw new Error('账号状态已变化，陌生人同步已取消');
            this.ensureOnline();
            const info = buildStrangerConversation(this.cachedConversation(row.conversationId), row, this.imUid || this.uid || '', 1);
            if (!info)
                continue;
            this.bindConversationInfo(this.saveConversationSnapshot(info, 'local'));
            this.refreshStrangerDetails(info, generation);
        }
        const messages = page.messages.flatMap(row => row.messages)
            .map(inboundFromMessage).filter((message) => message !== null);
        this.consumeMessageBatch(messages, generation);
    }
    refreshStrangerDetails(info, generation) {
        const id = info.conversationId;
        if (this.strangerDetailRefreshes.has(id))
            return;
        const im = this.im;
        const task = (async () => {
            const response = await im.getConversationInfos([{ threadId: id, conversationShortId: info.conversationShortId,
                    conversationType: info.conversationType, inboxType: info.inboxType ?? 1 }]);
            if (!this.online || generation !== this.loginGeneration || this.im !== im)
                return;
            if (response.statusCode !== 0)
                throw new Error(`status=${response.statusCode} ${response.statusMsg}`);
            const updated = response.conversations.find(conversation => conversation.conversationId === id);
            if (!updated)
                throw new Error('会话详情响应缺少请求的会话');
            this.applyConversationInfo(updated);
            this.scheduleConversationUpdate(id, {});
        })();
        this.strangerDetailRefreshes.set(id, task);
        void task.catch(error => {
            if (this.online && generation === this.loginGeneration)
                this.logger.warn('陌生人会话资料补拉失败: %s', toError(error).message);
        }).finally(() => {
            if (this.strangerDetailRefreshes.get(id) === task)
                this.strangerDetailRefreshes.delete(id);
        });
    }
    getStrangerUnreadCount(reset = false) {
        this.ensureOnline();
        return this.im.getStrangerUnreadCount(reset);
    }
    async markAllStrangersRead() {
        this.ensureOnline();
        return this.im.markAllStrangerConversationsRead();
    }
    async deleteAllStrangerConversations() {
        this.ensureOnline();
        const generation = this.loginGeneration;
        const result = await this.im.deleteAllStrangerConversations();
        if (result.statusCode === 0 && this.online && generation === this.loginGeneration)
            this.strangers.clear();
        return result;
    }
    async refreshContacts() {
        this.ensureOnline();
        const response = await this.refreshContactAddresses([...this.fl.values(), ...this.gl.values(), ...this.sl.values()]);
        this.ensureQuerySucceeded('刷新会话资料', response.statusCode, response.statusMsg);
        return [...this.friends.values(), ...this.groups.values(), ...this.strangers.values()];
    }
    async markMessagesRead(messages) {
        this.ensureOnline();
        if (messages.length === 0)
            throw new Error('markMessagesRead requires at least one message');
        for (const message of messages) {
            if (message.account !== this)
                throw new Error('message belongs to another account');
            if (!message.serverMessageId)
                throw new Error('message has no server message id');
        }
        const response = await this.markReadTargets(messages.map((message) => ({
            threadId: message.threadId,
            conversationShortId: message.conversationShortId,
            conversationType: message.conversationType,
            inboxType: message.inboxType,
            serverMessageId: message.serverMessageId,
            ...(message.indexInConversation ? { indexInConversation: message.indexInConversation } : {}),
            ...(message.indexInConversationV2 ? { indexInConversationV2: message.indexInConversationV2 } : {}),
            readBadgeCount: 1,
        })));
        const failedKeys = new Set(response.failed.map((item) => `${item.threadId}:${item.serverMessageId}`));
        const failed = messages.filter((message) => failedKeys.has(`${message.threadId}:${message.serverMessageId ?? ''}`));
        const failedSet = new Set(failed);
        return {
            statusCode: response.statusCode,
            statusMsg: response.statusMsg,
            ...(response.checkCode !== undefined ? { checkCode: response.checkCode } : {}),
            succeeded: messages.filter((message) => !failedSet.has(message)),
            failed,
        };
    }
    searchConversations(query) {
        this.ensureOnline();
        const needle = query.trim().toLocaleLowerCase();
        if (!needle)
            return [];
        const contacts = [
            ...this.friends.values(),
            ...this.groups.values(),
            ...this.strangers.values(),
        ];
        return contacts.filter((contact) => {
            const values = contact instanceof Group
                ? [contact.groupId, contact.name, ...[...contact.memberList.values()].flatMap((member) => [
                        member.uid,
                        member.displayName,
                    ])]
                : [contact.uid, contact.nickname];
            return values.some((value) => value?.toLocaleLowerCase().includes(needle));
        });
    }
    on(event, listener) {
        return super.on(event, listener);
    }
    emit(event, ...args) {
        return super.emit(event, ...args);
    }
    async onLoggedInAccount(account) {
        const generation = this.loginGeneration;
        this.assertLoginGeneration(generation);
        this.runtime.bindPromoted(this.runtime.connection, account);
        this.refreshLoggerIdentity();
        this.accountNickname = account.meta.screenName;
        await this.goOnline(generation);
    }
    async goOnline(generation) {
        this.assertLoginGeneration(generation);
        const bound = this.runtime.bound;
        const sender = new OutboundSender(bound.client, {
            platformUid: bound.platformUid,
            deviceId: bound.deviceId,
            getStickerEnabledStatus: () => this.collectedEmojiState?.stickerEnabledStatus,
            getConversationSettingExt: (id) => this.cachedConversation(id)?.settingExt,
            onMessage: (message) => {
                if (!this.online || generation !== this.loginGeneration)
                    return;
                this.cacheMessages([message], 'send-ack');
            },
        });
        const assembler = new EventAssembler(this, {
            acceptMessage: (inbound) => {
                if (!this.online || generation !== this.loginGeneration)
                    return false;
                if (!isOrdinaryMessageType(inbound.messageType))
                    return false;
                const update = this.cacheInboundMessage(inbound);
                assembler.receiveMessageUpdate(inbound, update.message);
                return this.online && generation === this.loginGeneration && update.isNew && isDesktopMessageDisplayable(update.message)
                    && inbound.senderUid !== bound.platformUid && inbound.senderUid !== this.imUid;
            },
            onMessage: (event) => emitEventRoutes(this.emit.bind(this), event),
            onNotice: (event) => {
                if (this.online && generation === this.loginGeneration)
                    emitEventRoutes(this.emit.bind(this), event);
            },
            onRequest: (event) => emitEventRoutes(this.emit.bind(this), event),
        }, bound.platformUid);
        let stateStore;
        let strangerSync;
        const applicationSettings = new DesktopSettings({ directory: this.store.accountDataDir(bound.platformUid),
            identity: bound.client.getApplicationSettingsUrl(), request: signal => bound.client.getApplicationSettings(signal),
            onError: () => this.logger.warn('应用配置刷新失败，保留上次可用配置'),
        });
        this.applicationSettings = applicationSettings;
        try {
            const settings = await applicationSettings.start();
            this.assertLoginGeneration(generation);
            const floatHintConfig = desktopFloatHintConfig(settings);
            stateStore = this.localStateOptions === false
                ? undefined
                : createImStateStore({
                    accountDir: this.store.accountDataDir(bound.platformUid),
                    ...this.localStateOptions,
                    userId: bound.platformUid,
                    ...(floatHintConfig ? { floatHintConfig } : {}),
                });
            this.sender = sender;
            this.assembler = assembler;
            if (stateStore)
                this.stateStore = stateStore;
            strangerSync = new StrangerSync({ im: sender.imService, ...(stateStore ? { store: stateStore } : {}),
                assertActive: () => {
                    if (generation !== this.loginGeneration)
                        throw new Error('账号状态已变化，陌生人同步已取消');
                    this.ensureOnline();
                    if (this.sender !== sender)
                        throw new Error('账号连接已变化，陌生人同步已取消');
                },
                consumePage: page => this.consumeStrangerPage(page, generation),
            });
            this.strangerSync = strangerSync;
            this.inboxFeature = new ImInboxQueries(sender.imService, bound.platformUid, stateStore);
            await this.seedThreadShortIds(generation);
            this.assertLoginGeneration(generation);
            await this.startConnection({
                platformUid: bound.platformUid,
                deviceId: bound.deviceId,
                installId: bound.client.getInstallId(),
                sessionCookies: bound.account.session.cookies,
                ...(stateStore ? { cursorStore: stateStore } : {}),
                deviceUserAgent: bound.account.deviceProfile.userAgent,
                imService: sender.imService,
                logger: this.logger,
                onInbound: (inbound) => assembler.receiveMessage(inbound),
                onHistoryBatch: (messages, conversations) => {
                    if (!this.online || generation !== this.loginGeneration)
                        return;
                    for (const conversation of conversations)
                        this.applyConversationInfo(conversation);
                    this.consumeMessageBatch(messages, generation);
                },
                onNotice: (notice) => assembler.receiveNotice(notice),
                onRaw: (cmd, response) => this.emit('message.raw', { cmd, response }),
                onClose: () => {
                    if (this.state === 'online')
                        this.setAccountState('reconnecting');
                },
                onReconnecting: (payload) => {
                    if (this.state === 'online')
                        this.setAccountState('reconnecting');
                    if (this.state === 'reconnecting')
                        this.emit('system.reconnecting', payload);
                },
                onOpen: () => {
                    if (this.state !== 'reconnecting')
                        return;
                    this.setAccountState('online');
                    if (this.onlinePayload)
                        this.emit('system.online', this.onlinePayload);
                },
            });
        }
        catch (error) {
            strangerSync?.close();
            if (this.strangerSync === strangerSync)
                delete this.strangerSync;
            applicationSettings.stop();
            if (this.applicationSettings === applicationSettings)
                delete this.applicationSettings;
            assembler.clear();
            stateStore?.close();
            if (this.sender === sender) {
                this.transientConversations.clear();
                this.pendingSettingExt.clear();
                this.settingRefreshes.clear();
                delete this.sender;
                delete this.assembler;
                delete this.inboxFeature;
                delete this.stateStore;
            }
            throw error;
        }
        this.assertLoginGeneration(generation);
        const payload = {
            platformUid: bound.platformUid,
            ...(bound.account.meta.screenName ? { screenName: bound.account.meta.screenName } : {}),
        };
        this.onlinePayload = payload;
        this.accountNickname = payload.screenName;
        this.completeLogin();
        this.startSessionRenewal((scene, signal) => this.auth.refreshSession(scene, signal));
        this.emit('system.online', payload);
        await this.loadOnlineContacts(generation);
    }
    async loadOnlineContacts(generation) {
        const current = () => this.online && generation === this.loginGeneration;
        if (!current())
            return;
        const lists = [
            { name: '好友', unit: '个好友', load: () => this.getFriendList() },
            { name: '群', unit: '个群', load: () => this.getGroupList(true) },
            { name: '陌生人', unit: '个陌生人', load: async () => {
                    const result = await this.refreshStrangerConversations();
                    if (!current())
                        throw new Error('账号状态已变化，联系人加载已取消');
                    this.ensureQuerySucceeded('同步陌生人', result.statusCode, result.statusMsg);
                    return this.getStrangerList();
                } },
        ];
        const results = await Promise.allSettled(lists.map(async (list) => {
            const items = await list.load();
            return items.length;
        }));
        if (!current())
            return;
        const summary = results.map((result, index) => {
            const list = lists[index];
            if (result.status === 'fulfilled')
                return `${result.value} ${list.unit}`;
            this.logger.warn('%s列表加载失败: %s', list.name, toError(result.reason).message);
            return `${list.name}加载失败`;
        });
        this.logger.info('加载了 %s', summary.join('，'));
    }
    get outbound() {
        if (!this.sender || (!this.online && this.state !== 'logging-in')) {
            throw new Error('账号未上线，请先 await account.login() 并完成登录');
        }
        return this.sender;
    }
    get im() {
        return this.outbound.imService;
    }
    getUserRelation(uid) {
        const cached = this.userRelations.get(uid);
        if (cached)
            return cached;
        const persisted = this.stateStore?.getUserRelation(uid);
        if (!persisted)
            return undefined;
        const relation = Object.freeze(persisted);
        this.userRelations.set(uid, relation);
        return relation;
    }
    updateUserRelation(uid, patch) {
        if (!/^\d+$/.test(uid))
            throw new Error('用户 ID 无效');
        const relation = Object.freeze({ ...this.getUserRelation(uid), ...patch });
        this.userRelations.set(uid, relation);
        try {
            this.stateStore?.setUserRelation(uid, relation);
        }
        catch {
            this.logger.warn('用户关系已更新，但本地状态保存失败');
        }
    }
    async readUserProfile(uid, secUid) {
        this.ensureOnline();
        const generation = this.loginGeneration;
        if (!secUid)
            throw new Error('用户缺少 secUid，请先刷新联系人资料');
        const relationAtStart = this.getUserRelation(uid);
        const profile = await this.im.getUserProfile(secUid);
        if (!this.online || generation !== this.loginGeneration)
            throw new Error('账号状态已变化，资料读取已取消');
        if (!profile || profile.uid !== uid)
            throw new Error('用户资料响应缺失或身份不匹配');
        const followStatus = profile.followStatus;
        if (this.getUserRelation(uid) === relationAtStart)
            this.updateUserRelation(uid, {
                ...(followStatus !== undefined && [0, 1, 2, 4].includes(followStatus)
                    ? { followStatus: followStatus } : {}),
                ...(profile.followerStatus === 0 || profile.followerStatus === 1
                    ? { followerStatus: profile.followerStatus } : {}),
                ...(profile.blocked !== undefined ? { blocked: profile.blocked } : {}),
                ...(profile.remark !== undefined ? { remark: profile.remark } : {}),
            });
        return profile;
    }
    async runVerifiedAction(target, action, publish) {
        this.ensureOnline();
        const generation = this.loginGeneration;
        for (let attempt = 0;; attempt++) {
            if (!this.online || generation !== this.loginGeneration)
                throw new Error('账号状态已变化，业务操作已取消');
            let result;
            try {
                result = await action();
            }
            catch (error) {
                if (!(error instanceof ActionChallengeError) || attempt >= 2
                    || !this.online || generation !== this.loginGeneration)
                    throw error;
                await this.waitForActionVerification(target, error);
                continue;
            }
            if (this.online && generation === this.loginGeneration)
                publish?.(result);
            return result;
        }
    }
    waitForActionVerification(target, challenge) {
        return new Promise((resolve, reject) => {
            const finish = (error) => {
                clearTimeout(timer);
                this.actionVerifications.delete(verification);
                if (error)
                    reject(error);
                else
                    resolve();
            };
            const verification = new ActionVerification(this, target, challenge, {
                open: (current, options, onUrl) => openBrowserVerification(current, { connection: this.runtime.connection }, options, onUrl),
                complete: () => finish(),
                cancel: reason => finish(new Error(reason)),
            });
            const timer = setTimeout(() => verification.cancel('业务验证超时'), 300_000);
            timer.unref();
            this.actionVerifications.add(verification);
            try {
                this.emit('system.action.verification', { verification });
            }
            catch {
                verification.cancel('业务验证处理器异常');
            }
        });
    }
    resolveShortId(threadId, hint) {
        return this.assembler?.resolveShortId(threadId, hint) || hint || (/^\d+$/.test(threadId) ? threadId : undefined);
    }
    bindFriend(uid, threadId, conversationShortId, metadata = {}) {
        const byUid = this.cachedFriend(uid);
        if (byUid?.threadId === threadId) {
            byUid.updateMetadata(metadata);
            return byUid;
        }
        const byThread = this.cachedFriendByThreadId(threadId);
        if (byThread) {
            byThread.updateMetadata(metadata);
            return byThread;
        }
        return Friend.bind(uid, threadId, conversationShortId, this, metadata);
    }
    bindGroup(groupId, conversationShortId = groupId, metadata = {}) {
        const cached = this.cachedGroup(groupId);
        if (cached) {
            cached.updateMetadata(metadata);
            return cached;
        }
        return Group.bind(groupId, conversationShortId, this, metadata);
    }
    bindStranger(uid, threadId, conversationShortId, metadata = {}) {
        const cached = this.cachedStranger(uid);
        if (cached?.threadId === threadId) {
            cached.updateMetadata(metadata);
            return cached;
        }
        return Stranger.bind(uid, threadId, conversationShortId, this, metadata);
    }
    async markReadTargets(targets) {
        if (targets.length === 0)
            throw new Error('markMessagesRead requires at least one message');
        const batches = groupByInbox(targets);
        const failed = [];
        let statusCode = 0;
        let statusMsg = '';
        let checkCode;
        for (const batch of batches.values()) {
            const result = await this.im.markConversationsRead(batch);
            failed.push(...result.failed);
            if (!statusCode && result.statusCode) {
                statusCode = result.statusCode;
                statusMsg = result.statusMsg;
                checkCode = result.checkCode;
            }
        }
        return {
            statusCode,
            statusMsg,
            ...(checkCode !== undefined ? { checkCode } : {}),
            failed,
        };
    }
    async refreshContactAddresses(addresses) {
        if (addresses.length === 0)
            return { statusCode: 0, statusMsg: '', conversations: [] };
        const generation = this.loginGeneration;
        const conversations = [];
        let statusCode = 0;
        let statusMsg = '';
        let checkCode;
        for (const batch of groupByInbox(addresses).values()) {
            const result = await this.im.getConversationInfos(batch);
            if (!this.online || generation !== this.loginGeneration)
                throw new Error('账号状态已变化，会话资料读取已取消');
            conversations.push(...result.conversations);
            if (!statusCode && result.statusCode) {
                statusCode = result.statusCode;
                statusMsg = result.statusMsg;
                checkCode = result.checkCode;
            }
        }
        if (statusCode === 0) {
            for (const conversation of conversations)
                this.applyConversationInfo(conversation);
        }
        return {
            statusCode,
            statusMsg,
            ...(checkCode !== undefined ? { checkCode } : {}),
            conversations,
        };
    }
    applyConversationInfo(info) {
        this.bindConversationInfo(this.saveConversationSnapshot(info));
    }
    bindConversationInfo(info) {
        this.assembler?.rememberConversation(info.conversationId, info.conversationShortId);
        if (info.isGroup) {
            const group = this.bindGroup(info.conversationId, info.conversationShortId, {
                ...(info.name ? { name: info.name } : {}),
                ...(info.description ? { description: info.description } : {}),
                ...(info.notice ? { notice: info.notice } : {}),
                ...(info.avatar ? { avatar: info.avatar } : {}),
                ...(info.ownerUid ? { ownerUid: info.ownerUid } : {}),
                ...(info.participantsCount !== undefined
                    ? { memberCount: info.participantsCount }
                    : {}),
                ...(info.muted !== undefined ? { muted: info.muted } : {}),
                ...(info.pinned !== undefined ? { pinned: info.pinned } : {}),
                ...(info.favorite !== undefined ? { favorite: info.favorite } : {}),
                ...(info.isParticipant !== undefined
                    ? { isParticipant: info.isParticipant }
                    : {}),
                ...(info.inboxType !== undefined ? { inboxType: info.inboxType } : {}),
                members: info.members,
            });
            this.rememberGroup(group);
            return;
        }
        const selfUid = this.imUid || this.uid || '';
        const peerUid = parsePeerFromConversationId(info.conversationId, selfUid);
        if (!peerUid)
            return;
        const peer = info.members.find((member) => member.uid === peerUid);
        if (info.isInStrangerBox) {
            const stranger = this.bindStranger(peerUid, info.conversationId, info.conversationShortId, peer?.secUid ? { secUid: peer.secUid } : {});
            this.rememberStranger(stranger);
            return;
        }
        if (this.strangers.get(peerUid)?.threadId === info.conversationId)
            this.strangers.delete(peerUid);
        const friend = this.bindFriend(peerUid, info.conversationId, info.conversationShortId, peer?.secUid ? { secUid: peer.secUid } : {});
        this.rememberFriend(friend);
    }
    async getEmojiResources() {
        this.ensureOnline();
        const generation = this.loginGeneration;
        const result = await this.im.getEmojiResources();
        if (!this.online || generation !== this.loginGeneration)
            throw new Error('账号状态已变化，表情资源查询已取消');
        return result;
    }
    collectEmoji(options) {
        this.ensureOnline();
        const generation = this.loginGeneration;
        return this.im.collectEmoji(options).then(result => {
            if (this.online && generation === this.loginGeneration && result.statusCode === 0 && result.successItems[0]) {
                this.collectedEmojiState = addCollectedEmoji(this.collectedEmojiState, result.successItems[0]);
            }
            return result;
        });
    }
    async getCollectedEmojis(options = {}) {
        this.ensureOnline();
        if (options.firstPage !== undefined && typeof options.firstPage !== 'boolean')
            throw new TypeError('firstPage must be a boolean');
        const generation = this.loginGeneration;
        const firstPage = options.firstPage ?? options.cursor === undefined;
        const result = await this.im.getCollectedEmojis(options.cursor);
        if (!this.online || generation !== this.loginGeneration)
            throw new Error('账号状态已变化，收藏表情查询已取消');
        if (result.page) {
            this.collectedEmojiState = mergeCollectedEmojiPage(this.collectedEmojiState, result.page, firstPage);
        }
        return result;
    }
    getCachedCollectedEmojis() {
        return this.collectedEmojiState && structuredClone(this.collectedEmojiState);
    }
    async getActiveStatus(secUids, conversationIds = []) {
        this.ensureOnline();
        const generation = this.loginGeneration;
        const result = await this.im.getActiveStatus(secUids, conversationIds);
        if (!this.online || generation !== this.loginGeneration)
            throw new Error('账号状态已变化，活动状态查询已取消');
        return result;
    }
    async searchUsers(keyword, cursor = 0) {
        this.ensureOnline();
        const generation = this.loginGeneration;
        const result = await this.im.searchUsers(keyword, cursor);
        if (!this.online || generation !== this.loginGeneration)
            throw new Error('账号状态已变化，用户搜索已取消');
        return result;
    }
    async getRecommendedContacts() {
        this.ensureOnline();
        const generation = this.loginGeneration;
        const result = await this.im.getRecommendedContacts();
        if (!this.online || generation !== this.loginGeneration)
            throw new Error('账号状态已变化，推荐联系人查询已取消');
        return result;
    }
    async getNewFollowerCount() {
        this.ensureOnline();
        const generation = this.loginGeneration;
        const result = await this.im.getNewFollowerCount();
        if (!this.online || generation !== this.loginGeneration)
            throw new Error('账号状态已变化，新关注计数查询已取消');
        return result;
    }
    async readFollowerNotices() {
        this.ensureOnline();
        const generation = this.loginGeneration;
        const connection = this.im;
        const notices = [];
        const users = new Set(), cursors = new Set();
        let maxTime = '0', minTime = '1', received = 0;
        for (;;) {
            if (!this.online || generation !== this.loginGeneration)
                throw new Error('账号状态已变化，新关注通知读取已取消；已发请求可能已标记已读');
            const cursor = JSON.stringify([maxTime, minTime]);
            if (cursors.has(cursor))
                return { statusCode: -3, statusMsg: '通知分页游标未推进；已发请求可能已标记已读', notices: [], truncated: false };
            cursors.add(cursor);
            const page = await connection.readFollowerNoticePage(maxTime, minTime);
            if (!this.online || generation !== this.loginGeneration)
                throw new Error('账号状态已变化，新关注通知读取已取消；已发请求可能已标记已读');
            if (page.statusCode !== 0)
                return { statusCode: page.statusCode, statusMsg: page.statusMsg, notices: [], truncated: false };
            received += page.notices.length;
            for (const notice of page.notices) {
                if (!users.has(notice.uid)) {
                    users.add(notice.uid);
                    notices.push(notice);
                }
            }
            if (!page.hasMore || received > 120)
                return { statusCode: 0, statusMsg: page.statusMsg, notices, truncated: page.hasMore };
            if (!page.notices.length || page.maxTime === undefined || page.minTime === undefined) {
                return { statusCode: -3, statusMsg: '通知分页没有有效进展；已发请求可能已标记已读', notices: [], truncated: false };
            }
            maxTime = page.maxTime;
            minTime = page.minTime;
        }
    }
    async getUserSettings() {
        this.ensureOnline();
        const generation = this.loginGeneration;
        const result = await this.im.getUserSettings().catch(error => {
            if (generation === this.loginGeneration)
                this.readReceiptSwitch = undefined;
            throw error;
        });
        if (!this.online || generation !== this.loginGeneration)
            throw new Error('账号状态已变化，设置查询已取消');
        this.readReceiptSwitch = result.statusCode === 0 ? result.imReadStatusShow : undefined;
        return result;
    }
    async getReadReceiptPrivacy() {
        this.ensureOnline();
        const generation = this.loginGeneration;
        const result = await this.im.getReadReceiptPrivacy().catch(error => {
            if (generation === this.loginGeneration)
                this.readReceiptSwitch = undefined;
            throw error;
        });
        if (!this.online || generation !== this.loginGeneration)
            throw new Error('账号状态已变化，已读隐私查询已取消');
        this.readReceiptSwitch = result.statusCode === 0 ? result.currentUserSwitch : undefined;
        return result;
    }
    async getMessageReadPrivacy(queries, refresh = false) {
        this.ensureOnline();
        const generation = this.loginGeneration;
        const epoch = this.readPrivacyEpoch;
        const all = normalizeMessageReadPrivacyQueries(queries);
        if (!all.length)
            return { statusCode: 0, statusMsg: '', messages: [] };
        const selected = new Map();
        const missing = [];
        for (const query of all) {
            const entry = refresh ? undefined : this.readPrivacyCache.get(query.serverMessageId) ??
                this.stateStore?.getMessageReadPrivacy(query.conversationId, query.serverMessageId);
            if (entry && entry.query.conversationId === query.conversationId && entry.query.conversationShortId === query.conversationShortId &&
                entry.query.conversationType === query.conversationType && entry.query.createTime === query.createTime) {
                selected.set(query.serverMessageId, entry);
            }
            else
                missing.push(query);
        }
        const active = () => {
            if (!this.online || generation !== this.loginGeneration || epoch !== this.readPrivacyEpoch)
                throw new Error('账号状态已变化或消息已删除，已读隐私查询已取消');
        };
        if (missing.length) {
            const result = await this.im.getMessageReadPrivacy(missing).catch(error => {
                if (generation === this.loginGeneration)
                    this.readReceiptSwitch = undefined;
                throw error;
            });
            active();
            if (result.statusCode !== 0) {
                this.readReceiptSwitch = undefined;
                return { ...result, messages: [] };
            }
            this.readReceiptSwitch = result.currentUserSwitch;
            if (result.enableReadState !== true || result.currentUserSwitch === undefined)
                return { ...result, messages: [] };
            const rows = [];
            for (const query of missing) {
                const policy = result.messages.find(item => item.serverMessageId === query.serverMessageId);
                if (!policy)
                    return { statusCode: -3, statusMsg: 'Desktop incomplete read privacy response', messages: [] };
                rows.push({ query, policy });
            }
            for (const row of rows)
                selected.set(row.query.serverMessageId, structuredClone(row));
            try {
                this.stateStore?.upsertMessageReadPrivacy(rows);
            }
            catch {
                this.logger.warn('已读隐私策略已获取，但本地状态保存失败');
            }
        }
        else if (this.readReceiptSwitch === undefined) {
            const result = await this.getReadReceiptPrivacy();
            active();
            if (result.statusCode !== 0)
                return { ...result, messages: [] };
        }
        active();
        if (this.readReceiptSwitch === undefined)
            return { statusCode: -3, statusMsg: 'Desktop read switch unavailable', messages: [] };
        for (const [id, entry] of selected)
            this.readPrivacyCache.set(id, structuredClone(entry));
        return { statusCode: 0, statusMsg: '', currentUserSwitch: this.readReceiptSwitch,
            enableReadState: this.readReceiptSwitch !== -1,
            messages: this.readReceiptSwitch === -1 ? [] : all.map(query => structuredClone(selected.get(query.serverMessageId).policy)) };
    }
    getGroupJoinRequestUnread() {
        this.ensureOnline();
        return this.im.getGroupJoinRequestUnread();
    }
    clearGroupJoinRequestUnread() {
        this.ensureOnline();
        return this.im.clearGroupJoinRequestUnread();
    }
    async getGroupJoinRequestData(address) {
        const response = await this.im.listGroupJoinRequests({
            ...(address?.conversationShortId
                ? { conversationShortId: address.conversationShortId }
                : {}),
        });
        if (response.statusCode !== 0)
            return response;
        const profiles = await this.im.resolveUsers(response.requests.flatMap((request) => request.applicantSecUid ? [request.applicantSecUid] : []));
        const bySecUid = new Map(profiles.map((profile) => [profile.secUid, profile]));
        return {
            ...response,
            requests: response.requests.map((request) => {
                const profile = request.applicantSecUid
                    ? bySecUid.get(request.applicantSecUid)
                    : undefined;
                return profile ? {
                    ...request,
                    applicantNickname: profile.nickname,
                    ...(profile.avatarThumb ? { applicantAvatar: profile.avatarThumb } : {}),
                } : request;
            }),
        };
    }
    async seedThreadShortIds(generation) {
        const threads = await this.im.listThreads({ count: 50 });
        this.assertLoginGeneration(generation);
        if (threads.statusCode !== 0) {
            throw new Error(`IM 初始化失败: status=${threads.statusCode} ${threads.statusMsg}`);
        }
        for (const info of threads.conversations)
            this.saveConversationSnapshot(info);
        let count = 0;
        for (const t of threads.threads) {
            if (t.threadId && t.conversationShortId) {
                this.assembler?.rememberConversation(t.threadId, t.conversationShortId);
                count += 1;
            }
        }
        this.logger.debug('loaded %s conversation short ids', count);
    }
    cacheInboundMessage(inbound) {
        const message = {
            msgId: inbound.serverMessageId ?? '',
            threadId: inbound.threadId,
            conversationShortId: inbound.conversationShortId,
            conversationType: inbound.conversationType,
            inboxType: inbound.inboxType ?? 0,
            senderUid: inbound.senderUid,
            ...(inbound.senderSecUid ? { senderSecUid: inbound.senderSecUid } : {}),
            ...(inbound.clientMessageId ? { clientMessageId: inbound.clientMessageId } : {}),
            content: inbound.rawContent,
            msgType: inbound.messageType,
            createTime: inbound.createTime ? Number(inbound.createTime) : 0,
            status: inbound.status ?? 0,
            ...(inbound.version ? { version: inbound.version } : {}),
            ...(inbound.orderInConversation ? { orderInConversation: inbound.orderInConversation } : {}),
            ...(inbound.indexInConversation
                ? { indexInConversation: inbound.indexInConversation }
                : {}),
            ...(inbound.indexInConversationV2
                ? { indexInConversationV2: inbound.indexInConversationV2 }
                : {}),
            ...(inbound.ext ? { ext: inbound.ext } : {}),
            ...(inbound.referenceInfo ? { referenceInfo: inbound.referenceInfo } : {}),
            ...(inbound.propertyList ? { propertyList: inbound.propertyList } : {}),
        };
        const update = this.stateStore
            ? this.stateStore.upsertMessages([message])[0]
            : prepareMessageCacheWrite(message, 'server', new Map());
        const cached = update?.message ?? message;
        const keys = [
            ...(cached.clientMessageId ? [JSON.stringify([cached.threadId, 'client', cached.clientMessageId])] : []),
            ...(cached.msgId && cached.msgId !== '0' ? [JSON.stringify([cached.threadId, 'server', cached.msgId])] : []),
        ];
        if (!keys.length)
            keys.push(JSON.stringify([cached.threadId, cached.senderUid, inbound.createTime ?? inbound.rawContent]));
        const repeated = keys.some(key => this.receivedMessageKeys.has(key));
        for (const key of keys)
            this.receivedMessageKeys.add(key);
        return { message: cached, isNew: !repeated && update?.isNew !== false };
    }
    consumeMessageBatch(messages, generation) {
        const updates = [];
        const deletedClientMessageIds = [];
        const updatedConversationIds = [];
        for (const message of messages) {
            if (!this.online || generation !== this.loginGeneration)
                return;
            if (isOrdinaryMessageType(message.messageType))
                updates.push(this.cacheInboundMessage(message).message);
            else {
                const deletion = messageDeletionCommand(message.messageType, message.rawContent);
                if (deletion) {
                    const clientId = this.applyMessageDeletionCommand(deletion.conversationId, deletion.serverMessageId, message.raw);
                    if (clientId)
                        deletedClientMessageIds.push(clientId);
                }
                else if (this.applyConversationCommand(message.messageType, message.rawContent, message.threadId, message.raw, true)
                    || this.applySettingCommand(message.messageType, message.rawContent, message.raw))
                    updatedConversationIds.push(message.threadId);
            }
        }
        if (this.online && generation === this.loginGeneration)
            this.assembler?.receiveMessageBatch(updates, deletedClientMessageIds, {}, updatedConversationIds);
    }
    get inboxQueries() {
        this.ensureOnline();
        return this.inboxFeature;
    }
    ensureOnline() {
        if (!this.online || !this.sender) {
            throw new Error('账号未上线，请先 await account.login() 并完成登录');
        }
    }
    replaceCache(target, source) {
        target.clear();
        for (const [key, value] of source)
            target.set(key, value);
    }
    ensureQuerySucceeded(operation, statusCode, statusMsg) {
        if (statusCode === 0)
            return;
        throw new Error(`${operation}失败: status=${statusCode}${statusMsg ? ` ${statusMsg}` : ''}`);
    }
    [captureRejectionSymbol](error, event) {
        const normalized = toError(error);
        if (event === 'system.handler.error') {
            this.logger.error(normalized, 'system.handler.error listener failed');
            return;
        }
        this.emit('system.handler.error', { event, error: normalized });
    }
}
//# sourceMappingURL=account.js.map