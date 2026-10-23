import { EventEmitter } from 'events';
export class BaseClient extends EventEmitter {
    registeredAccounts = new Set();
    accountAliases = new Map();
    anonymousAccount;
    loginTask;
    logoutTask;
    lifecycleGeneration = 0;
    constructor() {
        super({ captureRejections: true });
    }
    get accounts() {
        return [...this.registeredAccounts];
    }
    loadAccounts() {
        for (const accountId of this.listStoredAccountIds()) {
            if (!this.findAccount(accountId))
                this.createAccount({ accountId });
        }
        return this.accounts;
    }
    createAccount(options) {
        const input = options ?? {};
        const requestedAccountId = this.accountRegistrationKey(input);
        const resolvedAccountId = requestedAccountId
            ? this.resolveStoredAccountId(requestedAccountId)
            : undefined;
        const lookupId = resolvedAccountId ?? requestedAccountId;
        if (lookupId) {
            const existing = this.findAccount(lookupId);
            if (existing) {
                if (requestedAccountId)
                    this.rememberAccountAlias(existing, requestedAccountId);
                return existing;
            }
        }
        else if (this.anonymousAccount) {
            return this.anonymousAccount;
        }
        const context = {
            ...(requestedAccountId ? { requestedAccountId } : {}),
            ...(resolvedAccountId ? { resolvedAccountId } : {}),
            anonymous: !requestedAccountId,
        };
        const normalized = this.normalizeAccountOptions(input, context);
        const account = this.instantiateAccount(normalized, context);
        this.registeredAccounts.add(account);
        if (requestedAccountId)
            this.rememberAccountAlias(account, requestedAccountId);
        if (resolvedAccountId)
            this.rememberAccountAlias(account, resolvedAccountId);
        if (!requestedAccountId)
            this.anonymousAccount = account;
        this.refreshAccountAliases(account);
        this.onAccountAdded(account);
        return account;
    }
    pickAccount(accountId) {
        if (accountId) {
            const account = this.findAccount(accountId);
            if (account)
                return account;
            throw new Error(`账号不存在或尚未注册: ${accountId}`);
        }
        if (this.registeredAccounts.size === 1)
            return this.accounts[0];
        if (this.registeredAccounts.size === 0)
            throw new Error('没有已注册账号');
        throw new Error('存在多个账号，请向 pickAccount(accountId) 传入账号 ID');
    }
    async removeAccount(accountId) {
        const account = this.findAccount(accountId);
        if (!account)
            return false;
        await account.logout();
        this.registeredAccounts.delete(account);
        for (const [alias, candidate] of this.accountAliases) {
            if (candidate === account)
                this.accountAliases.delete(alias);
        }
        if (this.anonymousAccount === account)
            delete this.anonymousAccount;
        this.onAccountRemoved(account);
        return true;
    }
    login() {
        if (this.loginTask)
            return this.loginTask;
        const task = this.logoutTask
            ? this.loginAfter(this.logoutTask)
            : this.loginAll(++this.lifecycleGeneration);
        this.loginTask = task;
        void task.then(() => this.clearLifecycleTask('login', task), () => this.clearLifecycleTask('login', task));
        return task;
    }
    logout() {
        if (this.logoutTask)
            return this.logoutTask;
        this.lifecycleGeneration += 1;
        delete this.loginTask;
        const task = this.logoutAll();
        this.logoutTask = task;
        void task.then(() => this.clearLifecycleTask('logout', task), () => this.clearLifecycleTask('logout', task));
        return task;
    }
    accountRegistrationKey(options) {
        return options.accountId;
    }
    listStoredAccountIds() {
        return [];
    }
    resolveStoredAccountId(accountId) {
        void accountId;
        return undefined;
    }
    normalizeAccountOptions(options, context) {
        void context;
        return options;
    }
    onAccountAdded(account) {
        void account;
    }
    onAccountRemoved(account) {
        void account;
    }
    promoteAccountIdentity(account) {
        this.refreshAccountAliases(account);
        if (this.anonymousAccount === account)
            delete this.anonymousAccount;
    }
    rememberAccountAlias(account, alias) {
        if (alias)
            this.accountAliases.set(alias, account);
    }
    findAccount(accountId) {
        const direct = this.accountAliases.get(accountId);
        if (direct)
            return direct;
        const resolved = this.resolveStoredAccountId(accountId);
        if (resolved) {
            const stored = this.accountAliases.get(resolved);
            if (stored) {
                this.accountAliases.set(accountId, stored);
                return stored;
            }
        }
        for (const account of this.registeredAccounts) {
            if (account.uid === accountId || account.imUid === accountId) {
                this.accountAliases.set(accountId, account);
                return account;
            }
        }
        return undefined;
    }
    refreshAccountAliases(account) {
        if (account.uid)
            this.accountAliases.set(account.uid, account);
        if (account.imUid)
            this.accountAliases.set(account.imUid, account);
    }
    async loginAfter(logoutTask) {
        await logoutTask;
        await this.loginAll(++this.lifecycleGeneration);
    }
    async loginAll(generation) {
        if (this.registeredAccounts.size === 0)
            this.createAccount();
        const failures = [];
        for (const account of this.registeredAccounts) {
            this.ensureLifecycleGeneration(generation);
            if (account.online)
                continue;
            try {
                await account.login();
            }
            catch (error) {
                this.ensureLifecycleGeneration(generation);
                failures.push(error);
            }
            this.ensureLifecycleGeneration(generation);
        }
        if (failures.length > 0) {
            throw new AggregateError(failures, `${failures.length} 个账号登录失败`);
        }
    }
    async logoutAll() {
        const results = await Promise.allSettled([...this.registeredAccounts].map((account) => account.logout()));
        const failures = results
            .filter((result) => result.status === 'rejected')
            .map((result) => result.reason);
        if (failures.length > 0) {
            throw new AggregateError(failures, `${failures.length} 个账号下线失败`);
        }
    }
    clearLifecycleTask(kind, task) {
        if (kind === 'login' && this.loginTask === task)
            delete this.loginTask;
        if (kind === 'logout' && this.logoutTask === task)
            delete this.logoutTask;
    }
    ensureLifecycleGeneration(generation) {
        if (generation !== this.lifecycleGeneration)
            throw new Error('Client 登录已取消');
    }
}
//# sourceMappingURL=client.js.map