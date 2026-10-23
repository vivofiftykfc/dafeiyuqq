import type { ImProtoTransport } from './transport.js';
import type { RecallMessageOptions, RecallMessageResponse, SendMessageOptions, SendMessageResponse } from './types.js';
export declare class ImSendApi {
    private readonly transport;
    private readonly deviceId;
    constructor(transport: ImProtoTransport, deviceId?: string);
    send(options: SendMessageOptions): Promise<SendMessageResponse>;
    recall(options: RecallMessageOptions): Promise<RecallMessageResponse>;
}
//# sourceMappingURL=send.d.ts.map