import type { BaseAccount } from './account.js';
export interface ConversationAddress {
    readonly threadId: string;
    readonly conversationShortId: string;
    readonly conversationType: 1 | 2;
    readonly inboxType: number;
}
export declare abstract class Contact<A extends BaseAccount = BaseAccount> {
    readonly account: A;
    readonly id: string;
    private _address;
    protected constructor(account: A, id: string, address: ConversationAddress);
    get address(): Readonly<ConversationAddress>;
    get threadId(): string;
    get conversationShortId(): string;
    get conversationType(): 1 | 2;
    get inboxType(): number;
    protected resolveAddress(): Readonly<ConversationAddress>;
    protected updateAddress(address: ConversationAddress): void;
}
//# sourceMappingURL=contact.d.ts.map