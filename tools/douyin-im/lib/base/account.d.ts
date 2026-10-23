import { EventEmitter } from 'events';
import { type ConnectionManagerOptions } from './runtime/connection-manager.js';
import { AccountRuntime } from './runtime/account-runtime.js';
import type { AccountStore } from '../store/account-store.js';
import type { ApiConnection } from '../desktop/api-connection.js';
import { PassportTokenBeat } from '../desktop/token-beat.js';
import { type Logger } from '../logger.js';
export type AccountState = 'idle' | 'logging-in' | 'online' | 'reconnecting' | 'stopping' | 'offline' | 'error';
export interface AccountIdentity {
    platformUid?: string;
    imUid?: string;
}
export declare abstract class BaseAccount extends EventEmitter {
    private accountState;
    private lifecycleGeneration;
    private loginTask?;
    private logoutTask?;
    private resolveLogin?;
    private rejectLogin?;
    private connectionManager?;
    private accountRuntime?;
    private accountLogger;
    private sessionRenewal?;
    abstract get uid(): string | undefined;
    abstract get imUid(): string | undefined;
    get logger(): Logger;
    get identity(): Readonly<AccountIdentity>;
    get state(): AccountState;
    get online(): boolean;
    markActive(): void;
    protected startSessionRenewal(request: ConstructorParameters<typeof PassportTokenBeat>[0]): void;
    login(): Promise<void>;
    logout(): Promise<void>;
    protected get loginGeneration(): number;
    protected installAccountRuntime(store: AccountStore, connection: ApiConnection): void;
    protected onDeviceUpdated(): void;
    protected refreshLoggerIdentity(): void;
    protected get runtime(): AccountRuntime;
    protected setAccountState(state: AccountState): void;
    protected assertLoginGeneration(generation: number): void;
    protected completeLogin(): void;
    protected failLogin(error: unknown): void;
    protected continueLoginAction(action: () => Promise<void>): Promise<void>;
    protected abstract beginLogin(generation: number): Promise<void>;
    protected abstract cancelLogin(): void;
    protected startConnection(options: ConnectionManagerOptions): Promise<void>;
    protected stopRuntime(): Promise<void>;
    protected onLoggedOut(): void;
    private performLogin;
    private performLogout;
    private clearPendingLogin;
    private clearLifecycleTask;
}
//# sourceMappingURL=account.d.ts.map