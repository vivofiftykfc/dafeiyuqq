import type { PrivateMessage } from './types.js';
export type MessageCacheSource = 'server' | 'send-ack' | 'local-update';
export interface MessageCacheUpdate {
    message: PrivateMessage;
    isNew: boolean;
}
export declare function isOrdinaryMessageType(type: number): boolean;
export declare function normalizeClientId(id: string): string;
export declare function messageClientId(message: PrivateMessage): string;
export declare function prepareMessageCacheWrite(incoming: PrivateMessage, source: MessageCacheSource, current: ReadonlyMap<string, PrivateMessage>): (MessageCacheUpdate & {
    key: string;
    removeKeys: string[];
}) | undefined;
//# sourceMappingURL=message-cache.d.ts.map