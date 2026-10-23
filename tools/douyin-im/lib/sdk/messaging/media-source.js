import { readFile } from 'node:fs/promises';
import { sniffImageFormat } from '../../services/im/media.js';
function decodeBase64(value) {
    const compact = value.replace(/\s/g, '');
    if (!compact || compact.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(compact)) {
        return undefined;
    }
    const decoded = Buffer.from(compact, 'base64');
    const normalizedInput = compact.replace(/=+$/, '');
    const normalizedOutput = decoded.toString('base64').replace(/=+$/, '');
    return normalizedInput === normalizedOutput ? decoded : undefined;
}
function decodeDataUrl(value) {
    const comma = value.indexOf(',');
    if (comma < 0 || !/;base64$/i.test(value.slice(0, comma))) {
        throw new Error('image data URL must use base64 encoding');
    }
    const decoded = decodeBase64(value.slice(comma + 1));
    if (!decoded)
        throw new Error('image data URL contains invalid base64');
    return decoded;
}
function isMissingPathError(error) {
    if (!error || typeof error !== 'object')
        return false;
    const code = error.code;
    return code === 'ENOENT' || code === 'ENAMETOOLONG' || code === 'EINVAL';
}
async function readHttpsImage(url, fetcher) {
    const response = await fetcher(url, { redirect: 'follow' });
    if (!response.ok)
        throw new Error(`image download failed (HTTP ${response.status})`);
    if (response.url && new URL(response.url).protocol !== 'https:') {
        throw new Error('image URL redirected to a non-HTTPS resource');
    }
    return new Uint8Array(await response.arrayBuffer());
}
export async function resolveImageSource(source, dependencies = {}) {
    let data;
    if (source instanceof Uint8Array) {
        data = source;
    }
    else if (/^data:/i.test(source)) {
        data = decodeDataUrl(source);
    }
    else if (/^https?:\/\//i.test(source)) {
        const url = new URL(source);
        if (url.protocol !== 'https:')
            throw new Error('remote image URL must use HTTPS');
        data = await readHttpsImage(url, dependencies.fetcher ?? globalThis.fetch);
    }
    else {
        try {
            data = await (dependencies.readLocalFile ?? readFile)(source);
        }
        catch (error) {
            if (!isMissingPathError(error))
                throw error;
            const decoded = decodeBase64(source);
            if (!decoded) {
                throw new Error('image string must be valid base64, a local file path, or an HTTPS URL');
            }
            data = decoded;
        }
    }
    if (data.length === 0)
        throw new Error('cannot send an empty image');
    const format = sniffImageFormat(data);
    if (format === 'unknown') {
        throw new Error('unsupported image data; expected JPEG, PNG, GIF, WebP, or HEIC');
    }
    return { data, format };
}
export function isImageAsset(value) {
    return typeof value === 'object'
        && value !== null
        && !(value instanceof Uint8Array)
        && typeof value.oid === 'string';
}
//# sourceMappingURL=media-source.js.map