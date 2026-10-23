import { ChatContact } from './chat-contact.js';
import type { UserFollowerStatus, UserFollowStatus } from '../../services/im/types.js';
export interface StrangerMetadata {
    inboxType?: number;
    nickname?: string;
    avatar?: string;
    secUid?: string;
    blocked?: boolean;
    remark?: string;
}
export declare class Stranger extends ChatContact {
    readonly uid: string;
    private _nickname?;
    private _avatar?;
    private _secUid?;
    private _blocked?;
    private _remark?;
    protected get logTarget(): string;
    private constructor();
    get nickname(): string | undefined;
    get avatar(): string | undefined;
    get secUid(): string | undefined;
    get blocked(): boolean | undefined;
    get remark(): string | undefined;
    get followStatus(): UserFollowStatus | undefined;
    get followerStatus(): UserFollowerStatus | undefined;
    getProfile(): Promise<import("../index.js").ImUserProfile>;
    setFollowed(followed?: boolean): Promise<import("../index.js").UserFollowResponse>;
    getInboxMessages(resetUnreadCount?: boolean): Promise<import("../index.js").StrangerMessagesResponse>;
    markRead(): Promise<import("../index.js").ImActionResponse>;
    setBlocked(blocked?: boolean): Promise<import("../index.js").ImActionResponse>;
    setRemark(remark: string): Promise<import("../../services/im/types.js").UserRelationResponse>;
}
//# sourceMappingURL=stranger.d.ts.map