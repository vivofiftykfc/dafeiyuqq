import type { ConversationPropertyInfo, MessagePropertyItem, PrivateMessage } from './types.js';
export declare const LATEST_MESSAGE_PROPERTY_KEY = "a:s_latest_message_property";
export declare function readConversationPropertyInfo(localExt?: Readonly<Record<string, string>>): ConversationPropertyInfo;
export declare function serializeConversationPropertyInfo(info: ConversationPropertyInfo): string;
export declare function latestMessageProperty(message: PrivateMessage, userId: string): ConversationPropertyInfo;
export declare function mapMessageProperties(value: unknown): Readonly<Record<string, readonly MessagePropertyItem[]>> | undefined;
//# sourceMappingURL=message-property.d.ts.map