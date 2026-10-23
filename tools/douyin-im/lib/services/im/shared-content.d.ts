import { type DesktopScreenSize } from './desktop.js';
import type { ImHttpClient } from './service.js';
export interface SharedWorkDetail {
    readonly workId: string;
    readonly filtered: boolean;
    readonly detail?: Record<string, unknown>;
    readonly reason?: unknown;
}
export interface SharedCommentStatus {
    readonly commentId: string;
    readonly isShown?: boolean;
    readonly raw: Record<string, unknown>;
}
export interface SharedWorkMediaSource {
    readonly kind: 'video' | 'image';
    readonly url: string;
    readonly urls: readonly string[];
}
export interface SharedWorkAccess {
    readonly workId: string;
    readonly canShare: boolean;
    readonly canDownload: boolean;
    readonly media: readonly SharedWorkMediaSource[];
}
export declare function resolveSharedWorkAccess(work: SharedWorkDetail): SharedWorkAccess;
export declare class ImSharedContent {
    private readonly client;
    private readonly resolveDeviceId;
    private readonly guid;
    private readonly screenSize;
    constructor(client: ImHttpClient, resolveDeviceId: () => Promise<string>, guid?: string, screenSize?: DesktopScreenSize);
    getWorkDetails(conversationShortId: string, workIds: readonly string[]): Promise<SharedWorkDetail[]>;
    getCommentStatuses(conversationShortId: string, commentIds: readonly string[]): Promise<SharedCommentStatus[]>;
    private assertConversationShortId;
    private post;
}
//# sourceMappingURL=shared-content.d.ts.map