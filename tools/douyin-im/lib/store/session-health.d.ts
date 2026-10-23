import type { StoredAccount } from './types.js';
export interface LocalSessionHealth {
    remainingSec?: number;
    expired: boolean;
}
export declare function parseSidGuardTtl(cookies: string): number | undefined;
export declare function checkSessionHealth(account: StoredAccount): LocalSessionHealth;
//# sourceMappingURL=session-health.d.ts.map