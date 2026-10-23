import { type DesktopScreenSize } from './desktop.js';
import type { ImHttpClient } from './service.js';
import type { ImActionResponse } from './types.js';
export interface EmojiResourcesResponse extends ImActionResponse {
    androidResource?: {
        url: string;
        md5: string;
    };
    androidResourceStatus?: number;
}
export interface CollectEmojiOptions {
    imageId?: string;
    stickerUri?: string;
    stickerUrl?: string;
    resourceId?: string;
    stickerType: number;
}
export interface CollectEmojiResponse extends ImActionResponse {
    successItems: Record<string, unknown>[];
}
export type CollectedStickerEnabledStatus = number | string | boolean | null;
export interface CollectedEmojiPage {
    nextCursor: string;
    hasMore: boolean;
    stickerEnabledStatus?: CollectedStickerEnabledStatus;
    stickers?: Record<string, unknown>[];
}
export interface CollectedEmojisResponse extends ImActionResponse {
    page?: CollectedEmojiPage;
}
export interface CollectedEmojiListOptions {
    cursor?: string;
    firstPage?: boolean;
}
export interface CollectedEmojiSnapshot {
    stickers: Record<string, unknown>[];
    nextCursor: string;
    hasMore: boolean;
    stickerEnabledStatus?: CollectedStickerEnabledStatus;
}
export declare class ImEmojiApi {
    private readonly client;
    private readonly deviceId;
    private readonly guid;
    private readonly screenSize;
    constructor(client: ImHttpClient, deviceId?: string, guid?: string, screenSize?: DesktopScreenSize);
    getResources(): Promise<EmojiResourcesResponse>;
    collect(options: CollectEmojiOptions): Promise<CollectEmojiResponse>;
    getCollected(cursor?: string): Promise<CollectedEmojisResponse>;
    private request;
}
export declare function mergeCollectedEmojiPage(current: CollectedEmojiSnapshot | undefined, page: CollectedEmojiPage, firstPage: boolean): CollectedEmojiSnapshot;
export declare function addCollectedEmoji(current: CollectedEmojiSnapshot | undefined, item: Record<string, unknown>): CollectedEmojiSnapshot | undefined;
//# sourceMappingURL=emoji.d.ts.map