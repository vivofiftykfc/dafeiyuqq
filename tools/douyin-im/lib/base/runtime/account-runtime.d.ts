import type { ApiConnection } from '../../desktop/api-connection.js';
import type { AccountStore } from '../../store/account-store.js';
import type { StoredAccount } from '../../store/types.js';
export interface BoundAccountProtocol {
    readonly client: ApiConnection;
    readonly account: StoredAccount;
    readonly platformUid: string;
    readonly deviceId: string;
}
export declare class AccountRuntime {
    private readonly store;
    private apiConnection;
    private readonly onDeviceUpdate?;
    private stored?;
    private bindingGeneration;
    constructor(store: AccountStore, apiConnection: ApiConnection, onDeviceUpdate?: (() => void) | undefined);
    get connection(): ApiConnection;
    get platformUid(): string | undefined;
    get bound(): BoundAccountProtocol;
    bindRestored(client: ApiConnection, account: StoredAccount): void;
    bindPromoted(client: ApiConnection, account: StoredAccount): void;
    suspend(): void;
    clear(): void;
}
//# sourceMappingURL=account-runtime.d.ts.map