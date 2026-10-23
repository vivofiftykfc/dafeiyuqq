import { GroupJoinRequestStatus } from '../../services/im/types.js';
import { GroupJoinRequestEvent } from '../events/request.js';
export class GroupJoinRequest extends GroupJoinRequestEvent {
    requestId;
    group;
    data;
    constructor(data, group) {
        super(group.account, data, data.createdAt);
        this.requestId = data.requestId;
        this.group = group;
        this.data = { ...data };
    }
    static bind(data, group) {
        return new GroupJoinRequest(data, group);
    }
    get applicantUid() {
        return this.data.applicantUid;
    }
    get applicantSecUid() {
        return this.data.applicantSecUid;
    }
    get applicantNickname() {
        return this.data.applicantNickname;
    }
    get applicantAvatar() {
        return this.data.applicantAvatar;
    }
    get displayName() {
        return this.data.applicantNickname || this.data.applicantUid;
    }
    get status() {
        return this.data.status;
    }
    get reason() {
        return this.data.reason;
    }
    get inviterUid() {
        return this.data.inviterUid;
    }
    get createdAt() {
        return this.data.createdAt;
    }
    get ext() {
        return this.data.ext ?? {};
    }
    get isPending() {
        return this.data.status === GroupJoinRequestStatus.PENDING;
    }
    update(data) {
        if (data.requestId !== this.requestId)
            throw new Error('cannot change join request id');
        this.data = { ...this.data, ...data };
    }
    executeDecision(approve) {
        const status = approve ? GroupJoinRequestStatus.APPROVED : GroupJoinRequestStatus.REJECTED;
        return this.group.reviewJoinRequest(this, status);
    }
}
//# sourceMappingURL=group-join-request.js.map