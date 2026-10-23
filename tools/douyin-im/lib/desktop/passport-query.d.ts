import { type DesktopABogusOptions, type BdmsPreset } from '../anti-bot/aBogus.js';
export interface SignedPassportQuery {
    query: Record<string, string>;
    search: string;
}
export declare function randomBizTraceId(): string;
export interface SignPassportExtras {
    appKey?: string;
    msToken?: string;
    aBogus?: string;
    userAgent?: string;
    enableABogus?: boolean;
    bodyWire?: string;
    screenFingerprint?: string;
    bdmsPreset?: BdmsPreset;
    aBogusVariant?: 'jumpbyte-desktop';
    desktopBdmsState?: Omit<DesktopABogusOptions, 'query' | 'body' | 'userAgent'>;
}
export declare function signPassportQuery(baseQuery: Record<string, string>, body?: Record<string, string>, extras?: SignPassportExtras): SignedPassportQuery;
export declare function resumePassportQuery(signedQuery: Readonly<Record<string, string>>, fp?: string, extras?: SignPassportExtras): SignedPassportQuery;
export declare function encodeFormBody(body: Record<string, string>): string;
//# sourceMappingURL=passport-query.d.ts.map