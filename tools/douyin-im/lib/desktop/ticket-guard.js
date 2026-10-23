import { createECDH, createHash, createHmac, createPrivateKey, diffieHellman, hkdfSync, sign, X509Certificate, } from 'node:crypto';
import { DESKTOP_APP_VERSION } from './constants.js';
import { desktopTicketPolicy, ticketSessionPathMatches } from './ticket-guard-config.js';
const PREFIX = 'bd-ticket-guard-';
export class DesktopTicketGuard {
    #privateKey;
    #privateScalar;
    #publicKey;
    #requests = new WeakMap();
    #clientCert = '';
    #serverCert = '';
    #serverSn = '';
    #hmacKey;
    #binding;
    #policy;
    constructor(state, settings) {
        if (state && state.version !== 1)
            throw new Error('Unsupported Desktop ticket guard state');
        this.#policy = desktopTicketPolicy(settings, state?.sessionConfig);
        const ec = createECDH('prime256v1');
        if (state) {
            const scalar = decodeBase64(state.privateKey);
            if (scalar.length !== 32)
                throw new Error('Invalid Desktop ticket guard key');
            ec.setPrivateKey(scalar);
        }
        else
            ec.generateKeys();
        const point = ec.getPublicKey(undefined, 'uncompressed');
        const scalar = Buffer.alloc(32);
        const rawScalar = ec.getPrivateKey();
        rawScalar.copy(scalar, 32 - rawScalar.length);
        this.#privateScalar = scalar.toString('base64');
        this.#publicKey = point.toString('base64');
        this.#privateKey = createPrivateKey({
            format: 'jwk',
            key: {
                kty: 'EC', crv: 'P-256',
                d: scalar.toString('base64url'),
                x: point.subarray(1, 33).toString('base64url'),
                y: point.subarray(33).toString('base64url'),
            },
        });
        if (state) {
            this.updateCertificates(state.clientCert ?? '', state.serverCert ?? '', state.serverSn ?? '');
            if (state.binding) {
                if (!/^[a-f0-9]{64}$/.test(state.binding.sessionHash) || typeof state.binding.tsSignRee !== 'string') {
                    throw new Error('Invalid Desktop ticket binding');
                }
                this.#binding = { ...state.binding };
            }
        }
    }
    exportState() {
        return {
            version: 1, privateKey: this.#privateScalar,
            sessionConfig: structuredClone(this.#policy.session),
            ...(this.#clientCert ? { clientCert: this.#clientCert } : {}),
            ...(this.#serverCert ? { serverCert: this.#serverCert } : {}),
            ...(this.#serverSn ? { serverSn: this.#serverSn } : {}),
            ...(this.#binding ? { binding: { ...this.#binding } } : {}),
        };
    }
    hasBinding(sessionId) {
        return !!this.#binding?.tsSignRee && this.matchesCachedSession(sessionId);
    }
    matchesCachedSession(sessionId) {
        return !!sessionId && this.#binding?.sessionHash === sessionHash(sessionId);
    }
    needsCertificate() {
        return this.#policy.enabled && (!this.#serverCert || !this.#serverSn);
    }
    requiresTicket(url) {
        return this.eligible(url) && ticketSessionPathMatches(this.#policy.session, url.pathname);
    }
    eligible(url) {
        return this.#policy.enabled && url.protocol === 'https:' && url.hostname === 'imdesktop.douyin.com';
    }
    acceptCertificateResponse(response) {
        const outer = record(response);
        const data = record(outer?.['data']);
        if (outer?.['message'] !== 'success' || !data)
            throw new Error('Desktop certificate request failed');
        const client = string(data['cert']);
        const server = string(data['server_cert']);
        const sn = string(data['server_sn']);
        this.updateCertificates(Buffer.from(client).toString('base64'), server, sn);
    }
    prepare(url, sessionId, sessionSS = '', timestamp = Math.floor(Date.now() / 1000), symmetric = this.#policy.session.ree_enable_symmetric === true) {
        const headers = {};
        const eligible = this.eligible(url);
        const getTicket = eligible && url.pathname.startsWith('/passport/');
        const useTicket = this.requiresTicket(url) && !!(sessionId || sessionSS);
        if (getTicket || useTicket) {
            headers[`${PREFIX}version`] = '2';
            headers[`${PREFIX}iteration-version`] = '2';
            headers[`${PREFIX}ree-public-key`] = this.#publicKey;
            if (getTicket && symmetric)
                headers[`${PREFIX}server-cert-sn`] = this.#serverSn || '0';
        }
        if (useTicket) {
            const primaryMatches = this.#binding ? this.matchesCachedSession(sessionId) : sessionId === '';
            const ticket = primaryMatches ? sessionId : sessionSS;
            const content = ticketSignContent(ticket, url.pathname, timestamp);
            if (symmetric && !this.#hmacKey && this.#serverCert)
                this.#hmacKey = this.deriveHmacKey(this.#serverCert);
            const hmac = symmetric && this.#hmacKey;
            const signature = hmac
                ? createHmac('sha256', hmac).update(content).digest('base64')
                : sign('sha256', Buffer.from(content), { key: this.#privateKey, dsaEncoding: 'der' }).toString('base64');
            if (hmac)
                headers[`${PREFIX}iteration-version`] = '3';
            headers[`${PREFIX}client-data`] = Buffer.from(JSON.stringify({
                req_content: 'ticket,path,timestamp', req_sign_ree: signature, timestamp,
                ts_sign_ree: this.#binding?.tsSignRee ?? '',
            })).toString('base64');
        }
        const request = { headers: Object.freeze(headers),
            ...(useTicket && !this.#binding?.tsSignRee ? { useTicketErrorCode: 4 } : {}),
        };
        this.#requests.set(request, { eligible, bindSession: getTicket && this.#policy.session.enable === true });
        return request;
    }
    acceptResponse(request, headers, newSessionId) {
        const context = this.#requests.get(request);
        this.#requests.delete(request);
        if (!context?.eligible)
            return false;
        let changed = false;
        const encoded = headers.get(`${PREFIX}server-data`);
        if (context.bindSession && encoded && encoded.length <= 65_536 && newSessionId) {
            try {
                const data = record(JSON.parse(decodeBase64(encoded).toString('utf8')));
                const items = Array.isArray(data?.['tickets']) ? data['tickets'] : [data];
                for (const item of items) {
                    const ticket = record(item);
                    if (ticket?.['ticket'] === newSessionId) {
                        this.#binding = { sessionHash: sessionHash(newSessionId), tsSignRee: string(ticket['ts_sign_ree']) };
                        changed = true;
                    }
                }
            }
            catch { }
        }
        const client = headers.get(`${PREFIX}client-cert`) ?? '';
        const server = headers.get(`${PREFIX}server-cert`) ?? '';
        if (client || server) {
            this.updateCertificates(client, server, '');
            changed = true;
        }
        return changed;
    }
    updateCertificates(client, server, sn) {
        if (client.startsWith('-----'))
            throw new Error('Desktop client certificate must be Base64 encoded');
        if (client)
            this.#clientCert = client;
        let pem = server;
        let derived;
        if (pem) {
            if (!pem.startsWith('-----'))
                pem = decodeBase64(pem).toString('utf8');
            if (!pem.startsWith('-----BEGIN CERTIFICATE-----'))
                throw new Error('Invalid Desktop server certificate');
            derived = this.deriveHmacKey(pem);
        }
        if (pem && derived) {
            this.#serverCert = pem;
            if (this.#policy.session.ree_enable_symmetric === true)
                this.#hmacKey ??= derived;
        }
        if (sn)
            this.#serverSn = sn;
    }
    deriveHmacKey(pem) {
        const publicKey = new X509Certificate(pem).publicKey;
        if (publicKey.asymmetricKeyType !== 'ec' || publicKey.asymmetricKeyDetails?.namedCurve !== 'prime256v1') {
            throw new Error('Desktop server certificate must use P-256');
        }
        const shared = diffieHellman({ privateKey: this.#privateKey, publicKey });
        return Buffer.from(hkdfSync('sha256', shared, Buffer.alloc(0), Buffer.alloc(0), 32));
    }
}
export function ticketSignContent(ticket, path, timestamp) {
    if (!path.startsWith('/') || path.includes('?') || path.includes('#'))
        throw new Error('Ticket guard requires a pathname');
    if (!Number.isSafeInteger(timestamp) || timestamp < 0)
        throw new Error('Invalid ticket guard timestamp');
    return `ticket=${ticket}&path=${path.endsWith('/') ? path : `${path}/`}&timestamp=${timestamp}`;
}
export function desktopCertificateRequest(deviceId, installId) {
    const query = new URLSearchParams({
        aid: '339757', is_from_ttaccountsdk: '1', device_id: deviceId, iid: installId,
        version_code: DESKTOP_APP_VERSION, device_platform: 'PC',
    });
    return {
        url: `https://imdesktop.douyin.com/passport/ticket_guard/get_client_cert/?${query}`,
        init: { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'server_data=1' },
    };
}
function sessionHash(session) {
    return createHash('sha256').update(session).digest('hex');
}
function record(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : undefined;
}
function string(value) { return typeof value === 'string' ? value : ''; }
function decodeBase64(value) {
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
        throw new Error('Invalid ticket guard Base64');
    }
    return Buffer.from(value, 'base64');
}
//# sourceMappingURL=ticket-guard.js.map