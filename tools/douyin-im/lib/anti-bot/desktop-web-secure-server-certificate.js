export const DESKTOP_WEB_SECURE_SERVER_CERTIFICATE_KEY = 'security-sdk/s_sdk_server_cert_key';
export class DesktopWebSecureServerCertificates {
    context;
    pending;
    constructor(context) {
        this.context = context;
    }
    get = (aid, useCache = true) => {
        if (!this.pending) {
            this.pending = new Promise((resolve, reject) => {
                this.readOrFetch(aid, useCache).then(resolve).catch(reject).finally(() => { this.pending = undefined; });
            });
        }
        return this.pending;
    };
    readOrFetch(aid, useCache) {
        const now = this.context.Date.now();
        try {
            if (useCache) {
                const text = this.context.localStorage.getItem(DESKTOP_WEB_SECURE_SERVER_CERTIFICATE_KEY);
                if (text && typeof text === 'string') {
                    const cached = JSON.parse(text);
                    if (cached.createdTime + 86_400_000 > now)
                        return Promise.resolve({ cert: cached.cert, sn: cached.sn });
                }
            }
            return this.requestWithTimeout(aid).then(response => {
                const { data = {} } = (response || {});
                const { server_cert: cert = '', server_sn: sn = '' } = data;
                if (!cert || !sn)
                    return Promise.reject(new Error('get empty cert'));
                this.context.localStorage.setItem(DESKTOP_WEB_SECURE_SERVER_CERTIFICATE_KEY, JSON.stringify({ cert, sn, createdTime: this.context.Date.now() }));
                return { cert, sn };
            });
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
    async requestWithTimeout(aid) {
        const timeout = new Promise((_resolve, reject) => {
            this.context.setTimeout(() => reject(new Error('get cert timeout')), 3000);
        });
        void timeout.catch(() => undefined);
        return Promise.race([timeout, this.request(aid)]);
    }
    request(aid) {
        if (!this.context.window.XMLHttpRequest || !this.context.window.FormData)
            return Promise.reject(new Error('not support XMLHttpRequest'));
        const xhr = new this.context.XMLHttpRequest();
        return new Promise((resolve, reject) => {
            xhr.open('POST', `/passport/ticket_guard/get_client_cert/?aid=${aid}&is_from_ttaccountsdk=1`);
            xhr.onreadystatechange = () => {
                if (xhr.readyState !== 4 || !(xhr.status >= 200 && xhr.status < 300))
                    return;
                try {
                    const response = JSON.parse(xhr.response);
                    if (response.message !== 'success')
                        reject(new Error(response?.data?.description || response.message || 'get cert error'));
                    resolve(response);
                }
                catch (error) {
                    reject(error);
                }
            };
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.send(`server_data=1,aid=${encodeURIComponent(String(aid))}`);
        });
    }
}
//# sourceMappingURL=desktop-web-secure-server-certificate.js.map