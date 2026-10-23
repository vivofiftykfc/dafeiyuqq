import { EventEmitter } from 'events';
import { ConnectionManager, } from './runtime/connection-manager.js';
import { AccountRuntime } from './runtime/account-runtime.js';
import { PassportTokenBeat } from '../desktop/token-beat.js';
import { getAccountLogger } from '../logger.js';
export class BaseAccount extends EventEmitter {
    accountState = 'idle';
    lifecycleGeneration = 0;
    loginTask;
    logoutTask;
    resolveLogin;
    rejectLogin;
    connectionManager;
    accountRuntime;
    accountLogger = getAccountLogger();
    sessionRenewal;
    get logger() {
        return this.accountLogger;
    }
    get identity() {
        const identity = {};
        if (this.uid !== undefined)
            identity.platformUid = this.uid;
        if (this.imUid !== undefined)
            identity.imUid = this.imUid;
        return Object.freeze(identity);
    }
    get state() {
        return this.accountState;
    }
    get online() {
        return this.accountState === 'online' || this.accountState === 'reconnecting';
    }
    markActive() {
        if (!this.online)
            throw new Error('账号未上线，不能报告活动');
        this.sessionRenewal?.activity();
    }
    startSessionRenewal(request) {
        this.sessionRenewal?.stop();
        const generation = this.lifecycleGeneration;
        const renewal = new PassportTokenBeat(request, () => {
            if (generation !== this.lifecycleGeneration || !this.online)
                return;
            this.logger.warn('Session 续期被拒绝，账号已退出登录');
            void this.logout().catch(error => this.logger.error(error, '停止失效账号失败'));
        });
        this.sessionRenewal = renewal;
        renewal.start();
    }
    login() {
        if (this.online)
            return Promise.resolve();
        if (this.loginTask)
            return this.loginTask;
        const task = this.performLogin();
        this.loginTask = task;
        void task.then(() => this.clearLifecycleTask('login', task), () => this.clearLifecycleTask('login', task));
        return task;
    }
    logout() {
        if (this.logoutTask)
            return this.logoutTask;
        if (this.accountState === 'idle' || this.accountState === 'offline') {
            return Promise.resolve();
        }
        const task = this.performLogout();
        this.logoutTask = task;
        delete this.loginTask;
        void task.then(() => this.clearLifecycleTask('logout', task), () => this.clearLifecycleTask('logout', task));
        return task;
    }
    get loginGeneration() {
        return this.lifecycleGeneration;
    }
    installAccountRuntime(store, connection) {
        if (this.accountRuntime)
            throw new Error('account runtime already installed');
        const runtime = new AccountRuntime(store, connection, () => this.onDeviceUpdated());
        this.accountRuntime = runtime;
    }
    onDeviceUpdated() { }
    refreshLoggerIdentity() {
        this.accountLogger = getAccountLogger(this.uid);
    }
    get runtime() {
        if (!this.accountRuntime)
            throw new Error('account runtime is not installed');
        return this.accountRuntime;
    }
    setAccountState(state) {
        this.accountState = state;
    }
    assertLoginGeneration(generation) {
        if (generation !== this.lifecycleGeneration || this.accountState !== 'logging-in') {
            throw new Error('登录已取消');
        }
    }
    completeLogin() {
        this.assertLoginGeneration(this.lifecycleGeneration);
        this.accountState = 'online';
        const resolve = this.resolveLogin;
        this.clearPendingLogin();
        resolve?.();
    }
    failLogin(error) {
        if (this.accountState !== 'logging-in')
            return;
        const normalized = error instanceof Error ? error : new Error(String(error));
        this.cancelLogin();
        this.accountState = 'error';
        const reject = this.rejectLogin;
        this.clearPendingLogin();
        reject?.(normalized);
        this.emit('system.login.error', normalized);
    }
    async continueLoginAction(action) {
        if (this.accountState !== 'logging-in')
            throw new Error('账号当前不在登录流程中');
        const generation = this.lifecycleGeneration;
        try {
            await action();
        }
        catch (error) {
            if (generation === this.lifecycleGeneration)
                this.failLogin(error);
            throw error;
        }
    }
    async startConnection(options) {
        if (this.connectionManager)
            await this.connectionManager.stop();
        const manager = new ConnectionManager(options);
        this.connectionManager = manager;
        try {
            await manager.start();
        }
        catch (error) {
            if (this.connectionManager === manager)
                delete this.connectionManager;
            await manager.stop();
            throw error;
        }
    }
    async stopRuntime() {
        this.sessionRenewal?.stop();
        delete this.sessionRenewal;
        const manager = this.connectionManager;
        delete this.connectionManager;
        await manager?.stop();
    }
    onLoggedOut() { }
    async performLogin() {
        if (this.accountState === 'stopping')
            await this.logoutTask;
        if (this.online)
            return;
        this.accountState = 'logging-in';
        const generation = ++this.lifecycleGeneration;
        const online = new Promise((resolve, reject) => {
            this.resolveLogin = resolve;
            this.rejectLogin = reject;
        });
        void this.beginLogin(generation).catch((error) => {
            if (generation === this.lifecycleGeneration)
                this.failLogin(error);
        });
        await online;
    }
    async performLogout() {
        this.accountState = 'stopping';
        this.lifecycleGeneration += 1;
        this.sessionRenewal?.stop();
        delete this.sessionRenewal;
        this.accountRuntime?.suspend();
        this.cancelLogin();
        const reject = this.rejectLogin;
        this.clearPendingLogin();
        reject?.(new Error('登录已取消'));
        try {
            await this.stopRuntime();
        }
        finally {
            this.onLoggedOut();
            this.accountState = 'offline';
            this.emit('system.offline');
        }
    }
    clearPendingLogin() {
        delete this.resolveLogin;
        delete this.rejectLogin;
    }
    clearLifecycleTask(kind, task) {
        if (kind === 'login' && this.loginTask === task)
            delete this.loginTask;
        if (kind === 'logout' && this.logoutTask === task)
            delete this.logoutTask;
    }
}
//# sourceMappingURL=account.js.map