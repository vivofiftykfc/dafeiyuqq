export class SendMessageError extends Error {
    response;
    statusCode;
    checkCode;
    constructor(response) {
        const check = response.checkCode == null ? '' : ` check=${response.checkCode}`;
        super(`消息发送失败: status=${response.statusCode}${check} ${response.statusMsg}`.trim());
        this.name = 'SendMessageError';
        this.response = response;
        this.statusCode = response.statusCode;
        if (response.checkCode != null)
            this.checkCode = response.checkCode;
    }
}
export function toError(value) {
    return value instanceof Error ? value : new Error(String(value));
}
//# sourceMappingURL=errors.js.map