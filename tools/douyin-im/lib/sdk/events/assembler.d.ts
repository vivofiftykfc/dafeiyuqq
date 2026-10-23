import type { ImNotice, PrivateMessage } from '../../services/im/types.js';
import type { Account } from '../account.js';
import type { RawInboundMessage } from '../../base/raw/inbound-message.js';
import { MessageEvent } from './message.js';
import { type AnyNoticeEvent } from './notice.js';
import type { AnyRequestEvent } from './request.js';
export interface EventAssemblerHooks {
    acceptMessage?: (inbound: RawInboundMessage) => boolean;
    onMessage: (event: MessageEvent) => void;
    onNotice?: (event: AnyNoticeEvent) => void;
    onRequest?: (event: AnyRequestEvent) => void;
}
export declare class EventAssembler {
    private readonly account;
    private readonly hooks;
    private readonly platformUid;
    private readonly threadShortIds;
    private readonly emittedJoinRequestIds;
    private joinRequestRefreshTask?;
    private generation;
    private cleared;
    constructor(account: Account, hooks: EventAssemblerHooks, platformUid: string);
    rememberConversation(threadId: string, conversationShortId: string): void;
    resolveShortId(threadId: string, hint?: string): string | undefined;
    receiveMessage(inbound: RawInboundMessage): void;
    receiveNotice(notice: ImNotice): void;
    receiveMessageListUpdate(messages: readonly PrivateMessage[]): void;
    clear(): void;
    private bindNoticeGroup;
    private isSelfUid;
    private receiveMarkedReadNotice;
    private privatePeerUid;
    private scheduleJoinRequestRefresh;
    private refreshJoinRequests;
}
//# sourceMappingURL=assembler.d.ts.map