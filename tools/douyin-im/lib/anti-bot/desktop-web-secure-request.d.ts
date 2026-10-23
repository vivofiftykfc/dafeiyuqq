import { DesktopWebSecureEvents } from './desktop-web-secure-events.js';
import { type DesktopWebSecureMatch } from './desktop-web-secure-config.js';
import type { DesktopWebSecureKeys, DesktopWebSecureKeysInfo, DesktopWebSecureScene } from './desktop-web-secure-keys.js';
export interface DesktopWebSecureRequest {
    url?: string;
    headers?: Record<string, unknown> | string;
    extras?: DesktopWebSecureKeysInfo & Record<string, unknown>;
    [key: string]: unknown;
}
export interface DesktopWebSecureRequestContext {
    readonly Date: {
        new (): {
            getTime(): number;
        };
        now(): number;
    };
    readonly pageHref: string;
}
export interface DesktopWebSecureResponse {
    config?: DesktopWebSecureRequest;
    headers?: Record<string, unknown>;
    reqHeaders?: Record<string, unknown>;
    [key: string]: unknown;
}
export interface DesktopWebSecureManualSignData {
    ticket?: unknown;
    ts_sign?: unknown;
    path?: string;
}
export interface DesktopWebSecureManualHeaders {
    bdTicketGuardHeaders: Record<string, unknown>;
    timeCollect: Record<string, unknown>;
    extras: {
        cache: string;
        server_data: string;
        algoType: string | undefined;
        path: string | undefined;
        isPubKeySign: string;
    };
}
export declare class DesktopWebSecureRequestPipeline extends DesktopWebSecureEvents {
    private readonly context;
    private readonly keys;
    private ttl;
    private configuredTtl;
    private readonly signatures;
    constructor(context: DesktopWebSecureRequestContext, keys: DesktopWebSecureKeys | undefined);
    classify(request: DesktopWebSecureRequest, config: Record<string, unknown>, signType?: string, initType?: string): DesktopWebSecureMatch;
    createTicketGuardHeaders({ signData, signType, certType }: {
        signData?: DesktopWebSecureManualSignData | null | undefined;
        signType?: string;
        certType?: DesktopWebSecureScene['certType'];
    }): Promise<DesktopWebSecureManualHeaders>;
    prepare<T extends DesktopWebSecureRequest>(request: T, match: DesktopWebSecureMatch): Promise<T>;
    complete<T extends DesktopWebSecureResponse>(response: T, match: DesktopWebSecureMatch, updateData?: boolean): Promise<T>;
    private processResponseHeaders;
    private signingInput;
    private readSignature;
    private writeSignature;
}
//# sourceMappingURL=desktop-web-secure-request.d.ts.map