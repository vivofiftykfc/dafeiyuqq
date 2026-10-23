import type { ImConversation, PrivateMessage } from './types.js';
import type { MessageFloatHintConfig } from '../../desktop/settings.js';
export interface ConversationSummaryRecord {
    lastMessageIndex: string;
    lastClientId: string;
    hintClientId: string;
    lastMessageTime?: number;
    sortOrder?: string;
    maxIndex?: string;
    maxOrder?: string;
    localExt?: Readonly<Record<string, string>>;
}
interface SummaryStorage {
    conversation(id: string): ImConversation | undefined;
    load(id: string): ConversationSummaryRecord | undefined;
    save(id: string, summary: ConversationSummaryRecord): void;
    commitLocalExt(id: string, localExt: Readonly<Record<string, string>>): void;
    messages(id: string): readonly PrivateMessage[];
}
export declare function isDesktopHintMessage(message: PrivateMessage, config?: MessageFloatHintConfig): boolean;
export declare class ConversationSummaryCache {
    private readonly storage;
    private readonly userId;
    private readonly cache;
    private readonly floatHintConfig;
    constructor(storage: SummaryStorage, floatHintConfig?: MessageFloatHintConfig, userId?: string);
    private get;
    prepare(id: string): void;
    forget(id: string): void;
    saveMerged(id: string): void;
    markPropertyRead(id: string): boolean;
    project(conversation: ImConversation): ImConversation;
    query(conversation: ImConversation): ImConversation;
    saved(message: PrivateMessage): void;
    removed(id: string, clientId: string): boolean;
    private updateProperty;
    private recalculate;
}
export {};
//# sourceMappingURL=conversation-summary.d.ts.map