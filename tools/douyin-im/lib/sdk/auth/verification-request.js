export function createVerificationRequests(options) {
    let secureInfo;
    const encryptedFields = ['mobile', 'email', 'password', 'code', 'account', 'sms_code', 'email_code', 'type',
        'sms_type', 'ect_type', 'recaptcha_token', 'sms_code_key', 'username', 'unbind_exist', 'current_password', 'old_mobile'];
    const record = (value) => value !== null && typeof value === 'object'
        ? value : undefined;
    const parseQuery = (text) => {
        const result = Object.create(null);
        for (const item of text.split('&')) {
            const [key, value = ''] = item.split('=');
            if (key)
                result[key] = decodeURIComponent(value);
        }
        return result;
    };
    const form = (value) => Object.keys(value).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(typeof value[key] === 'object' ? JSON.stringify(value[key]) : String(value[key]))}`).join('&');
    const encrypt = (value, fields) => {
        if (typeof value !== 'object' || !fields.length)
            return value;
        const data = { mix_mode: 0, ...record(value) };
        let mixed = 0;
        for (const key of fields) {
            if (data[key] === undefined)
                continue;
            if (data[key] === null)
                throw new TypeError('Invalid AccountSDK encrypted field');
            const text = String(data[key]).replace(/[\uD800-\uDFFF]/g, '');
            data[key] = [...new TextEncoder().encode(text)].map(byte => (byte ^ 5).toString(16)).join('');
            mixed = 1;
        }
        data['mix_mode'] = data['fixed_mix_mode'] = mixed;
        return data;
    };
    const originRequest = async (input, pipeline) => {
        const config = { ...input, header: { ...input.header } };
        if (pipeline === 'fetchSec' && !secureInfo) {
            if (input.getCacheInfo) {
                secureInfo = await input.getCacheInfo(input.commonParams) || undefined;
                if (!secureInfo) {
                    const query = options.query?.() || {};
                    secureInfo = { aid: query['aid'], did: query['device_id'], iid: query['install_id'], app_name: query['app_name'], locale: query['locale'] };
                }
            }
            else {
                secureInfo = input.commonParams ? { aid: input.commonParams['aid'], did: '0', iid: '0',
                    app_name: input.commonParams['app_name'], locale: input.commonParams['locale'] }
                    : { did: '0', iid: '0', app_name: '', locale: 'zh' };
            }
            options.initializeVerification?.(secureInfo);
        }
        if (pipeline !== 'raw') {
            const fields = config.encryptFields ?? encryptedFields;
            if (config.data)
                config.data = encrypt(config.data, fields);
            if (config.params)
                config.params = encrypt(config.params, fields);
            config.header['Accept'] ??= 'application/json, text/javascript';
            config.header['Content-Type'] ??= 'application/x-www-form-urlencoded';
            if (config.needFormData !== false && config.data !== null && typeof config.data === 'object')
                config.data = form(config.data);
            config.validateStatus ||= status => status >= 200 && status < 300;
        }
        const base = config.baseURL || options.origin;
        const inputUrl = config.url || '';
        const combined = /^([a-z][a-z\d+.-]*:)?\/\//i.test(inputUrl) ? inputUrl
            : `${base.replace(/\/+$/, '')}/${inputUrl.replace(/^\/+/, '')}`;
        const target = new URL(combined, options.origin);
        const query = { ...parseQuery(target.search.slice(1)), ...config.params, ...config.commonParams };
        target.search = Object.keys(query).filter(Boolean).map(key => `${key}=${encodeURIComponent(String(query[key]))}`).join('&');
        const timeout = config.timeout ?? 3000;
        if (!Number.isSafeInteger(timeout) || timeout < 0)
            throw new RangeError('Invalid verification timeout');
        if (config.data === undefined) {
            for (const key of Object.keys(config.header))
                if (key.toLowerCase() === 'content-type')
                    delete config.header[key];
        }
        const result = await options.transport({ url: target.toString(), method: (config.method || 'GET').toUpperCase(),
            headers: config.header, body: config.data || null, timeout }, pipeline);
        if (config.validateStatus && result.status && !config.validateStatus(result.status)) {
            throw new Error(`Request failed with status code ${result.status}`);
        }
        let data = result.rawText;
        if (data) {
            try {
                data = JSON.parse(result.rawText);
            }
            catch {
                throw result.rawText;
            }
        }
        const response = { data, status: result.status, statusText: result.statusText, headers: result.headers, config };
        if (pipeline !== 'fetchSec')
            return response;
        const envelope = record(data), payload = record(envelope?.['data']);
        const decision = payload?.['verify_center_decision_conf'] || payload?.['verify_center_secondary_decision_conf']
            || envelope?.['verify_center_decision_conf'] || envelope?.['verify_center_secondary_decision_conf'];
        if (!decision)
            return response;
        if (typeof decision !== 'string')
            throw new TypeError('Invalid verification decision');
        const code = payload?.['error_code'] || envelope?.['error_code'];
        const smsKey = payload?.['sms_code_key'] || envelope?.['sms_code_key'];
        return options.verify({ responseContext: response, verifyData: decision,
            retry: (kind, fp) => {
                const retry = { ...config, encryptFields: [] };
                if (kind === 'captcha')
                    retry.params = { ...config.params, fp };
                else {
                    retry.data = config.data || '';
                    if (code === 2046 && smsKey) {
                        if (typeof retry.data !== 'string')
                            throw new TypeError('Invalid secondary verification form body');
                        const data = Object.create(null);
                        if (retry.data)
                            for (const pair of retry.data.split('&')) {
                                const [key, raw] = pair.split('=');
                                const value = decodeURIComponent(String(raw));
                                data[key] = value;
                                if (/^\{.*\}$/.test(value)) {
                                    try {
                                        data[key] = JSON.parse(value);
                                    }
                                    catch { }
                                }
                            }
                        retry.data = form({ ...data, sms_code_key: smsKey });
                    }
                }
                return originRequest(retry, pipeline);
            },
        });
    };
    const request = async (config, pipeline) => {
        const response = await originRequest(config, pipeline);
        const body = record(response.data);
        if (config.pathType === 'sso') {
            if (body?.['message'] === 'success' || body?.['error_code'] === 0)
                return response.data;
            throw response.data;
        }
        if (body?.['message']) {
            if (body['message'] === 'success')
                return response.data;
            throw response.data;
        }
        throw response;
    };
    return {
        request: (config = {}) => request(config, 'raw'),
        fetch: (config = {}) => request(config, 'fetch'),
        fetchSec: (config = {}) => request(config, 'fetchSec'),
    };
}
//# sourceMappingURL=verification-request.js.map