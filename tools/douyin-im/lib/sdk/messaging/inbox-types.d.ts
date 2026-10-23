import type { ImConversation, PrivateMessage } from '../../services/im/types.js';
export interface FriendInfo {
    uid: string;
    nickname: string;
    avatarThumb?: string;
    secUid?: string;
    remark?: string;
    signature?: string;
    closeFriend?: boolean;
    threadId: string;
    conversationShortId?: string;
    lastMessage?: PrivateMessage;
    unreadCount: number;
    updateTime: number;
}
export interface FriendListResponse {
    statusCode: number;
    statusMsg: string;
    hasMore: boolean;
    userList: FriendInfo[];
    friendUids: string[];
    closeFriendUids?: string[];
    cursor: string;
    total: string;
}
export interface GroupListResponse {
    statusCode: number;
    statusMsg: string;
    groups: ImConversation[];
}
//# sourceMappingURL=inbox-types.d.ts.map