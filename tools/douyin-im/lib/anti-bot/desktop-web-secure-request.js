import { DesktopWebSecureEvents } from './desktop-web-secure-events.js';
import { classifyDesktopWebSecureRequest } from './desktop-web-secure-config.js';
function isNewCert(cert) { return !cert || typeof cert === 'string' && cert.includes('pub.'); }
function certificateHeaders(input) {
    return input.b64Cert ? { 'bd-ticket-guard-client-cert': input.b64Cert || '' } : { 'bd-ticket-guard-client-csr': input.b64Csr || '' };
}
function publicHeaders(input, version = 2) {
    return { 'bd-ticket-guard-ree-public-key': input.b64PubKey, 'bd-ticket-guard-web-version': version, 'bd-ticket-guard-web-sign-type': input.algoType === 'hmac' ? 1 : 0 };
}
function consumerHeaders(input) {
    const { signType = 'pubKey', tsSign = '' } = input;
    const version = tsSign ? tsSign.slice(0, 4) : 'ts.2';
    if (signType === 'cert' || version !== 'ts.1' && version !== 'ts.2' || !isNewCert(input.cert))
        return certificateHeaders(input);
    return publicHeaders(input, version === 'ts.1' ? 1 : 2);
}
const metric = (value) => typeof value === 'number' ? value.toString() : '-99';
function reportPath(url) {
    try {
        if (!url)
            return '';
        if (url.startsWith('http'))
            return new URL(url).pathname;
    }
    catch { }
    return url;
}
export class DesktopWebSecureRequestPipeline extends DesktopWebSecureEvents {
    context;
    keys;
    ttl = 18e6;
    configuredTtl = false;
    signatures = {};
    constructor(context, keys) {
        super();
        this.context = context;
        this.keys = keys;
    }
    classify(request, config, signType, initType) {
        return classifyDesktopWebSecureRequest(request, config, this.context.pageHref, signType, initType);
    }
    async createTicketGuardHeaders({ signData, signType = 'pubKey', certType = 'header' }) {
        const keys = this.keys, { ticket, ts_sign, path } = signData || {};
        const start = new this.context.Date().getTime();
        let times = {}, algoType = '';
        const info = await keys?.getKeysInfoWithOrigin({ certType, scene: 'web_protect' });
        const publicKey = info?.crypt?.ec_publicKey;
        const { cert, b64Cert, b64PubKey, b64Csr, getKeysInfoTime = 0 } = info || {};
        let cache = false, signed, signTime = 0;
        keys?.getCookieCryptStatus();
        if (ticket && publicKey && path) {
            const cached = this.readSignature(path, ticket);
            if (cached) {
                signed = cached.signStr;
                algoType = cached.algoType;
                cache = true;
            }
            else {
                const timestamp = Math.floor(new this.context.Date().getTime() / 1000);
                signTime = this.context.Date.now();
                const result = await keys?.signWithKeysInfo({ sign_data: `ticket=${ticket}&path=${path}&timestamp=${timestamp}`,
                    req_content: 'ticket,path,timestamp', timestamp, certType, scene: 'web_protect', keysInfo: { ...info, sign: { ticket, ts_sign } } });
                signed = result && result.result || '';
                times = result && result.times || {};
                algoType = result?.algoType;
                if (signed)
                    this.writeSignature(path, ticket, signed, algoType);
            }
        }
        const output = { ...consumerHeaders({ tsSign: ts_sign || '', initType: 'pubKey', signType, b64PubKey, b64Cert, b64Csr, cert, algoType: algoType || undefined }),
            'bd-ticket-guard-version': 2, 'bd-ticket-guard-iteration-version': 1 };
        if (signed)
            output['bd-ticket-guard-client-data'] = signed;
        const end = new this.context.Date().getTime();
        return { bdTicketGuardHeaders: output, timeCollect: { duration: end - start || '0', signTime: signTime ? this.context.Date.now() - signTime : 0, getKeysInfoTime, ...times },
            extras: { cache: cache ? '1' : '0', server_data: signed ? '1' : '0', algoType, path, isPubKeySign: (ts_sign || '').slice(0, 4) } };
    }
    async prepare(request, match) {
        try {
            const originalHeaders = request?.headers, keys = this.keys;
            if (!originalHeaders || typeof originalHeaders === 'string')
                return request;
            const start = new this.context.Date().getTime();
            let algoType = '';
            const { needProxy, consumerConfig: consumer, providerConfig: provider, pathname, hostname, signType = 'pubKey', initType = 'pubKey', onlyProxyResp = false, needReport = true } = match;
            const { scene = '', certType = 'header', signTimeout } = consumer || provider || {};
            if (!needProxy || onlyProxyResp || !keys)
                return request;
            let cache = false;
            const info = await keys.getKeysInfoWithOrigin({ scene, certType: certType });
            const { match_md5_iframe, match_md5_local } = await keys.checkSignData(info);
            const { ec_publicKey: publicKey, ec_csr: csr } = info?.crypt || {};
            const { ticket, ts_sign, log_id = '' } = (info?.sign || {});
            const { cert, b64Cert, b64PubKey, b64Csr, dataFrom, getKeysInfoTime = 0 } = info || {};
            let signed, lost = '0', signTime = 0;
            const cookieStatus = keys.getCookieCryptStatus();
            if (!ticket && !ts_sign && cookieStatus)
                lost = '1';
            if (ticket && publicKey && consumer && pathname) {
                if (signTimeout && !this.configuredTtl) {
                    this.ttl = signTimeout;
                    this.configuredTtl = true;
                }
                const cached = this.readSignature(pathname, ticket);
                if (cached) {
                    signed = cached.signStr;
                    algoType = cached.algoType;
                    cache = true;
                }
                else {
                    const payload = this.signingInput(request, ticket, pathname, consumer.urlRewriteRules || []);
                    signTime = this.context.Date.now();
                    const result = await keys.signWithKeysInfo({ ...payload, certType: certType, scene, keysInfo: info, isNewCert: isNewCert(cert) });
                    signed = result && result.result || '';
                    algoType = result?.algoType;
                    if (signed)
                        this.writeSignature(pathname, ticket, signed, algoType);
                }
            }
            const input = { tsSign: ts_sign || '', initType, signType, b64PubKey, b64Cert, b64Csr, cert, algoType: algoType || undefined };
            const headers = consumer ? consumerHeaders(input) : initType === 'cert' ? certificateHeaders(input) : publicHeaders({ b64PubKey }, 2);
            request.headers = { ...request.headers, ...headers, 'bd-ticket-guard-version': consumer?.signVersion || provider?.signVersion || 2, 'bd-ticket-guard-iteration-version': 1 };
            if (signed)
                request.headers = { ...request.headers, 'bd-ticket-guard-client-data': signed };
            this.emit('log', { content: signed ? 'add request data' : 'miss request data', level: signed ? 'info' : 'warn', extra: { url: pathname || '', ts_sign: ts_sign ? '[redacted]' : '', log_id } });
            const end = new this.context.Date().getTime(), { isConnection, retryCount, startTime, endTime, loadTime } = keys.getStorageStatus() || {};
            const usage = await keys.getUsage();
            if (needReport)
                this.emit('execute', { action: 'request', op: 'sign', duration: end > start ? end - start : 0, status: 'success',
                    ctx: { cache: cache ? '1' : '0', path: pathname || '', cert: cert ? '1' : '0', pubKey: publicKey ? '1' : '0', isPubKeySign: (ts_sign || '').slice(0, 4),
                        isPubKeyInit: initType === 'pubKey' ? '1' : '0', csr: csr ? '1' : '0', version: `${consumer?.signVersion || ''}` || `${provider?.signVersion || ''}` || '1',
                        server: signed ? '1' : '0', crossStatus: keys.getIframeStatus() ? '1' : '0', initMatch: keys.initMatch ? '1' : '0', dataFrom: dataFrom || '-99',
                        match_md5_local: match_md5_local || '-99', match_md5_iframe: match_md5_iframe || '-99', lost, isNewCert: isNewCert(cert) ? '1' : '0',
                        isConnection: metric(isConnection), retryCount: metric(retryCount), algoType, usage: usage || 'unknown', hostname: hostname || '' },
                    metrics: { startTime: startTime || 0, endTime: endTime || 0, loadTime: loadTime || 0, getKeysInfoTime, signTime: signTime ? this.context.Date.now() - signTime : 0 } });
            request.extras = { ...info, scene, certType, match_md5_iframe, match_md5_local, is_pubkey_ts_sign: (ts_sign || '').slice(0, 4),
                is_new_cert: isNewCert(cert) ? '1' : '0', lost, isPubKeyInit: initType === 'pubKey' ? '1' : '0' };
        }
        catch (error) {
            this.emit('error', { error, name: 'process request config fail' });
            this.emit('log', { content: 'process request config fail', extra: { content: '[redacted]' } });
            this.emit('execute', { action: 'request', op: 'sign', status: 'fail', ctx: { path: request?.url || '' } });
        }
        return request;
    }
    async complete(response, match, updateData = false) {
        try {
            const keys = this.keys, usage = await keys?.getUsage();
            if (!response?.config?.headers || typeof response.config.headers === 'string') {
                this.emit('execute', { action: 'response', op: 'respHandler', status: 'fail', ctx: { url: reportPath(response?.config.url) || '' }, extras: '[redacted]' });
                this.emit('error', { error: '[redacted]', name: !response?.config?.headers ? 'response headers is empty' : 'response headers type is string' });
                return response;
            }
            const extras = response.config.extras === undefined ? {} : response.config.extras;
            const { dataFrom, match_md5_local, match_md5_iframe, is_pubkey_ts_sign, is_new_cert, lost, isPubKeyInit } = extras || {};
            const { isConnection, retryCount, startTime, endTime, loadTime } = keys?.getStorageStatus() || {};
            if (response.reqHeaders?.['bd-ticket-guard-version'])
                this.emit('execute', { action: 'response', op: 'sign', status: 'finish',
                    ctx: { url: reportPath(response.config.url) || '', crossStatus: keys?.getIframeStatus() ? '1' : '0', lost, dataFrom: dataFrom || '-99', match_md5_local, match_md5_iframe,
                        initMatch: keys?.initMatch ? '1' : '0', isConnection: metric(isConnection), retryCount: metric(retryCount), is_pubkey_ts_sign, is_new_cert, isPubKeyInit, usage: usage || 'unknown' },
                    metrics: { startTime: startTime || 0, endTime: endTime || 0, loadTime: loadTime || 0 }, extras: '[redacted]' });
            const start = new this.context.Date().getTime(), { needProxy, providerConfig, hostname, pathname, needReport = true } = match;
            const { scene, namespace } = providerConfig || {};
            if (needProxy && keys) {
                const server = response.headers?.['bd-ticket-guard-server-data'] || '', result = response.headers?.['bd-ticket-guard-result'] || '-99', logId = response.headers?.['x-tt-logid'] || '';
                const decoded = server && keys.b642str(server), parsed = decoded && JSON.parse(decoded), ticket = (parsed || {}).ticket;
                const logContext = { url: reportPath(response.config.url) || '', logId };
                if (ticket && scene && namespace)
                    await keys.setSignValueAsync({ sign: parsed, scene, namespace: namespace, logCtx: logContext });
                else if (ticket && scene)
                    keys.setSignValue({ sign: parsed, scene, logCtx: logContext });
                try {
                    if (server && !scene)
                        this.emit('log', { content: 'ts_sign_data lost scene', extra: { ...logContext }, level: 'info' });
                }
                catch { }
                const headers = this.processResponseHeaders(result, extras, response, updateData);
                const end = new this.context.Date().getTime();
                if (result && Number(result) > 0)
                    this.emit('log', { content: 'response verify error', extra: { ...logContext }, level: 'info' });
                if (needReport)
                    this.emit('execute', { action: 'response', op: 'init', status: 'success', duration: end > start ? end - start : 0,
                        ctx: { url: pathname || '', path: pathname || '', crossStatus: keys.getIframeStatus() ? '1' : '0', lost, verify: result, dataFrom: dataFrom || '-99', match_md5_local, match_md5_iframe,
                            isConnection: metric(isConnection), retryCount: metric(retryCount), initMatch: keys.initMatch ? '1' : '0', isNewCert: is_new_cert, isPubkeyTssign: is_pubkey_ts_sign,
                            isPubKeyInit, isHasNewTssign: server ? '1' : '0', usage: usage || 'unknown', hostname: hostname || '', logId, ...headers },
                        metrics: { startTime: startTime || 0, endTime: endTime || 0, loadTime: loadTime || 0 }, extras: '[redacted]' });
            }
        }
        catch (error) {
            this.emit('execute', { action: 'response', op: 'init', status: 'fail', ctx: { url: reportPath(response?.config.url) || '' } });
            this.emit('error', { error, name: 'get sign data error in response' });
        }
        return response;
    }
    processResponseHeaders(result, extras, response, updateData) {
        try {
            const { certType, items = [] } = extras || {}, origins = {}, keys = [], values = [];
            const requestHeaders = response.reqHeaders, server = requestHeaders?.['bd-ticket-guard-client-data'] ? '1' : '0', url = response.config?.url;
            if (certType === 'header')
                return {};
            if (certType === 'cookie') {
                if (items && Array.isArray(items))
                    items.forEach(item => {
                        const { key, value, from, origin } = (item || {});
                        origins[`${key.replace(/\//g, '_')}_origin`] = origin || '';
                        origins[`${key.replace(/\//g, '_')}_from`] = from || '-99';
                        origins[`${key.replace(/\//g, '_')}_status`] = value ? 'success' : 'success_null';
                        if (value) {
                            keys.push(key);
                            values.push(value);
                        }
                    });
                if (result === '-99' && updateData && url) {
                    for (const path of ['/aweme/v1/web/commit/item/digg', '/aweme/v1/web/commit/follow/user', '/aweme/v1/web/comment/publish', '/web/api/media/aweme/create']) {
                        if (url.match(new RegExp(path))) {
                            if (keys.length)
                                this.keys.setKeysAndValues(keys, values);
                            break;
                        }
                    }
                }
            }
            return { csr: requestHeaders?.['bd-ticket-guard-client-csr'] ? '1' : '0', cert: requestHeaders?.['bd-ticket-guard-client-cert'] ? '1' : '0', server,
                version: requestHeaders?.['bd-ticket-guard-version'] || '-99', iterVersion: requestHeaders?.['bd-ticket-guard-iteration-version'] || '-99', ...origins };
        }
        catch (error) {
            this.emit('error', { error, name: 'process Request Header Error' });
            return {};
        }
    }
    signingInput(request, ticket, pathname, rules) {
        try {
            const url = request?.url;
            if (!url)
                return { req_content: '', sign_data: '' };
            const timestamp = Math.floor(new this.context.Date().getTime() / 1000);
            let path = pathname;
            const list = rules;
            if (list && list.length > 0)
                list.forEach(rule => {
                    if (rule instanceof Array && rule.length > 1) {
                        const pattern = new RegExp(rule[0]);
                        if (url.match(pattern))
                            path = rule[1];
                    }
                });
            return { req_content: 'ticket,path,timestamp', sign_data: `ticket=${ticket}&path=${path}&timestamp=${timestamp}`, timestamp };
        }
        catch (error) {
            this.emit('error', { error, name: 'request process sign data fail' });
            return { req_content: '', sign_data: '' };
        }
    }
    readSignature(pathname, ticket) {
        try {
            const cached = this.signatures[pathname];
            if (!cached || cached.ticket !== ticket || new this.context.Date().getTime() >= cached.timeout)
                return null;
            if (cached.signStr)
                return { signStr: cached.signStr, algoType: cached.algoType };
        }
        catch { }
        return null;
    }
    writeSignature(pathname, ticket, signStr, algoType) {
        try {
            const now = new this.context.Date().getTime();
            this.signatures[pathname] = { timeout: now + this.ttl, signStr, ticket, createTime: now, algoType };
        }
        catch { }
    }
}
//# sourceMappingURL=desktop-web-secure-request.js.map