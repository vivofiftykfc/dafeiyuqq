import { ChatContact } from './chat-contact.js';
export class Friend extends ChatContact {
    uid;
    _nickname;
    _avatar;
    _secUid;
    _blocked;
    _remark;
    _signature;
    _closeFriend;
    conversationTask;
    get logTarget() {
        return `[Private: ${this.remark || this.nickname || '未知用户'}(${this.uid})]`;
    }
    constructor(uid, threadId, conversationShortId, account, metadata) {
        super(uid, { threadId, conversationShortId, conversationType: 1, inboxType: 0 }, account);
        this.uid = uid;
        this.updateMetadata(metadata);
    }
    static bind(uid, threadId, conversationShortId, account, metadata = {}) {
        return new Friend(uid, threadId, conversationShortId, account, metadata);
    }
    get nickname() { return this._nickname; }
    get avatar() { return this._avatar; }
    get secUid() { return this._secUid; }
    get blocked() { return this.account.getUserRelation(this.uid)?.blocked ?? this._blocked; }
    get remark() { return this.account.getUserRelation(this.uid)?.remark ?? this._remark; }
    get signature() { return this._signature; }
    get closeFriend() { return this._closeFriend; }
    get followStatus() { return this.account.getUserRelation(this.uid)?.followStatus; }
    get followerStatus() { return this.account.getUserRelation(this.uid)?.followerStatus; }
    async getProfile() {
        const profile = await this.account.readUserProfile(this.uid, this.secUid);
        this.updateMetadata({ nickname: profile.nickname, ...(profile.avatarThumb ? { avatar: profile.avatarThumb } : {}) });
        return profile;
    }
    async setFollowed(followed = true) {
        if (!this.secUid)
            throw new Error('好友缺少 secUid，先刷新好友资料');
        const options = { uid: this.uid, secUid: this.secUid, followed };
        return this.account.runVerifiedAction({ operation: followed ? 'follow' : 'unfollow', uid: this.uid }, () => this.account.im.setUserFollowed(options), result => {
            if (result.statusCode === 0 && result.followStatus !== undefined) {
                this.account.updateUserRelation(this.uid, { followStatus: result.followStatus,
                    ...([1, 2].includes(result.followStatus) ? { blocked: false } : {}) });
            }
        });
    }
    updateMetadata(metadata) {
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
        if (metadata.signature !== undefined)
            this._signature = metadata.signature;
        if (metadata.closeFriend !== undefined)
            this._closeFriend = metadata.closeFriend;
    }
    async setBlocked(blocked = true) {
        if (!this.secUid)
            throw new Error('好友缺少 secUid，先刷新好友资料');
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
            throw new Error('好友缺少 secUid，先刷新好友资料');
        const im = this.account.im;
        const result = await im.setUserRemark({ uid: this.uid, secUid: this.secUid, remark });
        if (this.account.online && this.account.im === im && result.statusCode === 0 && result.remark !== undefined) {
            this.account.updateUserRelation(this.uid, { remark: result.remark });
        }
        return result;
    }
    bindConversation(threadId, conversationShortId) {
        this.updateAddress({ threadId, conversationShortId, conversationType: 1, inboxType: 0 });
    }
    async prepareAddress() {
        if (!this.conversationShortId) {
            this.conversationTask ??= this.account.ensureFriendConversation(this);
            try {
                await this.conversationTask;
            }
            finally {
                delete this.conversationTask;
            }
        }
        return this.resolveAddress();
    }
}
//# sourceMappingURL=friend.js.map