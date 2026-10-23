import { BaseEvent } from '../../base/event.js';
import type { ImActionResponse } from '../../services/im/types.js';
import type { Account } from '../account.js';
import type { Group } from '../contacts/group.js';
import type { GroupJoinRequest } from '../contacts/group-join-request.js';
export declare abstract class RequestEvent<Response extends ImActionResponse = ImActionResponse> extends BaseEvent<Account> {
    readonly postType: "request";
    abstract readonly type: string;
    abstract readonly isPending: boolean;
    private decision?;
    protected constructor(account: Account, raw?: Readonly<Record<string, unknown>>, time?: number | string);
    approve(): Promise<Response>;
    reject(): Promise<Response>;
    protected abstract executeDecision(approve: boolean): Promise<Response>;
    private decide;
}
export declare abstract class GroupRequestEvent<Response extends ImActionResponse = ImActionResponse> extends RequestEvent<Response> {
    abstract readonly group: Group;
}
export declare abstract class GroupJoinRequestEvent<Response extends ImActionResponse = ImActionResponse> extends GroupRequestEvent<Response> {
    readonly type: "group.join";
    abstract readonly requestId: string;
    abstract readonly applicantUid: string;
}
export type AnyRequestEvent = GroupJoinRequest;
//# sourceMappingURL=request.d.ts.map