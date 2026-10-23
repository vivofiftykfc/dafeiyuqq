export declare class ActionChallengeError extends Error {
    #private;
    readonly source: 'passport-decision' | 'bdturing';
    readonly name = "ActionChallengeError";
    constructor(source: 'passport-decision' | 'bdturing', raw: string);
    get raw(): string;
}
//# sourceMappingURL=action-challenge.d.ts.map