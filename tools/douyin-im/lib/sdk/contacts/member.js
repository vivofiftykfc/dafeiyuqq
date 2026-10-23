export var MemberRole;
(function (MemberRole) {
    MemberRole[MemberRole["MEMBER"] = 0] = "MEMBER";
    MemberRole[MemberRole["OWNER"] = 1] = "OWNER";
    MemberRole[MemberRole["ADMIN"] = 2] = "ADMIN";
    MemberRole[MemberRole["VISITOR"] = 3] = "VISITOR";
})(MemberRole || (MemberRole = {}));
export class Member {
    uid;
    group;
    _secUid;
    _nickname;
    _avatar;
    _alias;
    _role;
    _sortOrder;
    _blocked;
    _leftBlockTime;
    _ext = {};
    constructor(data, group) {
        this.uid = data.uid;
        this.group = group;
        this._role = data.role;
        this.update(data);
    }
    static bind(data, group) {
        return new Member(data, group);
    }
    get secUid() {
        return this._secUid;
    }
    get followStatus() { return this.group.account.getUserRelation(this.uid)?.followStatus; }
    get followerStatus() { return this.group.account.getUserRelation(this.uid)?.followerStatus; }
    async getProfile() {
        const profile = await this.group.account.readUserProfile(this.uid, this.secUid);
        this.update({ uid: this.uid, role: this.role, nickname: profile.nickname,
            ...(profile.avatarThumb ? { avatar: profile.avatarThumb } : {}) });
        return profile;
    }
    async setFollowed(followed = true) {
        if (!this.secUid)
            throw new Error('群成员缺少 secUid，先刷新群成员资料');
        const options = { uid: this.uid, secUid: this.secUid, followed };
        return this.group.account.runVerifiedAction({ operation: followed ? 'follow' : 'unfollow', uid: this.uid }, () => this.group.account.im.setUserFollowed(options), result => {
            if (result.statusCode === 0 && result.followStatus !== undefined) {
                this.group.account.updateUserRelation(this.uid, { followStatus: result.followStatus,
                    ...([1, 2].includes(result.followStatus) ? { blocked: false } : {}) });
            }
        });
    }
    get nickname() {
        return this._nickname;
    }
    get avatar() {
        return this._avatar;
    }
    get alias() {
        return this._alias;
    }
    get role() {
        return this._role;
    }
    get sortOrder() {
        return this._sortOrder;
    }
    get blocked() {
        return this._blocked;
    }
    get leftBlockTime() {
        return this._leftBlockTime;
    }
    get ext() {
        return this._ext;
    }
    get displayName() {
        return this._alias || this._nickname || this.uid;
    }
    get isOwner() {
        return this._role === MemberRole.OWNER;
    }
    get isAdmin() {
        return this._role === MemberRole.ADMIN;
    }
    get roleName() {
        switch (this._role) {
            case MemberRole.MEMBER: return 'member';
            case MemberRole.OWNER: return 'owner';
            case MemberRole.ADMIN: return 'admin';
            case MemberRole.VISITOR: return 'visitor';
            default: return 'unknown';
        }
    }
    async refresh() {
        const members = await this.group.getMemberList(true);
        if (!members.has(this.uid))
            throw new Error(`群成员不存在: ${this.uid}`);
        return this;
    }
    update(data) {
        this._role = data.role;
        if (data.secUid !== undefined)
            this._secUid = data.secUid;
        if (data.nickname !== undefined)
            this._nickname = data.nickname;
        if (data.avatar !== undefined)
            this._avatar = data.avatar;
        if (data.alias !== undefined)
            this._alias = data.alias;
        if (data.sortOrder !== undefined)
            this._sortOrder = data.sortOrder;
        if (data.blocked !== undefined)
            this._blocked = data.blocked;
        if (data.leftBlockTime !== undefined)
            this._leftBlockTime = data.leftBlockTime;
        if (data.ext !== undefined)
            this._ext = { ...data.ext };
    }
}
//# sourceMappingURL=member.js.map