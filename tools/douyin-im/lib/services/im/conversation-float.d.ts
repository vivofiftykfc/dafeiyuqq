import type { MessageFloatHintConfig } from '../../desktop/settings.js';
import type { PrivateMessage } from './types.js';
export declare function isDesktopFloatMessage(message: PrivateMessage, userId: string, config?: MessageFloatHintConfig): boolean;
export interface ConversationOrder {
    lastMessageTime: number;
    sortOrder: string;
}
export declare const DESKTOP_PIN_OFFSET = 500000000000000;
export declare function desktopCellSortTime(value?: string): bigint;
export declare function calculateDesktopSortOrder(state: ConversationOrder, timestamp: number, pinned: boolean, cellSortTime: bigint): boolean;
//# sourceMappingURL=conversation-float.d.ts.map