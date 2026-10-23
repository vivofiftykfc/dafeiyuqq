import type { EmojiContentOptions, ReplyMessageOptions } from '../../services/im/content.js';
import type { CardMessage, FileAsset, LinkCard, UserCard, WorkCard } from '../../services/im/cards.js';
import type { ImageInput } from './media-source.js';
import type { TextMention } from '../../services/im/content.js';
export type { ImageInput, ImageSource } from './media-source.js';
export { isImageAsset } from './media-source.js';
export interface TextMessageSegment {
    type: 'text';
    text: string;
}
export interface AtMessageSegment {
    type: 'at';
    uid: string;
    name: string;
}
export type SendableText = string | TextMessageSegment | AtMessageSegment;
export type RichMessage = CardMessage | {
    type: 'file-upload';
    data: Uint8Array;
    name: string;
} | {
    type: 'image';
    data: ImageInput;
} | {
    type: 'video';
    data: Uint8Array;
    cover: Uint8Array;
    width?: number;
    height?: number;
} | ({
    type: 'emoji';
} & EmojiContentOptions) | {
    type: 'sticker';
    sticker: Readonly<Record<string, unknown>>;
} | ({
    type: 'reply';
} & ReplyMessageOptions);
export type SendableMessage = SendableText | readonly SendableText[] | RichMessage;
export interface PreparedTextMessage {
    text: string;
    mentions: TextMention[];
}
export declare function isTextMessage(message: SendableMessage): message is SendableText | readonly SendableText[];
export declare function prepareTextMessage(message: SendableText | readonly SendableText[]): PreparedTextMessage;
export declare function messageBrief(message: SendableMessage): string;
export declare const segment: {
    text(text: string): TextMessageSegment;
    at(target: string | {
        uid: string;
        displayName?: string | undefined;
        nickname?: string | undefined;
    }, name?: string): AtMessageSegment;
    share(work: WorkCard): SendableMessage;
    photos(work: WorkCard): SendableMessage;
    link(link: LinkCard): SendableMessage;
    user(user: UserCard): SendableMessage;
    file(file: FileAsset | Uint8Array, name?: string): SendableMessage;
    image(data: ImageInput): SendableMessage;
    video(data: Uint8Array, cover: Uint8Array, options?: {
        width?: number;
        height?: number;
    }): SendableMessage;
    emoji(options: EmojiContentOptions): SendableMessage;
    sticker(sticker: Readonly<Record<string, unknown>>): SendableMessage;
    reply(options: ReplyMessageOptions): SendableMessage;
};
//# sourceMappingURL=message.d.ts.map