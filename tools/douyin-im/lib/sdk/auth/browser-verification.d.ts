import type { ApiConnection } from '../../desktop/api-connection.js';
import type { QrMfaChallenge } from '../../desktop/types.js';
export interface BrowserLoginVerificationContext {
    connection: ApiConnection;
    qrMfa?: {
        challenge: QrMfaChallenge;
        resumeFields: Readonly<Record<string, unknown>>;
    };
}
//# sourceMappingURL=browser-verification.d.ts.map