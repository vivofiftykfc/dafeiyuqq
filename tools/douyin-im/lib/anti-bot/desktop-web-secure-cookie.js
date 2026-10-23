import { DesktopWebSecureEvents } from './desktop-web-secure-events.js';
export function createDesktopWebSecureCookieDigest(keyText, certificate, serverData) {
    try {
        if (!keyText || !certificate || !serverData || typeof keyText !== 'string' || typeof serverData !== 'string')
            return '';
        const publicKey = (JSON.parse(keyText) || {}).ec_publicKey;
        if (!publicKey)
            return '';
        return md5(JSON.stringify({ publicKey, cert: certificate, serverData }));
    }
    catch {
        return '';
    }
}
export function verifyDesktopWebSecureCookie(cookie, keyText, certificate, serverData) {
    if (!cookie)
        return false;
    const digest = createDesktopWebSecureCookieDigest(keyText, certificate, serverData);
    return digest !== '' && digest === cookie;
}
export function readDesktopWebSecureCookie(read, name) {
    try {
        const prefix = `${name}=`;
        for (const entry of read().split(';')) {
            const cookie = entry.trim();
            if (cookie.indexOf(prefix) === 0) {
                const value = cookie.substring(prefix.length);
                if (value.length > 0)
                    return decodeURIComponent(value);
            }
        }
    }
    catch { }
    return '';
}
export function desktopWebSecureCookieDomain(readHostname) {
    try {
        const hostname = readHostname();
        if (/^(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])$/.test(hostname) || hostname === 'localhost')
            return readHostname().replace(/^.*?\b\.\b/, '');
        const labels = hostname.split('.'), result = [labels.pop()];
        let domain = '';
        while (result.length < 2) {
            result.unshift(labels.pop());
            domain = result.join('.');
        }
        return domain || readHostname();
    }
    catch {
        return readHostname();
    }
}
export class DesktopWebSecureCookieOperator extends DesktopWebSecureEvents {
    document;
    constructor(document) {
        super();
        this.document = document;
    }
    getCookie = (name) => {
        try {
            const escaped = encodeURIComponent(name).replace(/[-.+*]/g, '\\$&');
            return decodeURIComponent(this.document.cookie.replace(new RegExp(`(?:(?:^|.*;)\\s*${escaped}\\s*\\=\\s*([^;]*).*$)|^.*$`), '$1')) || null;
        }
        catch (error) {
            this.emit('error', { error, name: 'cookie get item error' });
        }
        return null;
    };
    setCookie = (name, value, path, domain, maxAge, secure) => {
        try {
            if (!name || /^(?:expires|max-age|path|domain|secure)$/i.test(name))
                return false;
            this.document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}${maxAge ? `; max-age=${maxAge}` : ''}${domain ? `; domain=${domain}` : ''}${path ? `; path=${path}` : ''}${secure ? '; secure' : ''}`;
            return true;
        }
        catch (error) {
            this.emit('error', { error, name: 'cookie set item error' });
        }
        return false;
    };
    setCookieNoTimeout = (name, value) => { this.setCookie(name, value, '/'); };
    setCookieWithMaxAge = (name, value) => { this.setCookie(name, value, '/', undefined, 5184000); };
    setCookieWithDomain = (name, value) => { this.setCookie(name, value, '/', desktopWebSecureCookieDomain(() => this.document.location.hostname), 5184000); };
    deleteCookie = (name, path, domain) => {
        if (!name || !this.hasCookie(name))
            return false;
        this.document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 UTC${domain ? `; domain=${domain}` : ''}${path ? `; path=${path}` : ''}`;
        return true;
    };
    deleteAllCookie = (name) => {
        const domain = desktopWebSecureCookieDomain(() => this.document.location.hostname), hostname = this.document.location.hostname;
        this.deleteCookie(name, '/', domain);
        this.deleteCookie(name, '/', hostname);
        this.deleteCookie(name, '/');
    };
    hasCookie = (name) => new RegExp(`(?:^|;\\s*)${encodeURIComponent(name).replace(/[-.+*]/g, '\\$&')}\\s*\\=`).test(this.document.cookie);
    getCookieKeys = () => {
        const keys = this.document.cookie.replace(/((?:^|\s*;)[^=]+)(?=;|$)|^\s*|\s*(?:=[^;]*)?(?:\1|$)/g, '').split(/\s*(?:=[^;]*)?;\s*/), result = [];
        for (const key of keys)
            if (key)
                result.push(decodeURIComponent(key));
        return result;
    };
}
function md5(text) {
    const input = new TextEncoder().encode(text), size = Math.ceil((input.length + 9) / 64) * 64;
    const bytes = new Uint8Array(size);
    bytes.set(input);
    bytes[input.length] = 0x80;
    const view = new DataView(bytes.buffer);
    view.setUint32(size - 8, (input.length * 8) >>> 0, true);
    view.setUint32(size - 4, Math.floor(input.length / 0x20000000), true);
    const shifts = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    for (let offset = 0; offset < size; offset += 64) {
        let a = a0, b = b0, c = c0, d = d0;
        for (let i = 0; i < 64; i++) {
            let f, word;
            if (i < 16) {
                f = (b & c) | (~b & d);
                word = i;
            }
            else if (i < 32) {
                f = (d & b) | (~d & c);
                word = (5 * i + 1) % 16;
            }
            else if (i < 48) {
                f = b ^ c ^ d;
                word = (3 * i + 5) % 16;
            }
            else {
                f = c ^ (b | ~d);
                word = (7 * i) % 16;
            }
            const sum = (a + f + Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) + view.getUint32(offset + word * 4, true)) | 0;
            const shift = shifts[Math.floor(i / 16) * 4 + i % 4];
            a = d;
            d = c;
            c = b;
            b = (b + ((sum << shift) | (sum >>> (32 - shift)))) | 0;
        }
        a0 = (a0 + a) | 0;
        b0 = (b0 + b) | 0;
        c0 = (c0 + c) | 0;
        d0 = (d0 + d) | 0;
    }
    return [a0, b0, c0, d0].map(word => [0, 8, 16, 24].map(shift => ((word >>> shift) & 255).toString(16).padStart(2, '0')).join('')).join('');
}
//# sourceMappingURL=desktop-web-secure-cookie.js.map