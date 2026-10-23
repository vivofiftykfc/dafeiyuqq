import { ChatContact } from './chat-contact.js';
import type { UserFollowerStatus, UserFollowStatus } from '../../services/im/types.js';
export declare class Friend extends ChatContact {
    readonly uid: string;
    private _nickname?;
    private _avatar?;
    private _secUid?;
    private _blocked?;
    private _remark?;
    private _signature?;
    private _closeFriend?;
    private conversationTask?;
    protected get logTarget(): string;
    private constructor();
    get nickname(): string | undefined;
    get avatar(): string | undefined;
    get secUid(): string | undefined;
    get blocked(): boolean | undefined;
    get remark(): string | undefined;
    get signature(): string | undefined;
    get closeFriend(): boolean | undefined;
    get followStatus(): UserFollowStatus | undefined;
    get followerStatus(): UserFollowerStatus | undefined;
    getProfile(): Promise<import("../index.js").ImUserProfile>;
    setFollowed(followed?: boolean): Promise<import("../index.js").UserFollowResponse>;
    setBlocked(blocked?: boolean): Promise<import("../index.js").ImActionResponse>;
    setRemark(remark: string): Promise<import("../../services/im/types.js").UserRelationResponse>;
    protected prepareAddress(): Promise<Readonly<import("../../index.js").ConversationAddress>>;
}
export interface FriendMetadata {
    nickname?: string;
    avatar?: string;
    secUid?: string;
    blocked?: boolean;
    remark?: string;
    signature?: string;
    closeFriend?: boolean;
}
//# sourceMappingURL=friend.d.ts.map