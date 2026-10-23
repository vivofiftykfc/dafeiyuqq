import { EventEmitter } from 'events';
import type { BaseAccount } from './account.js';
export interface BaseClientAccountOptions {
    accountId?: string;
}
export interface AccountContext {
    readonly requestedAccountId?: string;
    readonly resolvedAccountId?: string;
    readonly anonymous: boolean;
}
export declare abstract class BaseClient<A extends BaseAccount, O extends BaseClientAccountOptions> extends EventEmitter {
    private readonly registeredAccounts;
    private readonly accountAliases;
    private anonymousAccount?;
    private loginTask?;
    private logoutTask?;
    private lifecycleGeneration;
    protected constructor();
    get accounts(): readonly A[];
    loadAccounts(): readonly A[];
    createAccount(options?: O): A;
    pickAccount(accountId?: string): A;
    removeAccount(accountId: string): Promise<boolean>;
    login(): Promise<void>;
    logout(): Promise<void>;
    protected abstract instantiateAccount(options: O, context: AccountContext): A;
    protected accountRegistrationKey(options: O): string | undefined;
    protected listStoredAccountIds(): readonly string[];
    protected resolveStoredAccountId(accountId: string): string | undefined;
    protected normalizeAccountOptions(options: O, context: AccountContext): O;
    protected onAccountAdded(account: A): void;
    protected onAccountRemoved(account: A): void;
    protected promoteAccountIdentity(account: A): void;
    protected rememberAccountAlias(account: A, alias: string): void;
    private findAccount;
    private refreshAccountAliases;
    private loginAfter;
    private loginAll;
    private logoutAll;
    private clearLifecycleTask;
    private ensureLifecycleGeneration;
}
//# sourceMappingURL=client.d.ts.map