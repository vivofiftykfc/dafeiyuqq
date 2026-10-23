import { createHash } from 'node:crypto';
import { encodeRequest, decodeResponseRaw } from './codec.js';
import { DESKTOP_IM_PROFILE } from './desktop.js';
export function desktopBodyDigest(body) {
    return createHash('md5').update(body).digest('hex');
}
export class ImProtoTransportError extends Error {
    stage;
    cmd;
    endpoint;
    name = 'ImProtoTransportError';
    constructor(stage, cmd, endpoint, message, options) {
        super(message, options);
        this.stage = stage;
        this.cmd = cmd;
        this.endpoint = endpoint;
    }
}
export class ImProtoTransport {
    client;
    installId;
    constructor(client) {
        this.client = client;
        this.installId = client.getInstallId?.();
    }
    async sendCookieProto(cmd, inboxType, endpoint, body, opts) {
        const payload = await encodeRequest({
            token: '',
            cmd,
            inboxType,
            body,
            authType: 1,
            deviceId: opts.deviceId,
            sdkVersion: opts.sdkVersion,
            buildNumber: opts.buildNumber,
            versionCode: opts.versionCode,
            devicePlatform: opts.devicePlatform,
            biz: opts.biz,
            access: opts.access,
            headers: opts.headers,
        });
        const url = new URL(endpoint, DESKTOP_IM_PROFILE.apiUrl);
        for (const [key, value] of Object.entries(opts.query ?? {})) {
            url.searchParams.set(key, value);
        }
        if (this.installId !== undefined)
            url.searchParams.set('iid', this.installId);
        const requestBody = Buffer.from(payload);
        const request = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-protobuf',
                Accept: 'x-protobuf',
                'User-Agent': opts.httpUserAgent,
                Cookie: this.client.getCookies(),
                Referer: 'https://imdesktop.douyin.com',
                'x-ss-stub': desktopBodyDigest(requestBody),
            },
            body: requestBody,
            signal: AbortSignal.timeout(20_000),
        };
        let response;
        let bytes;
        try {
            response = await fetch(url, request);
            bytes = Buffer.from(await response.arrayBuffer());
        }
        catch (cause) {
            throw new ImProtoTransportError('network', cmd, endpoint, `IM Cookie network failed cmd=${cmd} ${endpoint}`, { cause });
        }
        if (!response.ok) {
            throw new ImProtoTransportError('http', cmd, endpoint, `IM Cookie HTTP ${response.status} ${endpoint}`);
        }
        try {
            return await decodeResponseRaw(bytes);
        }
        catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            throw new ImProtoTransportError('decode', cmd, endpoint, `IM Cookie response decode failed cmd=${cmd} ${endpoint}: ${detail}`, { cause: error });
        }
    }
}
//# sourceMappingURL=transport.js.map