import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { DESKTOP_APP_VERSION } from './constants.js';
export function desktopSettingsUrl(deviceId, installId, channel, platform = process.platform, arch = process.arch) {
    const query = new URLSearchParams({ aid: '339757', iid: installId, device_id: deviceId, channel: 'prod',
        device_platform: platform, version_code: DESKTOP_APP_VERSION, node_arch: arch,
        from_aid: '339757', from_channel: channel, from_version: DESKTOP_APP_VERSION, app_arch: arch });
    return `https://imdesktop.douyin.com/service/settings/v3/?${query}`;
}
function object(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
export function parseDesktopSettings(value) {
    if (!object(value) || value['message'] !== 'success' || !object(value['data']) || !object(value['data']['settings'])) {
        throw new Error('Desktop application settings response is invalid');
    }
    return value['data']['settings'];
}
export function desktopFloatHintConfig(settings) {
    const config = settings?.['im_msg_not_float_not_hint'];
    if (!object(config) || !config['enable'])
        return undefined;
    return { enable: true, notHintMessages: configMap(config['not_hint_config']),
        notFloatMessages: configMap(config['not_float_config']) };
}
function configMap(source) {
    const result = {};
    if (source !== undefined && source !== null) {
        if (!object(source))
            throw new Error('Invalid Desktop float/hint config');
        for (const [key, values] of Object.entries(source)) {
            if (!/^-?\d+$/.test(key) || !Array.isArray(values) || !values.every(value => typeof value === 'number' && Number.isSafeInteger(value))) {
                throw new Error('Invalid Desktop float/hint config entry');
            }
            const type = BigInt(key);
            if (type < -2147483648n || type > 2147483647n)
                throw new Error('Invalid Desktop float/hint config type');
            result[String(type)] = values.map(value => value | 0);
        }
    }
    return result;
}
export function readDesktopSettings(directory, identity) {
    try {
        const stored = JSON.parse(readFileSync(join(directory, 'desktop-settings.json'), 'utf8'));
        if (object(stored) && stored['version'] === 1 && stored['identity'] === identity && object(stored['settings'])) {
            desktopFloatHintConfig(stored['settings']);
            return stored['settings'];
        }
    }
    catch { }
    return undefined;
}
export class DesktopSettings {
    options;
    file;
    value;
    task;
    controller;
    timer;
    stopped = false;
    constructor(options) {
        this.options = options;
        this.file = join(options.directory, 'desktop-settings.json');
        this.value = readDesktopSettings(options.directory, options.identity);
    }
    snapshot() { return this.value && structuredClone(this.value); }
    async start() {
        if (this.stopped)
            return undefined;
        this.timer ??= setInterval(() => { void this.refresh(); }, 7_200_000);
        this.timer.unref();
        return this.refresh();
    }
    restart(identity) {
        if (this.stopped)
            return Promise.resolve(undefined);
        if (this.timer)
            clearInterval(this.timer);
        this.timer = undefined;
        this.controller?.abort();
        this.task = undefined;
        this.options.identity = identity;
        return this.start();
    }
    refresh() {
        if (this.stopped)
            return Promise.resolve(undefined);
        if (this.task)
            return this.task.then(value => value && structuredClone(value));
        const controller = new AbortController();
        this.controller = controller;
        const task = (async () => {
            try {
                const settings = await this.options.request(controller.signal);
                if (this.stopped || controller.signal.aborted)
                    return undefined;
                if (!settings)
                    return this.snapshot();
                desktopFloatHintConfig(settings);
                this.value = structuredClone(settings);
                mkdirSync(this.options.directory, { recursive: true });
                const temporary = `${this.file}.tmp`;
                writeFileSync(temporary, JSON.stringify({ version: 1, identity: this.options.identity, settings: this.value }), { mode: 0o600 });
                renameSync(temporary, this.file);
            }
            catch (error) {
                if (!this.stopped && !controller.signal.aborted)
                    this.options.onError(error);
            }
            return this.stopped ? undefined : this.snapshot();
        })();
        this.task = task;
        const done = () => { if (this.task === task) {
            this.task = undefined;
            this.controller = undefined;
        } };
        void task.then(done, done);
        return task;
    }
    stop() {
        this.stopped = true;
        if (this.timer)
            clearInterval(this.timer);
        this.timer = undefined;
        this.controller?.abort();
    }
}
//# sourceMappingURL=settings.js.map