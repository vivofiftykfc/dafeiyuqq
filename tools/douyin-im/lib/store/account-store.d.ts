import type { AccountMeta, PendingAccount, StoredAccount, StoredDeviceProfile, StoredSession } from './types.js';
export interface AccountStoreOptions {
    dataDir?: string;
}
export declare class AccountStore {
    private readonly accountsDir;
    private readonly pendingDir;
    constructor(options?: AccountStoreOptions);
    accountDataDir(platformUid: string): string;
    listUids(): string[];
    resolvePlatformUid(preferred?: string): string | undefined;
    private findByField;
    load(platformUid: string): StoredAccount | undefined;
    save(account: StoredAccount): void;
    updateSession(platformUid: string, session: StoredSession): void;
    createPending(pending: PendingAccount): void;
    loadPending(id: string): PendingAccount | undefined;
    promote(pendingId: string, platformUid: string, session: StoredSession, meta?: Partial<AccountMeta> & {
        passportUidTt?: string;
    }): StoredAccount;
    removePending(id: string): void;
    toClientConfig(account: StoredAccount): Record<string, unknown>;
    listAccounts(): Array<{
        platformUid: string;
        screenName: string | undefined;
        updatedAt: string;
        path: string;
    }>;
    static resolveCanonicalUserId(userData?: Record<string, unknown>): string;
    static buildSession(cookies: string, guard?: StoredSession['desktopTicketGuard']): StoredSession;
    static buildDeviceProfile(userAgent: string, bizTraceId: string, extras?: Partial<StoredDeviceProfile>): StoredDeviceProfile;
    ensureDeviceId(account: StoredAccount): string;
    ensureDeviceProfile(account: StoredAccount): StoredDeviceProfile;
}
//# sourceMappingURL=account-store.d.ts.map