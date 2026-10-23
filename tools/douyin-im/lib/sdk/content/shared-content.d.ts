import type { SharedCommentStatus, SharedWorkAccess, SharedWorkDetail } from '../../services/im/shared-content.js';
import type { Account } from '../account.js';
export declare class SharedWork {
    private readonly fetchDetails;
    readonly account: Account;
    readonly id: string;
    readonly title: string;
    readonly authorUid: string;
    readonly authorSecUid: string;
    private detail?;
    private constructor();
    getDetail(refresh?: boolean): Promise<SharedWorkDetail>;
    getAccess(refresh?: boolean): Promise<SharedWorkAccess>;
}
export declare class SharedComment {
    private readonly fetchStatuses;
    readonly account: Account;
    readonly id: string;
    readonly text: string;
    readonly authorName: string;
    readonly coverUrl: string;
    private status?;
    private constructor();
    getStatus(refresh?: boolean): Promise<SharedCommentStatus>;
}
//# sourceMappingURL=shared-content.d.ts.map