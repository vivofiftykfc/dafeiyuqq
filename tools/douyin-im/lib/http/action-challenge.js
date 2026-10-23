export class ActionChallengeError extends Error {
    source;
    name = 'ActionChallengeError';
    #raw;
    constructor(source, raw) {
        super(source === 'passport-decision' ? '业务操作需要身份二次验证' : '业务操作需要验证码验证');
        this.source = source;
        if (!raw || raw.length > 65_536)
            throw new Error('平台业务验证数据无效');
        if (source === 'passport-decision') {
            let value;
            try {
                value = JSON.parse(raw);
            }
            catch {
                throw new Error('平台二次验证数据不是有效 JSON');
            }
            if (!value || typeof value !== 'object' || Array.isArray(value))
                throw new Error('平台二次验证数据不是对象');
        }
        this.#raw = raw;
    }
    get raw() { return this.#raw; }
}
//# sourceMappingURL=action-challenge.js.map