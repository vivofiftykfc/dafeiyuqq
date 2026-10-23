import { ImService } from '../../services/im/service.js';
import type { RecallMessageOptions, RecallMessageResponse, SendMessageResponse } from '../../services/im/types.js';
import type { ApiConnection } from '../../desktop/api-connection.js';
import { type SendableMessage } from './message.js';
import type { CollectedStickerEnabledStatus } from '../../services/im/emoji.js';
export interface OutboundOptions {
    platformUid?: string;
    deviceId?: string;
    getStickerEnabledStatus?: () => CollectedStickerEnabledStatus | undefined;
    getConversationSettingExt?: (conversationId: string) => Readonly<Record<string, string>> | undefined;
}
export declare class OutboundSender {
    private readonly opts;
    private readonly im;
    constructor(client: ApiConnection, opts?: OutboundOptions);
    get imService(): ImService;
    sendText(opts: {
        threadId: string;
        conversationShortId: string;
        text: string;
        conversationType?: number;
        inboxType?: number;
        mentions?: readonly import('../../services/im/content.js').TextMention[];
    }): Promise<SendMessageResponse>;
    sendMessage(opts: {
        threadId: string;
        conversationShortId: string;
        message: SendableMessage;
        conversationType?: number;
        inboxType?: number;
    }): Promise<SendMessageResponse>;
    forwardMessage(opts: {
        threadId: string;
        conversationShortId: string;
        conversationType?: number;
        inboxType?: number;
        content: string;
        messageType: number;
        serverMessageId: string;
    }): Promise<SendMessageResponse>;
    private assertConversationRisk;
    private sendPreparedMessage;
    private rememberAcknowledged;
    recall(options: RecallMessageOptions): Promise<RecallMessageResponse>;
}
//# sourceMappingURL=outbound.d.ts.map