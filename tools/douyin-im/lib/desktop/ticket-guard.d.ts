import type { DesktopApplicationSettings } from './settings.js';
import { type TicketGuardSessionConfig } from './ticket-guard-config.js';
export interface DesktopTicketGuardState {
    version: 1;
    privateKey: string;
    clientCert?: string;
    serverCert?: string;
    serverSn?: string;
    binding?: {
        sessionHash: string;
        tsSignRee: string;
    };
    sessionConfig?: TicketGuardSessionConfig;
}
export interface TicketGuardRequest {
    readonly headers: Readonly<Record<string, string>>;
    readonly useTicketErrorCode?: 4;
}
export declare class DesktopTicketGuard {
    #private;
    constructor(state?: DesktopTicketGuardState, settings?: DesktopApplicationSettings);
    exportState(): DesktopTicketGuardState;
    hasBinding(sessionId: string): boolean;
    private matchesCachedSession;
    needsCertificate(): boolean;
    requiresTicket(url: URL): boolean;
    private eligible;
    acceptCertificateResponse(response: unknown): void;
    prepare(url: URL, sessionId: string, sessionSS?: string, timestamp?: number, symmetric?: boolean): TicketGuardRequest;
    acceptResponse(request: TicketGuardRequest, headers: Headers, newSessionId: string): boolean;
    private updateCertificates;
    private deriveHmacKey;
}
export declare function ticketSignContent(ticket: string, path: string, timestamp: number): string;
export declare function desktopCertificateRequest(deviceId: string, installId: string): {
    url: string;
    init: RequestInit;
};
//# sourceMappingURL=ticket-guard.d.ts.map