import { AccountStore } from './account-store.js';
import type { StoredAccount, ClientFactory, SessionProbeResult } from './types.js';
export type WakeStatus = 'ok' | 'expired' | 'error';
export interface WakeResult {
    status: WakeStatus;
    account: StoredAccount;
    client: ReturnType<ClientFactory>;
    verified: boolean;
    reason: string;
    screenName?: string;
}
export interface WakeOptions {
    skipVerify?: boolean;
    signal?: AbortSignal;
    probeSession?: (client: ReturnType<ClientFactory>, signal?: AbortSignal) => Promise<SessionProbeResult>;
}
export type RestoreOutcome = 'ok' | 'expired' | 'error' | 'missing';
export interface RestoreSessionResult {
    outcome: RestoreOutcome;
    wake?: WakeResult;
}
export declare function tryRestoreSession(store: AccountStore, createClient: ClientFactory, platformUid?: string, options?: WakeOptions): Promise<RestoreSessionResult>;
export declare function wakeAccount(store: AccountStore, createClient: ClientFactory, platformUid: string, options?: WakeOptions): Promise<WakeResult>;
//# sourceMappingURL=wake.d.ts.map