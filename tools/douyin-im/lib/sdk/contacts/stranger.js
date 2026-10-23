import { ChatContact } from './chat-contact.js';
export class Stranger extends ChatContact {
    uid;
    _nickname;
    _avatar;
    _secUid;
    _blocked;
    _remark;
    get logTarget() {
        return `[Stranger: ${this.remark || this.nickname || '未知用户'}(${this.uid})]`;
    }
    constructor(uid, threadId, conversationShortId, account, metadata) {
        super(uid, { threadId, conversationShortId, conversationType: 1, inboxType: metadata.inboxType ?? 1 }, account);
        this.uid = uid;
        this.updateMetadata(metadata);
    }
    static bind(uid, threadId, conversationShortId, account, metadata = {}) {
        return new Stranger(uid, threadId, conversationShortId, account, metadata);
    }
    get nickname() { return this._nickname; }
    get avatar() { return this._avatar; }
    get secUid() { return this._secUid; }
    get blocked() { return this.account.getUserRelation(this.uid)?.blocked ?? this._blocked; }
    get remark() { return this.account.getUserRelation(this.uid)?.remark ?? this._remark; }
    get followStatus() { return this.account.getUserRelation(this.uid)?.followStatus; }
    get followerStatus() { return this.account.getUserRelation(this.uid)?.followerStatus; }
    async getProfile() {
        const profile = await this.account.readUserProfile(this.uid, this.secUid);
        this.updateMetadata({ nickname: profile.nickname, ...(profile.avatarThumb ? { avatar: profile.avatarThumb } : {}) });
        return profile;
    }
    async setFollowed(followed = true) {
        if (!this.secUid)
            throw new Error('陌生人缺少 secUid，先刷新陌生人资料');
        const options = { uid: this.uid, secUid: this.secUid, followed };
        return this.account.runVerifiedAction({ operation: followed ? 'follow' : 'unfollow', uid: this.uid }, () => this.account.im.setUserFollowed(options), result => {
            if (result.statusCode === 0 && result.followStatus !== undefined) {
                this.account.updateUserRelation(this.uid, { followStatus: result.followStatus,
                    ...([1, 2].includes(result.followStatus) ? { blocked: false } : {}) });
            }
        });
    }
    updateMetadata(metadata) {
        if (metadata.inboxType !== undefined)
            this.updateAddress({ ...this.address, inboxType: metadata.inboxType });
        if (metadata.nickname !== undefined)
            this._nickname = metadata.nickname;
        if (metadata.avatar !== undefined)
            this._avatar = metadata.avatar;
        if (metadata.secUid !== undefined)
            this._secUid = metadata.secUid;
        if (metadata.blocked !== undefined)
            this._blocked = metadata.blocked;
        if (metadata.remark !== undefined)
            this._remark = metadata.remark;
    }
    getInboxMessages(resetUnreadCount = false) {
        return this.account.im.getStrangerMessages(this.resolveAddress().conversationShortId, resetUnreadCount);
    }
    markRead() {
        return this.account.im.markStrangerConversationRead(this.resolveAddress().conversationShortId);
    }
    async setBlocked(blocked = true) {
        if (!this.secUid)
            throw new Error('陌生人缺少 secUid，先刷新陌生人资料');
        const im = this.account.im;
        const result = await im.setUserBlocked({
            uid: this.uid,
            secUid: this.secUid,
            blocked,
        });
        if (this.account.online && this.account.im === im) {
            void this.getProfile().catch(() => undefined);
        }
        return result;
    }
    async setRemark(remark) {
        if (!this.secUid)
            throw new Error('陌生人缺少 secUid，先刷新陌生人资料');
        const im = this.account.im;
        const result = await im.setUserRemark({ uid: this.uid, secUid: this.secUid, remark });
        if (this.account.online && this.account.im === im && result.statusCode === 0 && result.remark !== undefined) {
            this.account.updateUserRelation(this.uid, { remark: result.remark });
        }
        return result;
    }
}
//# sourceMappingURL=stranger.js.map