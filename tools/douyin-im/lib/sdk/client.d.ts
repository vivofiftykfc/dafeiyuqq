import { captureRejectionSymbol } from 'events';
import { BaseClient, type AccountContext } from '../base/client.js';
import type { AccountEventMap } from './account-events.js';
import { Account, type AccountOptions } from './account.js';
import type { LocalImStateOptions } from '../services/im/state-store.js';
export interface ClientOptions {
    dataDir?: string;
    autoLoad?: boolean;
    skipVerify?: boolean;
    localState?: false | LocalImStateOptions;
}
interface ClientAccountEvent {
    account: Account;
}
type WithAccount<T> = T extends void ? ClientAccountEvent : T extends Error ? ClientAccountEvent & {
    error: T;
} : ClientAccountEvent & T;
type PassiveMessageEventName = 'message' | 'message.private' | 'message.stranger' | 'message.group';
type PassiveNoticeEventName = 'notice' | 'notice.friend' | 'notice.friend.marked-read' | 'notice.friend.add-request' | 'notice.friend.increase' | 'notice.friend.decrease' | 'notice.conversation' | 'notice.conversation.marked-read' | 'notice.group' | 'notice.group.member-change' | 'notice.group.member-increase' | 'notice.group.invite' | 'notice.group.member-decrease' | 'notice.group.admin' | 'notice.group.name-change' | 'notice.group.avatar-change' | 'notice.group.metadata-change' | 'notice.group.marked-read' | 'notice.conversation.update' | 'notice.conversation.delete' | 'notice.message.recall' | 'notice.message.update' | 'notice.message.batch-update' | 'notice.message.delete' | 'notice.message.reaction' | 'notice.conversation.read-summary' | 'notice.message' | 'notice.im.command';
type PassiveRequestEventName = 'request' | 'request.group' | 'request.group.join';
type PassiveAccountEventName = PassiveMessageEventName | PassiveNoticeEventName | PassiveRequestEventName;
export type ClientEventMap = {
    [K in Exclude<keyof AccountEventMap, PassiveAccountEventName>]: WithAccount<AccountEventMap[K]>;
} & Pick<AccountEventMap, PassiveAccountEventName> & {
    'account.added': ClientAccountEvent;
    'account.removed': ClientAccountEvent;
};
export declare class Client extends BaseClient<Account, AccountOptions> {
    private readonly store;
    private readonly defaults;
    private readonly accountForwarders;
    constructor(options?: ClientOptions);
    on<K extends keyof ClientEventMap>(event: K, listener: (payload: ClientEventMap[K]) => void | Promise<void>): this;
    on(event: string, listener: (...args: unknown[]) => void): this;
    emit<K extends keyof ClientEventMap>(event: K, payload: ClientEventMap[K]): boolean;
    emit(event: string, ...args: unknown[]): boolean;
    protected instantiateAccount(options: AccountOptions): Account;
    protected listStoredAccountIds(): readonly string[];
    protected resolveStoredAccountId(accountId: string): string | undefined;
    protected accountRegistrationKey(options: AccountOptions): string | undefined;
    protected normalizeAccountOptions(options: AccountOptions, context: AccountContext): AccountOptions;
    protected onAccountAdded(account: Account): void;
    protected onAccountRemoved(account: Account): void;
    private createTransport;
    private forwardEvents;
    [captureRejectionSymbol](error: unknown, event: string | symbol, payload?: unknown): void;
    private emitAccountEvent;
}
export declare function createClient(options?: ClientOptions): Client;
export {};
//# sourceMappingURL=client.d.ts.map