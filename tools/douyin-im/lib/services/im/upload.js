import { createHash, createHmac, randomBytes } from 'crypto';
import { desktopFingerprintParams, } from './desktop.js';
import { sniffImageFormat } from './media.js';
const UPLOAD_CONFIG_URL = 'https://www.douyin.com/aweme/v1/web/im/upload/config/v2';
const VOD_URL = 'https://vod.bytedanceapi.com/';
const VOD_REGION = 'cn-north-1';
const VOD_SERVICE = 'vod';
const VIDEO_PART_SIZE = 5 * 1024 * 1024;
export function uploadProcessFunctions(fileType, imageFormat) {
    if (fileType === 'object')
        return [];
    if (fileType === 'video') {
        return [{
                name: 'Encryption',
                input: {
                    Config: { copies: 'cipher_v2', aes_chunk_size: '524288' },
                    PolicyParams: { 'policy-set': 'medium' },
                },
            }];
    }
    return [{
            name: 'Encryption',
            input: {
                Config: { copies: 'cipher_v2' },
                PolicyParams: imageFormat === 'gif'
                    ? { 'policy-set': 'still', 'still-width': '480', 'still-height': '480' }
                    : { 'policy-set': 'check,thumb,medium,large' },
            },
        }];
}
function hashHex(data) {
    return createHash('sha256').update(data).digest('hex');
}
function hmac(key, value) {
    return createHmac('sha256', key).update(value).digest();
}
function rfc3986(value) {
    return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}
