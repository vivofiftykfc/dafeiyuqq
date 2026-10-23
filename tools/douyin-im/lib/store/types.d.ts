import type { DesktopTicketGuardState } from '../desktop/ticket-guard.js';
export interface StoredAccount {
    platformUid: string;
    passportUidTt?: string;
    session: StoredSession;
    deviceProfile: StoredDeviceProfile;
    meta: AccountMeta;
}
export interface StoredSession {
    desktopTicketGuard?: DesktopTicketGuardState;
    cookies: string;
    verifiedAt?: string;
}
export interface StoredDeviceProfile {
    userAgent: string;
    deviceId?: string;
    installId?: string;
    guid?: string;
    screenWidth?: number;
    screenHeight?: number;
    screenFingerprint?: string;
    bizTraceId: string;
}
export interface AccountMeta {
    screenName?: string;
    avatarUrl?: string;
    createdAt: string;
    updatedAt: string;
}
export interface PendingAccount {
    desktopTicketGuard?: DesktopTicketGuardState;
    id: string;
    loginMethod: 'qr' | 'sms' | 'password';
    startedAt: string;
    deviceProfile: StoredDeviceProfile;
    cookies?: string;
}
export interface HttpClient {
    enableTicketGuard?(persist: (state: DesktopTicketGuardState) => void): void;
    startTicketGuard?(): void;
    getTicketGuardState?(): DesktopTicketGuardState | undefined;
    requestRaw(url: string, init: RequestInit): Promise<{
        ok: boolean;
        status: number;
        headers: Headers;
        data: string;
        rawText: string;
    }>;
    getCookies(): string;
    getUserAgent(): string;
    probeSession(signal?: AbortSignal): Promise<SessionProbeResult>;
    initializeDevice?(): Promise<{
        deviceId: string;
        installId: string;
    }>;
    startDeviceLifecycle?(): Promise<{
        deviceId: string;
        installId: string;
    }>;
    setDeviceUpdateHandler?(handler: (device: {
        deviceId: string;
        installId: string;
    }) => void): void;
    invalidateAuthenticationResponses?(): void;
}
export interface SessionProbeResult {
    status: 'alive' | 'expired' | 'error';
    uid?: string;
    screenName?: string;
    reason: string;
}
export type ClientFactory = (config: Record<string, unknown>) => HttpClient;
//# sourceMappingURL=types.d.ts.map