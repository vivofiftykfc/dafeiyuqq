const publicKeys = new Map();
export class DesktopWebSecureSystemCrypto {
    subtle;
    constructor(subtle = globalThis.crypto.subtle) {
        this.subtle = subtle;
    }
    generateNewKeyPairPEM = () => this.run('generateNewKeyPairPEM', async () => {
        const pair = await this.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
        const privatePem = pem(await this.subtle.exportKey('pkcs8', pair.privateKey), 'PRIVATE KEY');
        const publicPem = pem(await this.subtle.exportKey('spki', pair.publicKey), 'PUBLIC KEY');
        return { publicPem, privatePem };
    });
    signWithECDSA = (privatePem, text) => this.run('signWithECDSA', async () => {
        const key = await this.subtle.importKey('pkcs8', unpem(privatePem), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
        const raw = await this.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(text));
        const buffer = desktopWebSecureSignatureDer(raw);
        return { hex: hex(buffer), buffer };
    });
    verifyWithECDSA = (publicPem, rawSignature, text) => this.run('verifyWithECDSA', async () => {
        const key = await this.subtle.importKey('spki', unpem(publicPem), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
        return this.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, rawSignature, new TextEncoder().encode(text));
    });
    async validateKeyPair(privatePem, publicPem) {
        try {
            const privateKey = await this.subtle.importKey('pkcs8', unpem(privatePem), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
            const publicKey = await this.subtle.importKey('spki', unpem(publicPem), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
            const challenge = new TextEncoder().encode('douyin-im:web-secure:key-pair-check');
            const signature = await this.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, challenge);
            return await this.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, signature, challenge);
        }
        catch {
            return false;
        }
    }
    async hmacSha256(key, text) {
        const imported = await this.subtle.importKey('raw', key.length ? key : new Uint8Array(64), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        const bytes = new Uint8Array(await this.subtle.sign('HMAC', imported, legacySha256Text(text)));
        return btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''));
    }
    extractPublicKeyHexFromPem = (publicPem) => this.run('extractPublicKeyHexFromPem', async () => {
        const cached = publicKeys.get(publicPem);
        if (cached)
            return cached;
        const key = await this.subtle.importKey('spki', unpem(publicPem), { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify']);
        const buffer = await this.subtle.exportKey('spki', key), result = { hex: hex(buffer), rawHex: rawPublicHex(buffer) };
        publicKeys.set(publicPem, result);
        return result;
    });
    extractPublicKeyFromPrivateKey = (privatePem) => this.run('extractPublicKeyFromPrivateKey', async () => {
        const key = await this.subtle.importKey('pkcs8', unpem(privatePem), { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
        const jwk = await this.subtle.exportKey('jwk', key);
        const publicKey = await this.subtle.importKey('jwk', { kty: 'EC', crv: jwk.crv, x: jwk.x, y: jwk.y }, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify']);
        const buffer = await this.subtle.exportKey('spki', publicKey);
        return { hex: hex(buffer), rawHex: rawPublicHex(buffer), buffer };
    });
    extractPrivateKeyHexFromPem = (privatePem) => this.run('extractPrivateKeyHexFromPem', async () => {
        const key = await this.subtle.importKey('pkcs8', unpem(privatePem), { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
        const buffer = await this.subtle.exportKey('pkcs8', key), outer = children(new Uint8Array(buffer));
        const inner = children(value(required(outer, 2, 4))), scalar = required(inner, 1, 4);
        return { privateKeyHex: hex(value(scalar)), privateKeyPKCSHex: hex(buffer) };
    });
    extractPublicKeyFromX509Cert = (certificatePem) => this.run('extractPublicKeyFromX509Cert', () => this.certificatePublicKey(certificatePem));
    deriveEcdhKey = (privatePem, certificatePem) => this.run('deriveEcdhKey', async () => {
        const privateKey = await this.subtle.importKey('pkcs8', unpem(privatePem), { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
        const spki = await this.certificatePublicKey(certificatePem);
        const publicKey = await this.subtle.importKey('spki', spki, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
        const shared = await this.subtle.deriveBits({ name: 'ECDH', public: publicKey }, privateKey, 256);
        const hkdfKey = await this.subtle.importKey('raw', shared, 'HKDF', false, ['deriveBits']);
        const bytes = new Uint8Array(await this.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(), info: new Uint8Array() }, hkdfKey, 256));
        return { hex: hex(bytes), bytes };
    });
    async certificatePublicKey(certificatePem) {
        const outer = children(unpem(certificatePem)), tbs = required(outer, 0, 0x30);
        const spki = required(children(tbs.bytes.slice(tbs.start, tbs.end)), 6, 0x30);
        const key = await this.subtle.importKey('spki', spki.bytes.slice(spki.start, spki.end), { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify']);
        return new Uint8Array(await this.subtle.exportKey('spki', key));
    }
    async run(name, operation) {
        try {
            return await operation();
        }
        catch (error) {
            const original = error, wrapped = new Error(`[Func ${name}]${original.message}`);
            if (original.stack)
                wrapped.stack = original.stack;
            throw wrapped;
        }
    }
}
export function desktopWebSecureSignatureDer(raw) {
    const bytes = new Uint8Array(raw);
    if (bytes.length !== 64)
        throw new Error('Expected a 64-byte P-256 P1363 signature');
    const integer = (part) => {
        let start = 0;
        while (start < part.length && part[start] === 0)
            start++;
        const value = start === part.length ? [0] : Array.from(part.slice(start));
        if (value[0] & 0x80)
            value.unshift(0);
        return [2, value.length, ...value];
    };
    const encoded = [...integer(bytes.slice(0, 32)), ...integer(bytes.slice(32))];
    return Uint8Array.from([0x30, encoded.length, ...encoded]).buffer;
}
function hex(buffer) {
    return Array.from(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('');
}
function pem(buffer, label) {
    return `-----BEGIN ${label}-----\n${btoa(Array.from(new Uint8Array(buffer), byte => String.fromCharCode(byte)).join(''))}\n-----END ${label}-----`;
}
function unpem(text) {
    const binary = atob(text.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '')
        .replace(/-----BEGIN PUBLIC KEY-----/, '').replace(/-----END PUBLIC KEY-----/, '')
        .replace(/-----BEGIN CERTIFICATE-----/, '').replace(/-----END CERTIFICATE-----/, '').replace(/\s+/g, ''));
    return Uint8Array.from(binary, character => character.charCodeAt(0));
}
function read(bytes, start, limit = bytes.length) {
    let cursor = start;
    if (cursor + 2 > limit)
        throw new Error('Truncated DER header');
    const tag = bytes[cursor++], first = bytes[cursor++];
    let length = first;
    if (first & 128) {
        const count = first & 127;
        if (!count || count > 4 || cursor + count > limit)
            throw new Error('Invalid DER length');
        length = 0;
        for (let i = 0; i < count; i++)
            length = length * 256 + bytes[cursor++];
    }
    if (cursor + length > limit)
        throw new Error('Truncated DER value');
    return { bytes, tag, start, content: cursor, end: cursor + length };
}
function children(bytes) {
    const parent = read(bytes, 0);
    if (parent.tag !== 0x30 || parent.end !== bytes.length)
        throw new Error('Expected DER sequence');
    const result = [];
    for (let cursor = parent.content; cursor < parent.end;) {
        const child = read(bytes, cursor, parent.end);
        result.push(child);
        cursor = child.end;
    }
    return result;
}
function required(values, index, tag) {
    const item = values[index];
    if (!item || item.tag !== tag)
        throw new Error('Unexpected DER structure');
    return item;
}
function value(item) { return item.bytes.slice(item.content, item.end); }
function rawPublicHex(buffer) {
    const point = value(required(children(new Uint8Array(buffer)), 1, 3));
    if (point[0] !== 0 || point[1] !== 4)
        throw new Error('Expected uncompressed EC public key');
    return hex(point.slice(1));
}
function legacySha256Text(text) {
    if (typeof text !== 'string')
        throw new Error('input is invalid type');
    const bytes = [];
    for (let i = 0; i < text.length; i++) {
        let code = text.charCodeAt(i);
        if (code < 0x80)
            bytes.push(code);
        else if (code < 0x800)
            bytes.push(0xc0 | (code >>> 6), 0x80 | (code & 63));
        else if (code < 0xd800 || code >= 0xe000)
            bytes.push(0xe0 | (code >>> 12), 0x80 | ((code >>> 6) & 63), 0x80 | (code & 63));
        else {
            code = 0x10000 + (((code & 1023) << 10) | (text.charCodeAt(++i) & 1023));
            bytes.push(0xf0 | (code >>> 18), 0x80 | ((code >>> 12) & 63), 0x80 | ((code >>> 6) & 63), 0x80 | (code & 63));
        }
    }
    return Uint8Array.from(bytes);
}
//# sourceMappingURL=desktop-web-secure-crypto.js.map