export function canonicalUploadQuery(query) {
    return Object.keys(query)
        .sort()
        .map((key) => `${rfc3986(key)}=${rfc3986(query[key])}`)
        .join('&');
}
export function signVodRequest(options) {
    const canonicalQuery = canonicalUploadQuery(options.query);
    const amzDate = options.date.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = hashHex(options.body ?? new Uint8Array());
    const headers = {
        'x-amz-date': amzDate,
        'x-amz-security-token': options.credentials.sessionToken,
    };
    if (options.method === 'POST')
        headers['x-amz-content-sha256'] = payloadHash;
    const headerNames = Object.keys(headers).sort();
    const canonicalHeaders = headerNames.map((name) => `${name}:${headers[name]}\n`).join('');
    const signedHeaders = headerNames.join(';');
    const canonicalRequest = [
        options.method, '/', canonicalQuery, canonicalHeaders, signedHeaders, payloadHash,
    ].join('\n');
    const scope = `${dateStamp}/${VOD_REGION}/${VOD_SERVICE}/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${hashHex(canonicalRequest)}`;
    let signingKey = hmac(`AWS4${options.credentials.secretAccessKey}`, dateStamp);
    signingKey = hmac(signingKey, VOD_REGION);
    signingKey = hmac(signingKey, VOD_SERVICE);
    signingKey = hmac(signingKey, 'aws4_request');
    const signature = hmac(signingKey, stringToSign).toString('hex');
    return {
        canonicalQuery,
        headers,
        authorization: `AWS4-HMAC-SHA256 Credential=${options.credentials.accessKeyId}/${scope}, ` +
            `SignedHeaders=${signedHeaders}, Signature=${signature}`,
    };
}
let crcTable;
function table() {
    if (crcTable)
        return crcTable;
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
        let c = n;
        for (let k = 0; k < 8; k += 1)
            c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        crcTable[n] = c >>> 0;
    }
    return crcTable;
}
export function crc32Hex(data) {
    let crc = 0xffffffff;
    const values = table();
    for (const byte of data)
        crc = values[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
}
function randomId(length) {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return [...randomBytes(length)].map((byte) => alphabet[byte % alphabet.length]).join('');
}
function imageDimensions(data) {
    const b = Buffer.from(data);
    if (b.length >= 24 && b.subarray(1, 4).toString() === 'PNG') {
        return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
    }
    if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
        let pos = 2;
        while (pos + 9 < b.length) {
            if (b[pos] !== 0xff) {
                pos += 1;
                continue;
            }
            const marker = b[pos + 1];
            if (marker >= 0xc0 && marker <= 0xc3) {
                return { width: b.readUInt16BE(pos + 7), height: b.readUInt16BE(pos + 5) };
            }
            const size = b.readUInt16BE(pos + 2);
            if (size < 2)
                break;
            pos += 2 + size;
        }
    }
    if (b.length >= 10 && (b.subarray(0, 6).toString() === 'GIF87a' || b.subarray(0, 6).toString() === 'GIF89a')) {
        return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
    }
    return { width: 0, height: 0 };
}
function asRecord(value) {
    return value && typeof value === 'object' ? value : {};
}
export class ImMediaUploader {
    client;
    userId;
    fetcher;
    deviceId;
    guid;
    screenSize;
    constructor(client, userId, fetcher = globalThis.fetch, deviceId = userId, guid = '0', screenSize = { width: 1728, height: 1117 }) {
        this.client = client;
        this.userId = userId;
        this.fetcher = fetcher;
        this.deviceId = deviceId;
        this.guid = guid;
        this.screenSize = screenSize;
    }
    async uploadImage(data) {
        if (data.length === 0)
            throw new Error('cannot upload an empty image');
        const format = sniffImageFormat(data);
        if (format === 'unknown')
            throw new Error('unsupported image data');
        const credentials = await this.credentials();
        const address = await this.apply(credentials, credentials.spaceName, 'image', data.length);
        await this.putObject(address, data);
        const committed = await this.commit(credentials, address.sessionKey, 'image', format);
        const size = imageDimensions(data);
        return {
            oid: committed.uri,
            skey: committed.secretKey,
            md5: committed.sourceMd5,
            dataSize: committed.imageSize ?? data.length,
            width: committed.imageWidth ?? size.width,
            height: committed.imageHeight ?? size.height,
            format,
        };
    }
    async uploadVideo(data) {
        if (data.length === 0)
            throw new Error('cannot upload an empty video');
        const credentials = await this.credentials();
        const address = await this.apply(credentials, credentials.spaceName, 'video', data.length);
        const uploadId = await this.initParts(address);
        const parts = [];
        for (let offset = 0, part = 1; offset < data.length; offset += VIDEO_PART_SIZE, part += 1) {
            const chunk = data.slice(offset, Math.min(offset + VIDEO_PART_SIZE, data.length));
            const crc = crc32Hex(chunk);
            await this.transferPart(address, uploadId, part, crc, chunk);
            parts.push(`${part}:${crc}`);
        }
        await this.finishParts(address, uploadId, parts.join(','));
        const committed = await this.commit(credentials, address.sessionKey, 'video');
        return { tkey: committed.uri, skey: committed.secretKey, md5: committed.sourceMd5 };
    }
    async uploadFile(data, name) {
        if (!name.trim() || data.length === 0 || data.length > 10 * 1024 * 1024)
            throw new Error('file requires a name and 1 byte to 10 MiB of data');
        const credentials = await this.credentials('public_file_config');
        const address = await this.apply(credentials, credentials.spaceName, 'object', data.length);
        await this.putObject(address, data);
        const committed = await this.commit(credentials, address.sessionKey, 'object', undefined, address);
        return { uri: committed.uri, skey: committed.secretKey, md5: committed.sourceMd5, name, dataSize: data.length };
    }
    async credentials(configKey = 'public_image_config') {
        const deviceId = this.client.getDeviceId?.() ?? await this.deviceId();
        const params = desktopFingerprintParams(deviceId, this.guid, this.screenSize, this.client.getUserAgent());
        params.set('iid', this.client.getInstallId?.() ?? '0');
        const response = await this.fetcher(`${UPLOAD_CONFIG_URL}?${params}`, {
            headers: this.browserHeaders('https://www.douyin.com/'),
        });
        const json = asRecord(await response.json());
        const config = asRecord(json[configKey]);
        const credentials = {
            accessKeyId: String(config['access_key_id'] ?? ''),
            secretAccessKey: String(config['secret_access_key'] ?? ''),
            sessionToken: String(config['session_token'] ?? ''),
            spaceName: String(config['space_name'] ?? ''),
        };
        if (!response.ok || !credentials.accessKeyId || !credentials.secretAccessKey || !credentials.spaceName) {
            throw new Error(`upload credentials unavailable (HTTP ${response.status})`);
        }
        return credentials;
    }
    async apply(credentials, space, fileType, fileSize) {
        const query = {
            Action: 'ApplyUploadInner', Version: '2020-11-19', SpaceName: space,
            FileType: fileType, IsInner: '1', NeedFallback: 'true', FileSize: String(fileSize), s: randomId(11),
            ...(fileType === 'object' ? { OpenGcmEnc: 'true' } : {}),
        };
        const json = await this.signedVodJson('GET', query, undefined, credentials);
        const result = asRecord(json['Result']);
        const direct = asRecord(result['UploadAddress']);
        const directStores = direct['StoreInfos'];
        const directHosts = direct['UploadHosts'];
        const inner = asRecord(result['InnerUploadAddress']);
        const nodes = inner['UploadNodes'];
        if (!nodes?.length && directStores?.length && directHosts?.length && fileType !== 'object') {
            const store = asRecord(directStores[0]);
            return {
                storeUri: String(store['StoreUri'] ?? ''), authorization: String(store['Auth'] ?? ''),
                host: String(directHosts[0]), sessionKey: String(direct['SessionKey'] ?? ''),
            };
        }
        const node = asRecord(nodes?.[0]);
        const stores = node['StoreInfos'];
        const store = asRecord(stores?.[0]);
        const address = {
            storeUri: String(store['StoreUri'] ?? ''), authorization: String(store['Auth'] ?? ''),
            host: String(node['UploadHost'] ?? ''), sessionKey: String(node['SessionKey'] ?? ''),
            uploadHeaders: Object.fromEntries(Object.entries(asRecord(node['UploadHeader'])).map(([key, value]) => [key, String(value)])),
        };
        if (fileType === 'object') {
            address.gcmMode = String(asRecord(result['SDKParam'])['server_gcm_encryption_mode'] ?? '');
            address.encryptionKey = String(asRecord(inner['AdvanceOption'])['EncryptionKey'] ?? '');
            if (!address.gcmMode || !address.encryptionKey)
                throw new Error('VOD apply response missing file GCM parameters');
        }
        if (!address.storeUri || !address.authorization || !address.host || !address.sessionKey) {
            throw new Error('VOD apply response did not contain an upload address');
        }
        return address;
    }
    async putObject(address, data) {
        const response = await this.fetcher(`https://${address.host}/upload/v1/${address.storeUri}`, {
            method: 'POST', headers: {
                ...await this.storageHeaders(address.authorization, crc32Hex(data)),
                ...address.uploadHeaders,
                ...(address.gcmMode ? {
                    'X-Upload-Server-Gcm-Encryption-Mode': address.gcmMode,
                    'X-Upload-Server-Gcm-Encryption-Key': address.encryptionKey,
                } : {}),
            }, body: data,
        });
        const result = asRecord(await response.json());
        if (!response.ok || Number(result['code']) !== 2000)
            throw new Error(`TOS upload failed: ${result['message'] ?? response.status}`);
    }
    async initParts(address) {
        const boundary = `----WebKitFormBoundary${randomId(16)}`;
        const response = await this.fetcher(`https://${address.host}/upload/v1/${address.storeUri}?phase=init`, {
            method: 'POST',
            headers: { ...(await this.storageHeaders(address.authorization)), 'Content-Type': `multipart/form-data; boundary=${boundary}` },
            body: `--${boundary}--\r\n`,
        });
        const result = asRecord(await response.json());
        const uploadId = String(asRecord(result['data'])['uploadid'] ?? '');
        if (!response.ok || Number(result['code']) !== 2000 || !uploadId)
            throw new Error('TOS multipart init failed');
        return uploadId;
    }
    async transferPart(address, uploadId, part, crc, data) {
        const query = new URLSearchParams({ uploadid: uploadId, part_number: String(part), phase: 'transfer' });
        const response = await this.fetcher(`https://${address.host}/upload/v1/${address.storeUri}?${query}`, {
            method: 'POST',
            headers: { ...(await this.storageHeaders(address.authorization, crc)), 'Content-Disposition': 'attachment; filename="undefined"' },
            body: data,
        });
        const result = asRecord(await response.json());
        if (!response.ok || Number(result['code']) !== 2000)
            throw new Error(`TOS part ${part} failed`);
    }
    async finishParts(address, uploadId, manifest) {
        const query = new URLSearchParams({ phase: 'finish', uploadid: uploadId });
        const response = await this.fetcher(`https://${address.host}/upload/v1/${address.storeUri}?${query}`, {
            method: 'POST', headers: { ...(await this.storageHeaders(address.authorization)), 'Content-Type': 'text/plain;charset=UTF-8' }, body: manifest,
        });
        const result = asRecord(await response.json());
        if (!response.ok || Number(result['code']) !== 2000)
            throw new Error('TOS multipart finish failed');
    }
    async commit(credentials, sessionKey, fileType, imageFormat, address) {
        const body = Buffer.from(JSON.stringify({
            SessionKey: sessionKey,
            Functions: uploadProcessFunctions(fileType, imageFormat),
            ...(address?.gcmMode ? { EncryptionMode: address.gcmMode, EncryptionKey: address.encryptionKey } : {}),
        }));
        const json = await this.signedVodJson('POST', {
            Action: 'CommitUploadInner', Version: '2020-11-19', SpaceName: credentials.spaceName,
        }, body, credentials);
        const results = asRecord(json['Result'])['Results'];
        const encryption = asRecord(asRecord(results?.[0])['Encryption']);
        const extra = asRecord(encryption['Extra']);
        const committed = {
            uri: String(encryption['Uri'] ?? ''), secretKey: String(encryption['SecretKey'] ?? ''),
            sourceMd5: String(encryption['SourceMd5'] ?? ''),
        };
        const imageSize = Number(extra['img_size']);
        const imageWidth = Number(extra['img_width']);
        const imageHeight = Number(extra['img_height']);
        if (Number.isFinite(imageSize) && imageSize > 0)
            committed.imageSize = imageSize;
        if (Number.isFinite(imageWidth) && imageWidth > 0)
            committed.imageWidth = imageWidth;
        if (Number.isFinite(imageHeight) && imageHeight > 0)
            committed.imageHeight = imageHeight;
        if (!committed.uri || !committed.secretKey)
            throw new Error('VOD commit response did not contain encryption metadata');
        return committed;
    }
    async signedVodJson(method, query, body, credentials) {
        const signed = signVodRequest({ method, query, ...(body ? { body } : {}), credentials, date: new Date() });
        const response = await this.fetcher(`${VOD_URL}?${signed.canonicalQuery}`, {
            method, headers: { ...signed.headers, Authorization: signed.authorization, 'User-Agent': this.client.getUserAgent(), ...(body ? { 'Content-Type': 'text/plain;charset=UTF-8' } : {}) },
            ...(body ? { body } : {}),
        });
        const json = asRecord(await response.json());
        if (!response.ok)
            throw new Error(`VOD ${method} failed (HTTP ${response.status})`);
        const error = asRecord(asRecord(json['ResponseMetadata'])['Error']);
        if (error['Code'] || error['CodeN']) {
            throw new Error(`VOD ${query['Action']} failed: ${String(error['Code'] ?? error['CodeN'])}`);
        }
        return json;
    }
    browserHeaders(referer) {
        return { 'User-Agent': this.client.getUserAgent(), Cookie: this.client.getCookies(), Referer: referer };
    }
    async storageHeaders(authorization, crc) {
        const headers = {
            Authorization: authorization, 'Content-Type': 'application/octet-stream',
            'X-Storage-U': await this.userId(), 'User-Agent': this.client.getUserAgent(),
        };
        if (crc)
            headers['Content-CRC32'] = crc;
        return headers;
    }
}
//# sourceMappingURL=upload.js.map