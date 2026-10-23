export function createDesktopDTraitCryptoUtil(context) {
    const parseQuery = (text) => {
        if (!text)
            return {};
        const result = {};
        (text.indexOf('?') === 0 ? text.slice(1) : text)
            .split('&')
            .forEach(pair => {
            const [name, value = ''] = pair.split('=');
            result[name] = decodeURIComponent(value);
        });
        return result;
    };
    const getQuery = (url) => {
        if (!url)
            return parseQuery(context.location.search.slice(1));
        const parts = url.split('?');
        if (parts.length < 2)
            return {};
        return parseQuery(parts[parts.length - 1].split('#')[0]);
    };
    return {
        parseQuery,
        getQuery,
        isSupportSystemCrypto: () => !getQuery()['disableSystemCrypto'] &&
            Boolean(context.window.crypto?.subtle),
        bufferConcat: (values) => {
            const result = new Uint8Array(values.reduce((sum, value) => sum + value.byteLength, 0));
            let offset = 0;
            for (const value of values) {
                result.set(new Uint8Array(value), offset);
                offset += value.byteLength;
            }
            return result;
        },
        buff2base64: (value) => context.btoa(String.fromCharCode(...value)),
        base642buff: (value) => {
            const text = context.atob(value);
            return Uint8Array.from(text, char => char.charCodeAt(0));
        },
        hexToUint8Array: (value) => new Uint8Array(value.match(/.{2}/g).map(pair => parseInt(pair, 16))),
        uint8ArrayToHex: (value) => {
            let text = '';
            value.forEach(byte => {
                text += byte.toString(16).padStart(2, '0');
            });
            return text;
        },
        unit8ArrayToString: (value) => {
            let text = '';
            for (const byte of value)
                text += String.fromCharCode(byte);
            return text;
        },
        getRandomValues: (value) => {
            if (context.window.crypto?.getRandomValues)
                context.window.crypto.getRandomValues(value);
            else
                for (let i = 0; i < value.length; i++)
                    value[i] = (4294967296 * context.Math.random()) | 0;
            return value;
        },
    };
}
export class DesktopDTraitAes {
    context;
    supportSystemCrypto = false;
    cryptoJS = null;
    initPromise;
    util;
    constructor(context) {
        this.context = context;
        this.util = createDesktopDTraitCryptoUtil(context);
        this.initPromise = this.init();
        observe(context, this.initPromise);
    }
    init = async () => {
        if (!this.util.isSupportSystemCrypto()) {
            this.supportSystemCrypto = false;
            this.cryptoJS = await this.context.loadCryptoJS();
        }
        else
            this.supportSystemCrypto = true;
        return Promise.resolve(true);
    };
    getIv = (length = 16) => this.util.getRandomValues(new Uint8Array(length));
    getAesKey = () => this.util.getRandomValues(new Uint8Array(16));
    encryptData = async (hexKey, text) => {
        const iv = this.getIv();
        if (this.supportSystemCrypto)
            return await this.encryptDataWithLocal(hexKey, text, iv);
        await this.initPromise;
        return await this.encryptDataWithCryptoJS(this.util.hexToUint8Array(hexKey), text, iv);
    };
    encryptDataWithLocal = async (hexKey, text, iv) => {
        const key = await this.context.crypto.subtle.importKey('raw', this.util.hexToUint8Array(hexKey), { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']);
        const input = new this.context.TextEncoder().encode(text);
        const encrypted = new Uint8Array(await this.context.crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, input));
        return {
            cipherText: this.util.buff2base64(this.util.bufferConcat([iv, encrypted])),
            encryptedData: this.util.buff2base64(encrypted),
            iv: this.util.buff2base64(iv),
        };
    };
    encryptDataWithCryptoJS = async (key, text, iv) => {
        if (!this.cryptoJS)
            await this.initPromise;
        const js = this.cryptoJS, ivWords = js.lib.WordArray.create(iv), keyWords = js.lib.WordArray.create(key), textWords = js.lib.WordArray.create(new this.context.TextEncoder().encode(text));
        const encrypted = js.AES.encrypt(textWords, keyWords, {
            iv: ivWords,
            mode: js.mode.CBC,
            padding: js.pad.Pkcs7,
        }).ciphertext.toString(js.enc.Base64);
        return {
            cipherText: this.util.buff2base64(this.util.bufferConcat([iv, this.util.base642buff(encrypted)])),
            encryptedData: encrypted,
            iv: this.util.buff2base64(iv),
        };
    };
}
export class DesktopDTraitRsa {
    context;
    supportSystemCrypto = false;
    JSEncrypt = null;
    initPromise;
    constructor(context) {
        this.context = context;
        this.initPromise = this.init();
        observe(context, this.initPromise);
    }
    init = async () => this.context.loadJSEncrypt().then(module => {
        this.JSEncrypt = module.default;
        return true;
    });
    encryptData = async (publicKey, text) => {
        await this.initPromise;
        if (!this.JSEncrypt)
            return '';
        const cipher = new this.JSEncrypt();
        cipher.setPublicKey(publicKey);
        const result = cipher.encrypt(text);
        return result === false ? '' : result;
    };
}
const installed = new WeakMap();
export function installDesktopDTraitCrypto(context, target) {
    const previous = installed.get(target);
    if (previous)
        return previous;
    const aes = new DesktopDTraitAes(context);
    target['DTraitUcAesEncrypt'] = aes;
    const rsa = new DesktopDTraitRsa(context);
    target['DTraitUcRsaEncrypt'] = rsa;
    const util = createDesktopDTraitCryptoUtil(context);
    target['DTraitUcCryptoJSUtil'] = util;
    const result = { aes, rsa, util };
    installed.set(target, result);
    return result;
}
function observe(context, task) {
    void task.catch(error => {
        try {
            context.onBackgroundError?.(error);
        }
        catch {
        }
    });
}
//# sourceMappingURL=desktop-dtrait-crypto.js.map