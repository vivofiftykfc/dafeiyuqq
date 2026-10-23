import type { Group } from './group.js';
import type { GroupMemberData, UserFollowerStatus, UserFollowStatus } from '../../services/im/types.js';
export declare enum MemberRole {
    MEMBER = 0,
    OWNER = 1,
    ADMIN = 2,
    VISITOR = 3
}
export declare class Member {
    readonly uid: string;
    readonly group: Group;
    private _secUid?;
    private _nickname?;
    private _avatar?;
    private _alias?;
    private _role;
    private _sortOrder?;
    private _blocked?;
    private _leftBlockTime?;
    private _ext;
    private constructor();
    static bind(data: GroupMemberData, group: Group): Member;
    get secUid(): string | undefined;
    get followStatus(): UserFollowStatus | undefined;
    get followerStatus(): UserFollowerStatus | undefined;
    getProfile(): Promise<import("../index.js").ImUserProfile>;
    setFollowed(followed?: boolean): Promise<import("../index.js").UserFollowResponse>;
    get nickname(): string | undefined;
    get avatar(): string | undefined;
    get alias(): string | undefined;
    get role(): number;
    get sortOrder(): string | undefined;
    get blocked(): number | undefined;
    get leftBlockTime(): string | undefined;
    get ext(): Readonly<Record<string, string>>;
    get displayName(): string;
    get isOwner(): boolean;
    get isAdmin(): boolean;
    get roleName(): 'member' | 'owner' | 'admin' | 'visitor' | 'unknown';
    refresh(): Promise<this>;
}
//# sourceMappingURL=member.d.ts.map