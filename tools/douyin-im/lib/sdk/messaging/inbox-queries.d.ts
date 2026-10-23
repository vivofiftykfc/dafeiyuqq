import type { ImService } from '../../services/im/service.js';
import type { ImStateStore } from '../../services/im/state-store.js';
import type { FriendListResponse, GroupListResponse } from './inbox-types.js';
export declare class ImInboxQueries {
    private readonly im;
    private readonly myUid;
    private readonly stateStore?;
    constructor(im: ImService, myUid?: string, stateStore?: ImStateStore | undefined);
    friendList(options?: {
        cursor?: string | number;
        count?: number;
    }): Promise<FriendListResponse>;
    groupList(force?: boolean): Promise<GroupListResponse>;
}
//# sourceMappingURL=inbox-queries.d.ts.map