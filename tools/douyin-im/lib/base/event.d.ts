import type { BaseAccount } from './account.js';
export type EventPostType = 'message' | 'notice' | 'request';
export type EventRawPayload = Readonly<Record<string, unknown>>;
export declare abstract class BaseEvent<A extends BaseAccount = BaseAccount, R extends EventRawPayload = EventRawPayload> {
    abstract readonly postType: EventPostType;
    abstract readonly type: string;
    readonly account: A;
    readonly time: number;
    readonly raw: R;
    protected constructor(account: A, raw: R, time?: number | string);
}
//# sourceMappingURL=event.d.ts.map