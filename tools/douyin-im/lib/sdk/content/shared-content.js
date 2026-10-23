import { resolveSharedWorkAccess } from '../../services/im/shared-content.js';
export class SharedWork {
    fetchDetails;
    account;
    id;
    title;
    authorUid;
    authorSecUid;
    detail;
    constructor(id, metadata, fetchDetails, account) {
        this.fetchDetails = fetchDetails;
        this.id = id;
        this.title = metadata.title ?? '';
        this.authorUid = metadata.authorUid ?? '';
        this.authorSecUid = metadata.authorSecUid ?? '';
        this.account = account;
    }
    static bind(id, metadata, fetchDetails, account) {
        return new SharedWork(id, metadata, fetchDetails, account);
    }
    async getDetail(refresh = false) {
        if (!this.id)
            throw new Error('SharedWork: no work id');
        if (!refresh && this.detail)
            return this.detail;
        const details = await this.fetchDetails([this.id]);
        const detail = details.find((item) => item.workId === this.id);
        if (!detail)
            throw new Error(`SharedWork: work ${this.id} was omitted by the server`);
        this.detail = detail;
        return detail;
    }
    async getAccess(refresh = false) {
        return resolveSharedWorkAccess(await this.getDetail(refresh));
    }
}
export class SharedComment {
    fetchStatuses;
    account;
    id;
    text;
    authorName;
    coverUrl;
    status;
    constructor(id, metadata, fetchStatuses, account) {
        this.fetchStatuses = fetchStatuses;
        this.id = id;
        this.text = metadata.text ?? '';
        this.authorName = metadata.authorName ?? '';
        this.coverUrl = metadata.coverUrl ?? '';
        this.account = account;
    }
    static bind(id, metadata, fetchStatuses, account) {
        return new SharedComment(id, metadata, fetchStatuses, account);
    }
    async getStatus(refresh = false) {
        if (!this.id)
            throw new Error('SharedComment: no comment id');
        if (!refresh && this.status)
            return this.status;
        const statuses = await this.fetchStatuses([this.id]);
        const status = statuses.find((item) => item.commentId === this.id);
        if (!status)
            throw new Error(`SharedComment: comment ${this.id} was omitted by the server`);
        this.status = status;
        return status;
    }
}
//# sourceMappingURL=shared-content.js.map