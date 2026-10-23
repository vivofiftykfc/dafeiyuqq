import { type DesktopScreenSize } from './desktop.js';
import type { ImHttpClient } from './service.js';
import type { FriendRosterOptions, FriendRosterResponse, RecommendedContactsResponse, NewFollowerCountResponse, FollowerNoticePage, SetUserRemarkOptions, SetUserFollowedOptions, UserFollowResponse, UserRelationResponse } from './types.js';
export declare class ImFriendApi {
    private readonly client;
    private readonly deviceId;
    private readonly guid;
    private readonly screenSize;
    constructor(client: ImHttpClient, deviceId?: string, guid?: string, screenSize?: DesktopScreenSize);
    getRecommendedContacts(): Promise<RecommendedContactsResponse>;
    readFollowerNoticePage(maxTime?: string, minTime?: string): Promise<FollowerNoticePage>;
    getNewFollowerCount(): Promise<NewFollowerCountResponse>;
    list(options?: FriendRosterOptions): Promise<FriendRosterResponse>;
    setFollowed(options: SetUserFollowedOptions): Promise<UserFollowResponse>;
    setRemark(options: SetUserRemarkOptions): Promise<UserRelationResponse>;
    private commonParams;
}
//# sourceMappingURL=friends.d.ts.map