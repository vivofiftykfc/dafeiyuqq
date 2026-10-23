import { createCipheriv, createDecipheriv } from 'crypto';
export function pickImageUrl(image) {
    return [image.originUrls, image.largeUrls, image.mediumUrls, image.thumbUrls]
        .flatMap((urls) => urls)
        .find(Boolean);
}
export function decryptImage(encrypted, skeyHex) {
    const key = Buffer.from(skeyHex, 'hex');
    if (key.length !== 32 || skeyHex.length !== 64) {
        throw new Error('image skey must be 32 bytes encoded as 64 hex characters');
    }
    if (encrypted.length < 28)
        throw new Error('encrypted image is too short');
    const input = Buffer.from(encrypted);
    const iv = input.subarray(0, 12);
    const tag = input.subarray(input.length - 16);
    const ciphertext = input.subarray(12, input.length - 16);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
export function decryptCencSample(data, keyInput, ivInput, subsamples = []) {
    const key = Buffer.from(keyInput);
    if (key.length !== 16)
        throw new Error('CENC key must be 16 bytes');
    if (ivInput.length !== 8 && ivInput.length !== 16)
        throw new Error('CENC IV must be 8 or 16 bytes');
    const iv = Buffer.alloc(16);
    Buffer.from(ivInput).copy(iv);
    const source = Buffer.from(data);
    if (subsamples.length === 0) {
        const cipher = createCipheriv('aes-128-ctr', key, iv);
        return Buffer.concat([cipher.update(source), cipher.final()]);
    }
    const protectedChunks = [];
    let pos = 0;
    for (const sample of subsamples) {
        if (sample.clear < 0 || sample.protected < 0 || pos + sample.clear + sample.protected > source.length) {
            throw new Error('CENC subsample exceeds sample bounds');
        }
        pos += sample.clear;
        protectedChunks.push(source.subarray(pos, pos + sample.protected));
        pos += sample.protected;
    }
    const cipher = createCipheriv('aes-128-ctr', key, iv);
    const decrypted = Buffer.concat([
        cipher.update(Buffer.concat(protectedChunks)),
        cipher.final(),
    ]);
    const output = Buffer.alloc(source.length);
    pos = 0;
    let decryptedPos = 0;
    for (const sample of subsamples) {
        source.copy(output, pos, pos, pos + sample.clear);
        pos += sample.clear;
        decrypted.copy(output, pos, decryptedPos, decryptedPos + sample.protected);
        pos += sample.protected;
        decryptedPos += sample.protected;
    }
    source.copy(output, pos, pos);
    return output;
}
export function sniffImageFormat(data) {
    const b = Buffer.from(data);
    if (b.length >= 12 &&
        b.subarray(0, 4).toString() === 'RIFF' &&
        b.subarray(8, 12).toString() === 'WEBP')
        return 'webp';
    if (b.length >= 2 && b[0] === 0xff && b[1] === 0xd8)
        return 'jpeg';
    if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
        return 'png';
    if (b.length >= 6 && (b.subarray(0, 6).toString() === 'GIF87a' || b.subarray(0, 6).toString() === 'GIF89a'))
        return 'gif';
    if (b.length >= 12 && b.subarray(4, 8).toString() === 'ftyp') {
        const brands = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1']);
        for (let offset = 8; offset + 4 <= Math.min(b.length, 32); offset += 4) {
            if (brands.has(b.subarray(offset, offset + 4).toString()))
                return 'heic';
        }
    }
    return 'unknown';
}
//# sourceMappingURL=media.js.map