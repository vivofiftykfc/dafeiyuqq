export interface PrivateThread {
    threadId: string;
    conversationShortId?: string;
    conversationType?: number;
    inboxType?: number;
    peer: ThreadPeer;
    lastMessage?: PrivateMessage;
    unreadCount: number;
    updateTime: number;
    [key: string]: unknown;
}
export interface ConversationMember {
    uid: string;
    secUid?: string;
    role: number;
}
export interface ImConversation {
    conversationId: string;
    conversationShortId: string;
    conversationType: number;
    isGroup: boolean;
    name: string;
    description?: string;
    notice?: string;
    avatar?: string;
    ownerUid?: string;
    ownerSecUid?: string;
    ticket?: string;
    isParticipant?: boolean;
    inboxType?: number;
    badgeCount?: number;
    coreVersion?: string;
    coreExt?: Readonly<Record<string, string>>;
    mode?: number;
    isInStrangerBox?: boolean;
    deleted?: boolean;
    strangerVersion?: string;
    participantsCount?: number;
    sortOrder?: string;
    isFolded?: boolean;
    settingExt?: Readonly<Record<string, string>>;
    settingVersion?: string;
    settingExtVersions?: Readonly<Record<string, string>>;
    maxIndex?: string;
    maxOrder?: string;
    muted?: boolean;
    pinned?: boolean;
    favorite?: boolean;
    setTopTime?: string;
    setFavoriteTime?: string;
    readBadgeCount?: number;
    readIndex?: string;
    readIndexV2?: string;
    minIndex?: string;
    minIndexV2?: string;
    lastMessageTime: number;
    lastMessageIndex?: string;
    lastMessage?: PrivateMessage | null;
    hintMessage?: PrivateMessage | null;
    localExt?: Readonly<Record<string, string>>;
    propertyInfo?: ConversationPropertyInfo;
    propertyMessage?: PrivateMessage | null;
    members: GroupMemberData[];
}
export interface ConversationListOptions {
    cursor?: string | number;
    count?: number;
}
export interface ConversationListResponse {
    statusCode: number;
    statusMsg: string;
    conversations: ImConversation[];
}
export interface CreateConversationResponse extends ImActionResponse {
    conversation?: ImConversation;
}
export interface CreateGroupOptions {
    name?: string;
    avatarUrl?: string;
    description?: string;
}
export interface ThreadPeer {
    uid: string;
    secUid?: string;
    nickname: string;
    avatarThumb?: string;
    [key: string]: unknown;
}
export interface MessageReferenceInfo {
    refMessageId: string;
    hint: string;
    refMessageType: number;
    refMessageStatus: number;
    rootMessageId?: string;
    rootMessageConvIndex?: string;
}
export interface MessagePropertyItem {
    uid: string;
    secUid: string;
    createTime: string;
    idempotentId: string;
    value: string;
}
export interface ConversationPropertyInfo {
    clientId: string;
    emoji: string;
    sender: string;
    createdAt: string;
    markRead: boolean;
}
export interface PrivateMessage {
    msgId: string;
    threadId: string;
    conversationShortId?: string;
    conversationType?: number;
    inboxType?: number;
    senderUid: string;
    senderSecUid?: string;
    clientMessageId?: string;
    content: string;
    msgType: number;
    createTime: number;
    status: number;
    version?: string;
    orderInConversation?: string;
    orderIndex?: string;
    indexInConversation?: string;
    indexInConversationV2?: string;
    ext?: Readonly<Record<string, string>>;
    localExt?: Readonly<Record<string, string>>;
    deleted?: boolean;
    referenceInfo?: MessageReferenceInfo;
    propertyList?: Readonly<Record<string, readonly MessagePropertyItem[]>>;
    [key: string]: unknown;
}
export interface ThreadListOptions {
    cursor?: string | number;
    count?: number;
    inboxType?: number;
}
export interface ThreadListResponse {
    statusCode: number;
    statusMsg: string;
    hasMore: boolean;
    threads: PrivateThread[];
    cursor: string;
    conversations: ImConversation[];
    unreadCount?: number;
}
export interface StrangerMessagesResponse extends ImActionResponse {
    messages: PrivateMessage[];
}
export interface RecentStrangerMessagesOptions {
    latestStrangerVersion: string;
    earliestStrangerVersion: string;
    inboxType?: number;
}
export interface RecentStrangerConversation {
    conversationId: string;
    conversationShortId: string;
    version: string;
    badgeCount: number;
    messages: PrivateMessage[];
}
export interface RecentStrangerMessagesResponse extends ImActionResponse {
    nextStrangerVersion: string;
    hasMore: boolean;
    messages: RecentStrangerConversation[];
    logId: string;
}
export interface StrangerSyncCursors {
    version: string;
    loadMoreVersion: string;
}
export interface StrangerUnreadCountResponse extends ImActionResponse {
    unreadCount: string;
}
export interface UserBlockOptions {
    uid: string;
    secUid: string;
    blocked: boolean;
    source?: 0 | 1 | 2;
}
export interface FriendRosterOptions {
    cursor?: string | number;
    count?: number;
}
export interface FriendRosterEntry {
    uid: string;
    nickname: string;
    avatar?: string;
    secUid?: string;
    remark?: string;
    signature?: string;
    appliedAt?: string;
    ext?: Readonly<Record<string, string>>;
}
export interface FriendRosterResponse extends ImActionResponse {
    hasMore: boolean;
    cursor: string;
    total: string;
    userList: FriendRosterEntry[];
    friendUids: string[];
    closeFriendUids?: string[];
}
export interface RecommendedContact {
    name?: string;
    avatar?: string;
    secUid?: string;
    conversationId?: string;
    lastActiveTime?: number;
}
export interface RecommendedContactsResponse extends ImActionResponse {
    contacts: RecommendedContact[];
}
export interface NewFollowerCountResponse extends ImActionResponse {
    count?: number;
}
export interface FollowerNotice {
    uid: string;
    secUid: string;
    nickname: string;
    remark?: string;
    avatar?: string;
    avatarUri?: string;
    createTime?: number;
    hasRead?: boolean | number;
    followStatus?: number;
    followerStatus?: number;
    content?: string;
}
export interface FollowerNoticePage extends ImActionResponse {
    notices: FollowerNotice[];
    hasMore: boolean;
    maxTime?: string;
    minTime?: string;
}
export interface FollowerNoticesResponse extends ImActionResponse {
    notices: FollowerNotice[];
    truncated: boolean;
}
export interface SetUserRemarkOptions {
    uid: string;
    secUid: string;
    remark: string;
}
export interface UserRelationResponse extends ImActionResponse {
    remark?: string;
}
export type UserFollowStatus = 0 | 1 | 2 | 4;
export type UserFollowerStatus = 0 | 1;
export interface SetUserFollowedOptions {
    uid: string;
    secUid: string;
    followed: boolean;
}
export interface UserFollowResponse extends ImActionResponse {
    followStatus?: UserFollowStatus;
}
export interface MessageListOptions {
    threadId: string;
    conversationShortId?: string;
    conversationType?: number;
    inboxType?: number;
    cursor?: string | number;
    count?: number;
    direction?: 'older' | 'newer';
    includeCurrent?: boolean;
}
export interface MessageListResponse {
    statusCode: number;
    statusMsg: string;
    hasMore: boolean;
    messages: PrivateMessage[];
    cursor: string;
    direction: 'older' | 'newer';
}
export interface SendMessageOptions {
    threadId: string;
    content: string;
    msgType?: number;
    conversationShortId: string;
    conversationType?: number;
    inboxType?: number;
    mentionedUsers?: string[];
    reference?: SendMessageReference;
}
export interface SendMessageReference {
    referencedMessageId: string;
    hint: string;
    rootMessageId?: string;
    rootMessageConvIndex?: string;
}
export interface SendMessageResponse {
    statusCode: number;
    statusMsg: string;
    serverMessageId?: string;
    clientMessageId?: string;
    checkCode?: number;
}
export interface RecallMessageOptions {
    threadId: string;
    conversationShortId: string;
    serverMessageId: string;
    conversationType?: number;
    inboxType?: number;
}
export interface RecallMessageResponse {
    statusCode: number;
    statusMsg: string;
    recalled: boolean;
}
export interface ImActionResponse {
    statusCode: number;
    statusMsg: string;
    checkCode?: number;
}
export interface ParticipantActionResponse extends ImActionResponse {
    succeededUids: string[];
    failedUids: string[];
    details?: ParticipantActionDetails;
}
export interface ParticipantActionDetails {
    successParticipants: string[];
    failedParticipants: string[];
    status?: number;
    extraInfo?: string;
    checkCode?: string;
    checkMessage?: string;
    secSuccessParticipants: ParticipantIdentity[];
    secFailedParticipants: ParticipantIdentity[];
}
export interface ParticipantIdentity {
    uid?: string;
    secUid?: string;
}
export interface GroupMemberData {
    uid: string;
    secUid?: string;
    nickname?: string;
    avatar?: string;
    role: number;
    alias?: string;
    sortOrder?: string;
    blocked?: number;
    leftBlockTime?: string;
    ext?: Readonly<Record<string, string>>;
}
export interface GroupMemberListResponse extends ImActionResponse {
    members: GroupMemberData[];
}
export interface ConversationInfoListResponse extends ImActionResponse {
    conversations: ImConversation[];
}
export interface BatchMarkReadResponse extends ImActionResponse {
    failed: MarkConversationReadOptions[];
}
export declare enum GroupJoinRequestStatus {
    PENDING = 1,
    APPROVED = 2,
    REJECTED = 3,
    INVALID = 4
}
export interface GroupJoinRequestData {
    requestId: string;
    applicantUid: string;
    applicantSecUid?: string;
    applicantNickname?: string;
    applicantAvatar?: string;
    groupShortId: string;
    conversationType: number;
    status: GroupJoinRequestStatus;
    reason?: string;
    inviterUid?: string;
    inviterSecUid?: string;
    createdAt?: string;
    modifiedAt?: string;
    moderatorUid?: string;
    ext?: Readonly<Record<string, string>>;
}
export interface GroupJoinRequestListResponse extends ImActionResponse {
    requests: GroupJoinRequestData[];
}
export interface GroupJoinRequestActionResponse extends ImActionResponse {
    request?: GroupJoinRequestData;
}
export interface GroupJoinRequestUnreadResponse extends ImActionResponse {
    unreadCount?: string;
    lastRequest?: GroupJoinRequestData;
}
export type GroupMemberIncreaseSource = 'invite' | 'command' | 'qrcode' | 'duoshan' | 'apply' | 'search' | 'activity' | 'face-to-face' | 'circle';
export type GroupMemberDecreaseSource = 'kick' | 'leave';
export interface ImGroupNoticeUser {
    uid: string;
    secUid?: string;
    nickname?: string;
}
export interface ConversationReadMarker {
    serverMessageId: string;
    indexInConversation?: string;
    indexInConversationV2?: string;
    readBadgeCount?: number;
}
export interface ConversationActionOptions extends ConversationAddressOptions {
}
export interface DeleteConversationOptions extends ConversationAddressOptions {
    lastMessageIndex: string;
}
export interface ConversationAddressOptions {
    threadId: string;
    conversationShortId: string;
    conversationType: 1 | 2;
    inboxType?: number;
}
export interface MarkConversationReadOptions extends ConversationAddressOptions, ConversationReadMarker {
}
export interface DeleteMessageOptions extends ConversationAddressOptions {
    serverMessageId: string;
}
export interface ModifyMessageReactionOptions extends ConversationAddressOptions {
    serverMessageId: string;
    emoji: string;
    enabled: boolean;
    operatorUid: string;
}
export interface EnterConversationOptions extends ConversationAddressOptions {
}
export interface SetConversationSettingsOptions extends ConversationAddressOptions {
    mute?: boolean;
    pinned?: boolean;
}
export interface GroupParticipantActionOptions extends ConversationAddressOptions {
    uids: string[];
}
export interface GroupJoinRequestListOptions {
    conversationShortId?: string;
}
export interface ReviewGroupJoinRequestOptions {
    requestId: string;
    status: GroupJoinRequestStatus.APPROVED | GroupJoinRequestStatus.REJECTED;
}
export type ImNotice = {
    type: 'friend.add-request';
    applicantUid: string;
    fromUid?: string;
    toUid?: string;
    content?: string;
    ext?: Readonly<Record<string, string>>;
    raw: Record<string, unknown>;
} | {
    type: 'friend.increase';
    peerUid: string;
    fromUid?: string;
    toUid?: string;
    content?: string;
    ext?: Readonly<Record<string, string>>;
    raw: Record<string, unknown>;
} | {
    type: 'friend.decrease';
    peerUid: string;
    fromUid?: string;
    toUid?: string;
    content?: string;
    ext?: Readonly<Record<string, string>>;
    raw: Record<string, unknown>;
} | {
    type: 'conversation.read';
    conversationId: string;
    conversationType: number;
    readMessageIndex: string;
    readMessageIndexV2?: string;
    readerUid?: string;
    raw: Record<string, unknown>;
} | {
    type: 'conversation.update';
    conversationId: string;
    conversationType: number;
    raw: Record<string, unknown>;
} | {
    type: 'conversation.min-index';
    conversationId: string;
    conversationType: number;
    minIndex: string;
    raw: Record<string, unknown>;
} | {
    type: 'conversation.members-remove';
    conversationId: string;
    conversationType: number;
    memberUids: readonly string[];
    raw: Record<string, unknown>;
} | {
    type: 'conversation.delete';
    conversationId: string;
    conversationType: number;
    raw: Record<string, unknown>;
} | {
    type: 'message.delete';
    conversationId: string;
    serverMessageId: string;
    raw: Record<string, unknown>;
} | {
    type: 'message.recall';
    conversationId: string;
    conversationType: number;
    serverMessageId?: string;
    clientMessageId?: string;
    createTime?: string;
    raw: Record<string, unknown>;
} | {
    type: 'message.reaction';
    conversationId: string;
    conversationType: number;
    operatorUid: string;
    emoji: string;
    enabled: boolean;
    serverMessageId?: string;
    clientMessageId?: string;
    raw: Record<string, unknown>;
} | {
    type: 'group.join-request';
    conversationId: string;
    conversationShortId: string;
    conversationType: number;
    requestId?: string;
    content: string;
    raw: Record<string, unknown>;
} | {
    type: 'group.member-increase';
    conversationId: string;
    conversationShortId: string;
    conversationType: 2;
    source: GroupMemberIncreaseSource;
    members: ImGroupNoticeUser[];
    operators: ImGroupNoticeUser[];
    raw: Record<string, unknown>;
} | {
    type: 'group.member-decrease';
    conversationId: string;
    conversationShortId: string;
    conversationType: 2;
    source: GroupMemberDecreaseSource;
    members: ImGroupNoticeUser[];
    operators: ImGroupNoticeUser[];
    raw: Record<string, unknown>;
} | {
    type: 'group.admin';
    conversationId: string;
    conversationShortId: string;
    conversationType: 2;
    members: ImGroupNoticeUser[];
    operators: ImGroupNoticeUser[];
    enabled: true;
    raw: Record<string, unknown>;
} | {
    type: 'group.name-change';
    conversationId: string;
    conversationShortId: string;
    conversationType: 2;
    name?: string;
    operators: ImGroupNoticeUser[];
    raw: Record<string, unknown>;
} | {
    type: 'group.avatar-change';
    conversationId: string;
    conversationShortId: string;
    conversationType: 2;
    avatar?: string;
    operators: ImGroupNoticeUser[];
    raw: Record<string, unknown>;
} | {
    type: 'im.command';
    conversationId: string;
    conversationType: number;
    messageType: number;
    content: string;
    raw: Record<string, unknown>;
};
//# sourceMappingURL=types.d.ts.map