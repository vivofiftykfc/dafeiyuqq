import type { GroupJoinRequestActionResponse, GroupJoinRequestData } from '../../services/im/types.js';
import { GroupJoinRequestStatus } from '../../services/im/types.js';
import { GroupJoinRequestEvent } from '../events/request.js';
import type { Group } from './group.js';
export declare class GroupJoinRequest extends GroupJoinRequestEvent<GroupJoinRequestActionResponse> {
    readonly requestId: string;
    readonly group: Group;
    private data;
    private constructor();
    static bind(data: GroupJoinRequestData, group: Group): GroupJoinRequest;
    get applicantUid(): string;
    get applicantSecUid(): string | undefined;
    get applicantNickname(): string | undefined;
    get applicantAvatar(): string | undefined;
    get displayName(): string;
    get status(): GroupJoinRequestStatus;
    get reason(): string | undefined;
    get inviterUid(): string | undefined;
    get createdAt(): string | undefined;
    get ext(): Readonly<Record<string, string>>;
    get isPending(): boolean;
    protected executeDecision(approve: boolean): Promise<GroupJoinRequestActionResponse>;
}
//# sourceMappingURL=group-join-request.d.ts.map