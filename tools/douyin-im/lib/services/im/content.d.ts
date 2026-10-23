import type { SendMessageReference, SendMessageResponse } from './types.js';
import type { ImageFormat, ImageResource, VideoResource } from './media.js';
export interface TextMention {
    uid: string;
    text: string;
    location: number;
    length: number;
}
export type ParsedMessageContent = {
    kind: 'text';
    text: string;
    aweType: number;
    mentions?: TextMention[];
} | {
    kind: 'image';
    text: string;
    aweType: number;
    image: ImageResource;
} | {
    kind: 'video';
    text: string;
    aweType: number;
    video: VideoResource;
} | {
    kind: 'emoji';
    text: string;
    aweType: number;
    url: string;
} | {
    kind: 'file';
    text: string;
    aweType: number;
    file: import('./cards.js').FileAsset;
    value: Record<string, unknown>;
} | {
    kind: 'link';
    text: string;
    aweType: number;
    link: import('./cards.js').LinkCard;
    value: Record<string, unknown>;
} | {
    kind: 'user';
    text: string;
    aweType: number;
    user: import('./cards.js').UserCard;
    value: Record<string, unknown>;
} | {
    kind: 'audio';
    text: string;
    aweType: number;
    audio: {
        urls: string[];
        uri: string;
    };
    value: Record<string, unknown>;
} | {
    kind: 'share';
    text: string;
    aweType: number;
    share: {
        itemId: string;
        title: string;
        authorUid: string;
        authorSecUid: string;
    };
    value: Record<string, unknown>;
} | {
    kind: 'comment';
    text: string;
    aweType: number;
    comment: {
        workId: string;
        commentId: string;
        authorName: string;
        coverUrl: string;
    };
    value: Record<string, unknown>;
} | {
    kind: 'unknown';
    text: string;
    aweType: number;
    value: Record<string, unknown> | string;
};
export interface ImageAsset {
    oid: string;
    skey: string;
    md5: string;
    dataSize: number;
    width: number;
    height: number;
    format?: Exclude<ImageFormat, 'unknown'>;
}
export interface EmojiContentOptions {
    url: string;
    displayName?: string;
    width?: number;
    height?: number;
    imageType?: string;
    packageId?: number;
}
export interface ReplyMessageOptions {
    text: string;
    referencedMessageId: string;
    referencedMessageType: number;
    referencedUid: string;
    referencedSecUid?: string;
    nickname?: string;
    referencedText?: string;
    rootMessageId?: string;
    rootMessageConvIndex?: string;
}
export interface ReplyPayload {
    content: string;
    reference: SendMessageReference;
}
export declare function buildDesktopTextContent(text: string, mentions?: readonly TextMention[]): string;
export declare function buildImageContent(image: ImageAsset): string;
export declare function buildVideoContent(video: {
    tkey: string;
    skey: string;
    md5: string;
    poster: ImageAsset;
    width: number;
    height: number;
    checkPics?: string[];
}): string;
export declare function buildEmojiContent(options: EmojiContentOptions): string;
export declare function isCollectedStickerEnabled(value: unknown): boolean;
export declare function buildCollectedStickerContent(sticker: Readonly<Record<string, unknown>>): string;
export declare function buildReplyPayload(options: ReplyMessageOptions): ReplyPayload;
export declare function parseMessageContent(content: string, messageType?: number): ParsedMessageContent;
export declare function normalizeDesktopTextMessageContent(content: string, msgType: number): string;
export declare function isMessageDelivered(res: SendMessageResponse): boolean;
export declare function parseCheckMessage(raw: string): {
    statusCode: number;
    tips: string;
};
export declare function parseSendMessageResponse(decoded: Record<string, unknown>, clientMsgId: string): SendMessageResponse;
//# sourceMappingURL=content.d.ts.map