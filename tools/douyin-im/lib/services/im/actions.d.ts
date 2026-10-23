import type { ImProtoTransport } from './transport.js';
import type { BatchMarkReadResponse, ConversationActionOptions, ConversationInfoListResponse, CreateGroupOptions, CreateConversationResponse, DeleteMessageOptions, DeleteConversationOptions, GroupParticipantActionOptions, GroupJoinRequestActionResponse, GroupJoinRequestListOptions, GroupJoinRequestListResponse, GroupJoinRequestUnreadResponse, GroupMemberListResponse, ImActionResponse, MarkConversationReadOptions, ModifyMessageReactionOptions, ParticipantActionResponse, EnterConversationOptions, SetConversationSettingsOptions, ReviewGroupJoinRequestOptions } from './types.js';
export declare class ImConversationActions {
    private readonly transport;
    private readonly deviceId;
    private readonly resolveSelfUid;
    constructor(transport: ImProtoTransport, deviceId: string, resolveSelfUid?: () => string);
    createConversation(participantUids: string[], conversationType: 1 | 2, options?: CreateGroupOptions): Promise<CreateConversationResponse>;
    markRead(options: MarkConversationReadOptions): Promise<ImActionResponse>;
    markReadBatch(options: MarkConversationReadOptions[]): Promise<BatchMarkReadResponse>;
    getConversationInfos(options: ConversationActionOptions[]): Promise<ConversationInfoListResponse>;
    deleteMessage(options: DeleteMessageOptions): Promise<ImActionResponse>;
    deleteConversation(options: DeleteConversationOptions): Promise<ImActionResponse>;
    enterConversation(options: EnterConversationOptions): Promise<ImActionResponse>;
    modifyReaction(options: ModifyMessageReactionOptions): Promise<ImActionResponse>;
    setSettings(options: SetConversationSettingsOptions): Promise<ImActionResponse>;
    removeParticipants(options: GroupParticipantActionOptions): Promise<ImActionResponse>;
    leave(options: ConversationActionOptions): Promise<ImActionResponse>;
    listParticipants(options: ConversationActionOptions): Promise<GroupMemberListResponse>;
    listJoinRequests(options?: GroupJoinRequestListOptions): Promise<GroupJoinRequestListResponse>;
    getJoinRequestUnread(): Promise<GroupJoinRequestUnreadResponse>;
    clearJoinRequestUnread(): Promise<ImActionResponse>;
    reviewJoinRequest(options: ReviewGroupJoinRequestOptions): Promise<GroupJoinRequestActionResponse>;
    inviteParticipants(options: GroupParticipantActionOptions): Promise<ParticipantActionResponse>;
    private send;
    private address;
    private validateParticipantUids;
    private cookieOptions;
}
//# sourceMappingURL=actions.d.ts.map