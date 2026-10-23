export interface ParticipantCommand {
    conversationId: string;
    conversationType: number;
    inboxType: number;
    added: string[];
    modified: string[];
    removed: string[];
}
export declare function participantCommand(messageType: number, content: string): ParticipantCommand | undefined;
export declare function participantDecimalId(value: string): string;
//# sourceMappingURL=participant-command.d.ts.map