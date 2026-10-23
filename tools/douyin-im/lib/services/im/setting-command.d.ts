import type { ImConversation } from './types.js';
export interface SettingExtEntry {
    key: string;
    value: string;
    version: string;
    op: number;
}
export interface SettingCommand {
    conversationId: string;
    version: string;
    entries: SettingExtEntry[];
}
export type SettingExtState = Pick<ImConversation, 'settingExt' | 'settingExtVersions'>;
export declare function settingCommand(messageType: number, content: string): SettingCommand | undefined;
export declare function conversationIsFolded(ext: ImConversation['settingExt']): boolean;
export declare function applySettingExt(current: SettingExtState, entries: readonly SettingExtEntry[]): {
    state: SettingExtState;
    handled: boolean;
    changed: boolean;
};
//# sourceMappingURL=setting-command.d.ts.map