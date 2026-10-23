import type { ImageAsset } from '../../services/im/content.js';
import { type ImageFormat } from '../../services/im/media.js';
export type ImageSource = Uint8Array | string;
export type ImageInput = ImageSource | ImageAsset;
export interface ResolvedImageSource {
    data: Uint8Array;
    format: Exclude<ImageFormat, 'unknown'>;
}
export declare function isImageAsset(value: ImageInput): value is ImageAsset;
//# sourceMappingURL=media-source.d.ts.map