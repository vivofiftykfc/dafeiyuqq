import { ImInboxApi } from './inbox.js';
import { ImSendApi } from './send.js';
import { ImProtoTransport } from './transport.js';
import { ImMediaUploader } from './upload.js';
import { randomUUID } from 'crypto';
import { desktopFingerprintParams, } from './desktop.js';
import { ImUserDirectory } from './user-directory.js';
import { ImConversationActions } from './actions.js';
import { ImReadStateApi } from './read-state.js';
import { ImStrangerApi } from './stranger.js';
import { ImFriendApi } from './friends.js';
import { ImEmojiApi } from './emoji.js';
import { ImUserSettingsApi } from './user-settings.js';
import { ImSharedContent, } from './shared-content.js';
export { buildEmojiContent, buildCollectedStickerContent, buildImageContent, buildReplyPayload, buildVideoContent, buildDesktopTextContent, isMessageDelivered, normalizeDesktopTextMessageContent, parseMessageContent, } from './content.js';
export { decodeWire, decodeWireTree } from './wire.js';
export { decryptCencSample, decryptImage, pickImageUrl, sniffImageFormat } from './media.js';
export { canonicalUploadQuery, crc32Hex, signVodRequest } from './upload.js';
import { parseJsonResponse } from '../../http/response.js';
export class ImService {
    client;
    transport;
    inboxApi;
    sendApi;
    uploader;
    userDirectory;
    conversationActions;
    readStateApi;
    strangerApi;
    friendApi;
    emojiApi;
    sharedContent;
    configuredPlatformUid;
    configuredDeviceId;
    userSettingsApi;
    configuredGuid;
    configuredScreenSize;
    constructor(client, serviceOpts = {}) {
        this.client = client;
        this.configuredPlatformUid = serviceOpts.platformUid ?? '';
        this.configuredDeviceId = serviceOpts.deviceId ?? '';
        this.configuredGuid = serviceOpts.guid ?? client.getGuid?.() ?? randomUUID().replaceAll('-', '');
        this.configuredScreenSize = serviceOpts.screenSize ?? client.getScreenSize?.() ?? {
            width: 1728,
            height: 1117,
        };
        this.transport = new ImProtoTransport(client);
        this.inboxApi = new ImInboxApi(this.transport, this.configuredPlatformUid, this.configuredDeviceId);
        this.sendApi = new ImSendApi(this.transport, serviceOpts.deviceId ?? serviceOpts.platformUid ?? '');
        this.uploader = new ImMediaUploader(client, () => this.resolveUserId(), globalThis.fetch, () => this.resolveDesktopDeviceId(), this.configuredGuid, this.configuredScreenSize);
        this.userDirectory = new ImUserDirectory(client, this.configuredDeviceId);
        this.userSettingsApi = new ImUserSettingsApi(client, this.configuredDeviceId);
        this.readStateApi = new ImReadStateApi(this.transport, this.configuredDeviceId);
        this.conversationActions = new ImConversationActions(this.transport, serviceOpts.deviceId ?? serviceOpts.platformUid ?? '', () => this.configuredPlatformUid);
        this.strangerApi = new ImStrangerApi(this.transport, this.configuredDeviceId);
        this.friendApi = new ImFriendApi(client, this.configuredDeviceId, this.configuredGuid, this.configuredScreenSize);
        this.emojiApi = new ImEmojiApi(client, this.configuredDeviceId, this.configuredGuid, this.configuredScreenSize);
        this.sharedContent = new ImSharedContent(client, () => this.resolveDesktopDeviceId(), this.configuredGuid, this.configuredScreenSize);
    }
    get myUid() {
        return this.configuredPlatformUid;
    }
    listThreads(options) {
        return this.inboxApi.listThreads(options);
    }
    listConversations(options) {
        return this.inboxApi.listConversations(options);
    }
    resolveUsers(secUids) {
        return this.userDirectory.resolve(secUids);
    }
    getUserProfile(secUid) {
        return this.userDirectory.getProfile(secUid);
    }
    searchUsers(keyword, cursor = 0) {
        return this.userDirectory.searchUsers(keyword, cursor);
    }
    getActiveStatus(secUids, conversationIds = []) {
        return this.userDirectory.getActiveStatus(secUids, conversationIds);
    }
    getUserSettings() {
        return this.userSettingsApi.getSettings();
    }
    getEmojiResources() {
        return this.emojiApi.getResources();
    }
    collectEmoji(options) {
        return this.emojiApi.collect(options);
    }
    getCollectedEmojis(cursor = '0') {
        return this.emojiApi.getCollected(cursor);
    }
    getReadReceiptPrivacy() {
        return this.userSettingsApi.getReadReceiptPrivacy();
    }
    getMessageReadPrivacy(queries) {
        return this.userSettingsApi.getMessageReadPrivacy(queries);
    }
    getStrangerMessages(conversationShortId, resetUnreadCount = false) {
        return this.strangerApi.getMessages(conversationShortId, resetUnreadCount);
    }
    getRecentStrangerMessages(options) {
        return this.strangerApi.getRecentMessages(options);
    }
    deleteStrangerMessage(conversationShortId, serverMessageId) {
        return this.strangerApi.deleteMessage(conversationShortId, serverMessageId);
    }
    deleteAllStrangerConversations() {
        return this.strangerApi.deleteAllConversations();
    }
    markStrangerConversationRead(conversationShortId) {
        return this.strangerApi.markRead(conversationShortId);
    }
    markAllStrangerConversationsRead() {
        return this.strangerApi.markAllRead();
    }
    getStrangerUnreadCount(resetUnreadCount = false) {
        return this.strangerApi.getUnreadCount(resetUnreadCount);
    }
    setUserBlocked(options) {
        return this.userDirectory.setBlocked(options);
    }
    listFriends(options) {
        return this.friendApi.list(options);
    }
    getRecommendedContacts() {
        return this.friendApi.getRecommendedContacts();
    }
    getNewFollowerCount() {
        return this.friendApi.getNewFollowerCount();
    }
    readFollowerNoticePage(maxTime = '0', minTime = '1') {
        return this.friendApi.readFollowerNoticePage(maxTime, minTime);
    }
    setUserRemark(options) {
        return this.friendApi.setRemark(options);
    }
    setUserFollowed(options) {
        return this.friendApi.setFollowed(options);
    }
    getMessages(options) {
        return this.inboxApi.getMessages(options);
    }
    send(options) {
        return this.sendApi.send(options);
    }
    recall(options) {
        return this.sendApi.recall(options);
    }
    createGroupConversation(participantUids, options = {}) {
        return this.conversationActions.createConversation(participantUids, 2, options);
    }
    createPrivateConversation(participantUids) {
        return this.conversationActions.createConversation(participantUids, 1);
    }
    markConversationRead(options) {
        return this.conversationActions.markRead(options);
    }
    getConversationReadState(options) {
        return this.readStateApi.getState(options);
    }
    getConversationReadIndexes(options) {
        return this.readStateApi.getReadIndexes(options);
    }
    getConversationMinIndexes(options) {
        return this.readStateApi.getMinIndexes(options);
    }
    getBatchConversationReadIndexes(options) {
        return this.readStateApi.getBatchReadIndexes(options);
    }
    markConversationsRead(options) {
        return this.conversationActions.markReadBatch(options);
    }
    getConversationInfos(options) {
        return this.conversationActions.getConversationInfos(options);
    }
    deleteMessage(options) {
        return this.conversationActions.deleteMessage(options);
    }
    deleteConversation(options) {
        return this.conversationActions.deleteConversation(options);
    }
    enterConversation(options) {
        return this.conversationActions.enterConversation(options);
    }
    modifyMessageReaction(options) {
        return this.conversationActions.modifyReaction(options);
    }
    setConversationSettings(options) {
        return this.conversationActions.setSettings(options);
    }
    inviteConversationParticipants(options) {
        return this.conversationActions.inviteParticipants(options);
    }
    listConversationParticipants(options) {
        return this.conversationActions.listParticipants(options);
    }
    listGroupJoinRequests(options) {
        return this.conversationActions.listJoinRequests(options);
    }
    getGroupJoinRequestUnread() {
        return this.conversationActions.getJoinRequestUnread();
    }
    clearGroupJoinRequestUnread() {
        return this.conversationActions.clearJoinRequestUnread();
    }
    reviewGroupJoinRequest(options) {
        return this.conversationActions.reviewJoinRequest(options);
    }
    removeConversationParticipants(options) {
        return this.conversationActions.removeParticipants(options);
    }
    leaveConversation(options) {
        return this.conversationActions.leave(options);
    }
    getSharedWorkDetails(conversationShortId, workIds) {
        return this.sharedContent.getWorkDetails(conversationShortId, workIds);
    }
    getSharedCommentStatuses(conversationShortId, commentIds) {
        return this.sharedContent.getCommentStatuses(conversationShortId, commentIds);
    }
    uploadImage(data) {
        return this.uploader.uploadImage(data);
    }
    uploadFile(data, name) {
        return this.uploader.uploadFile(data, name);
    }
    uploadVideo(data) {
        return this.uploader.uploadVideo(data);
    }
    async resolveVideoUrl(tkey) {
        if (!tkey.trim())
            throw new Error('video tkey is required');
        const deviceId = await this.resolveDesktopDeviceId();
        const params = desktopFingerprintParams(deviceId, this.configuredGuid, this.configuredScreenSize, this.client.getUserAgent());
        params.set('iid', this.client.getInstallId?.() ?? '0');
        const url = `https://imdesktop.douyin.com/maya/story/batch_play_info/v1/?${params}`;
        const response = await this.client.requestRaw(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': this.client.getUserAgent(),
                Referer: 'https://imdesktop.douyin.com',
            },
            body: JSON.stringify({ req_infos: [{ tos_key: tkey, type: 2 }], with_caption: true }),
        });
        const json = parseJsonResponse(response, url);
        const encrypted = json.data?.play_infos?.[0]?.encrypted_url;
        if (!response.ok || !encrypted?.main_url) {
            throw new Error(`video play URL unavailable (HTTP ${response.status})`);
        }
        return {
            mainUrl: encrypted.main_url,
            backupUrl: encrypted.backup_url ?? '',
            expireTime: encrypted.expire_time ?? 0,
        };
    }
    async resolveUserId() {
        if (this.configuredPlatformUid)
            return this.configuredPlatformUid;
        throw new Error('Desktop IM requires platformUid');
    }
    async resolveDesktopDeviceId() {
        const current = this.client.getDeviceId?.();
        if (current !== undefined)
            return current;
        if (this.configuredDeviceId)
            return this.configuredDeviceId;
        throw new Error('Desktop IM requires deviceId');
    }
}
//# sourceMappingURL=service.js.map