export declare const DESKTOP_PASSPORT_APP_KEY = "3c452fb664e3de0e936108429a0bc697";
export declare function passportNoonUtcTs(now?: Date): string;
export declare function buildPassportAidSign(input: {
    aid: string;
    path: string;
    ts: string;
    appKey?: string;
}): string;
export interface PassportSignQsInput {
    query: Record<string, string>;
    body?: Record<string, string>;
    appKey?: string;
}
export interface PassportSignQsOutput {
    sign: string;
    qs: string;
}
export declare function buildPassportSignQs(input: PassportSignQsInput): PassportSignQsOutput;
export declare function parseFormBodyForSign(body: string): Record<string, string>;
//# sourceMappingURL=signQs.d.ts.map