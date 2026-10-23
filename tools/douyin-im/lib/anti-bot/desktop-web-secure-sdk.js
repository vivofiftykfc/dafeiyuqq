import { DesktopWebSecureEvents } from './desktop-web-secure-events.js';
import { DesktopWebSecureKeys } from './desktop-web-secure-keys.js';
import { DesktopWebSecureRequestPipeline } from './desktop-web-secure-request.js';
import { DesktopWebSecureTransportHooks } from './desktop-web-secure-transport.js';
import { DesktopWebSecureIframeHost } from './desktop-web-secure-iframe.js';
import { DesktopWebSecureBridgeHost } from './desktop-web-secure-bridge.js';
import { DesktopWebSecureStore } from './desktop-web-secure-store.js';
import { DesktopWebSecureKeyStore } from './desktop-web-secure-key-store.js';
export class DesktopWebSecureSdk extends DesktopWebSecureEvents {
    context;
    cryptoSDK;
    pipeline;
    secureProxy;
    config = {};
    aid;
    enableEcdh;
    webid;
    disableTcc;
    loginStatus = '-1';
    loginPromise;
    constructor(context, options = {}) {
        super();
        this.context = context;
        context.telemetry?.setContext({ containerVersion: options?.containerVersion || 'default', containerType: options?.containerType || 'sdk' });
        const keysContext = { ...context.keys, document: context.document, browser: context.browser };
        if (context.storage) {
            const storage = context.storage, host = new DesktopWebSecureIframeHost(storage.iframe), bridges = new DesktopWebSecureBridgeHost(storage.iframe);
            keysContext.createKeyStore = settings => {
                const config = { agid: settings.agid, sendEvent: event => this.sendEvent(event) };
                if (settings.ztIframe !== undefined)
                    config.ztIframe = settings.ztIframe;
                if (settings.iframeURL !== undefined)
                    config.url = settings.iframeURL;
                if (settings.iframeBackURL !== undefined)
                    config.fallbackCacheOriginURL = settings.iframeBackURL;
                if (settings.disableCrossStorage !== undefined)
                    config.disableCrossStorage = settings.disableCrossStorage;
                if (settings.storageNamespace !== undefined)
                    config.namespace = settings.storageNamespace;
                return new DesktopWebSecureKeyStore({ ...storage.cache, document: context.document,
                    createStore: () => new DesktopWebSecureStore(host, bridges, storage.store, config) }, { agId: settings.agid || 1, enableCache: settings.enableCache });
            };
        }
        this.cryptoSDK = new DesktopWebSecureKeys(keysContext);
        this.cryptoSDK.on('error', event => this.forwardError(event, true));
        for (const name of ['load', 'execute', 'ready'])
            this.cryptoSDK.on(name, event => this.forwardKeysActivity(name, event));
        this.cryptoSDK.on('log', event => this.forwardLog(event));
        this.pipeline = new DesktopWebSecureRequestPipeline({ Date: context.keys.Date, pageHref: context.transport.location.href }, this.cryptoSDK);
        this.secureProxy = new DesktopWebSecureTransportHooks(context.transport, this.pipeline);
        this.secureProxy.on('error', event => this.forwardError(event, false));
        this.secureProxy.on('execute', event => this.forwardProxyActivity(event));
        this.secureProxy.on('log', event => this.forwardLog(event));
        context.transport.window.$SECURE_VERSION = '3.3.5';
    }
    setConfig = (value) => {
        const { scene, aid } = value;
        this.aid = aid;
        if (!this.config)
            this.config = {};
        const key = String(scene), previous = this.config[key];
        if (previous && Array.isArray(previous))
            previous.push(value);
        else
            this.config[key] = [value];
        this.cryptoSDK.setConfig(this.config);
        this.cryptoSDK.setAid(aid);
        this.secureProxy.setConfig(this.config);
        this.emit('load', { action: 'sdk', op: 'config', status: 'success' });
    };
    setType = (value) => {
        this.cryptoSDK.setType(value);
        this.secureProxy.setType(value);
        this.context.telemetry?.setEventParams?.({ init_type: value.initType, sign_type: value.signType });
        this.context.telemetry?.setContext({ initType: value.initType, signType: value.signType, type: value.signType });
    };
    setNamespace = (value) => { this.context.telemetry?.setContext({ namespace: value }); this.cryptoSDK.setStorageNamespace(value); };
    setAgidAndHost = (agid, host) => {
        this.context.telemetry?.setContext({ agid, scope: host || this.context.document.location.hostname || '' });
        this.cryptoSDK.setAgidAndHost(agid, host);
    };
    setDisableCrossStorage = (value) => { this.cryptoSDK.setDisableCrossStorage(value); };
    setDisableStorageSignData = (value) => { this.cryptoSDK.setDisableStorageSignData(value); };
    setCrossStorageURL = (value) => { this.cryptoSDK.setCrossStorageURL(value); };
    setCrossStorageBackURL = (value) => { this.cryptoSDK.setCrossStorageBackURL(value); };
    setUpdateKeys = (value) => { this.cryptoSDK.setUpdateKeys(value); };
    setContext = (value) => { this.cryptoSDK.setContext(value); };
    setEnableCache = (value) => { this.cryptoSDK.setEnableCache(value); };
    setEnableEcdh = (value) => { this.enableEcdh = value; this.cryptoSDK.setEnableEcdh(value); };
    setUpdateDataWhenVerifySuccess = (value) => { this.secureProxy.setUpdateDataWhenVerifySuccess(value); };
    disableTccConfig = (value) => { this.disableTcc = value; };
    setLoginStatus = (value) => {
        if (typeof value === 'boolean') {
            this.loginStatus = value ? '1' : '0';
            this.secureProxy.setLogin(value);
        }
        if (typeof value === 'function')
            this.loginPromise = value().catch(() => false);
    };
    setWebId = (value, appId, options) => {
        this.context.telemetry?.setWebId?.(value);
        const webId = value === undefined ? '' : value;
        this.context.telemetry?.initTea?.({ appId: appId || 1661, config: { user_unique_id: webId, device_id: webId, user_id: webId,
                evtParams: { sdk_version: '3.3.5', self_platform: /TTElectron/.test(this.context.browser.navigator.userAgent) ? 'electron' : 'web' } } }, options);
        this.webid = value;
        this.context.dtrait?.setWebId?.(value);
        this.emit('load', { action: 'sdk', op: 'setwebid', status: 'success' });
    };
    setSlardarEnv = (value) => { this.context.telemetry?.setEnv?.(value); };
    startDTrait = (options) => {
        const start = this.context.keys.Date.now();
        const input = { ...options, webId: this.webid,
            consumerPathList: [...(options.consumerPathList || []), '/passport', '/quick_login/v2', '/check_qrconnect', '/account_login/v2', '/one_login'],
            urlRewriteRules: [...(options.urlRewriteRules || []), ['/quick_login/v2', '/passport/sso/quick_login/v2/'], ['/check_qrconnect', '/passport/sso/check_qrconnect/'],
                ['/account_login/v2', '/passport/sso/account_login/v2/'], ['/one_login', '/passport/sso/one_login/']] };
        if (!this.context.dtrait)
            throw new Error('Desktop DTrait runtime is not bound');
        const report = (status) => {
            this.context.telemetry?.initDTrait?.({ status, duration: this.context.keys.Date.now() - start, performance_time: this.context.keys.performance?.now() });
            this.context.telemetry?.dot({ name: 'dtrait_init', metrics: { count: 1, duration: this.context.keys.Date.now() - start, performance_time: this.context.keys.performance?.now() }, categories: { status } });
        };
        this.observe(this.context.dtrait.start(input).then(() => { this.emit('init', { type: 'dtrait' }); report('success'); }).catch(() => { report('fail'); }));
        return true;
    };
    start = async () => {
        this.context.telemetry?.initTicketGuard?.({ status: 'success', performance_time: this.context.keys.performance?.now() });
        this.context.telemetry?.dot({ name: 'ticket_guard_init', metrics: { count: 1, performance_time: this.context.keys.performance?.now() }, categories: { status: 'success' } });
        this.cryptoSDK.start();
        this.emit('init', { type: 'bdTicket' });
        this.emit('load', { action: 'sdk', op: 'init', status: 'start' });
        if (!this.disableTcc)
            try {
                const value = await this.context.tcc.getConfig({ tccPsm: 'ucenter.fe.ztsdk', zone: 'default', key: 'ztsdk_config' });
                if (value && this.aid && value[this.aid] && Array.isArray(value[this.aid]))
                    value[this.aid].forEach(entry => this.setConfig(entry));
            }
            catch {
                this.emit('log', { level: 'error', content: 'tcc config merge error', extra: { aid: this.aid || 0 } });
            }
    };
    refresh = async () => this.cryptoSDK.refresh();
    getBdTicketGuardHeader = async (input) => this.secureProxy.getBdTicketGuardHeader(input);
    processSignCookie = () => {
        try {
            const read = (name) => decodeURIComponent(this.context.document.cookie.replace(new RegExp('(?:(?:^|.*;)\\s*' + encodeURIComponent(name).replace(/[-.+*]/g, '\\$&') + '\\s*\\=\\s*([^;]*).*$)|^.*$'), '$1')) || null;
            const domain = read('_bd_ticket_crypt_doamin') || '', clientDomain = read('bd_ticket_guard_client_web_domain') || '3', crypt = read('_bd_ticket_crypt_cookie') ? '1' : '0';
            return { cookieStatus: read('__security_server_data_status') || '0', signVersion: read('bd_sign_version') || '0', cookieCrypt: crypt,
                isTopBrowser: this.cryptoSDK?.isTopBrowser() ? '1' : '0', webDomain: domain || '3', webClientDomain: clientDomain };
        }
        catch (error) {
            this.context.telemetry?.throw({ err: error instanceof Error ? error : new Error('init sign cookie error'), extra: { content: 'init sign cookie error' } });
        }
        return { cookieStatus: '0', signVersion: '0', cookieCrypt: '0', isTopBrowser: '0', webDomain: '3', webClientDomain: '3' };
    };
    sendEvent = (event) => {
        const cookies = this.processSignCookie();
        this.context.telemetry?.dot({ name: event.name, metrics: event.metrics, categories: { ...event.categories, ...cookies, loginStatus: this.loginStatus } });
    };
    forwardError(event, keys) {
        const { error, name } = event;
        const extra = { content: name };
        if (keys && error instanceof Error)
            extra['origin'] = error.origin || '';
        extra['login'] = this.loginStatus;
        this.context.telemetry?.throw({ err: error instanceof Error ? error : new Error(name), extra });
        this.emit('error', event);
    }
    forwardLog(event) {
        const cookies = this.processSignCookie(), { level, extra, content } = (event || {});
        this.context.telemetry?.log({ content, extra: { ...cookies, ...extra }, level });
        this.emit('log', event);
    }
    forwardKeysActivity(name, event) {
        const { action, op, status, duration, ctx, metrics } = event;
        const metricName = `${name}_${action}_${op.toLocaleLowerCase()}`, cookies = name === 'ready' ? {} : this.processSignCookie();
        const report = () => this.context.telemetry?.dot({ name: metricName, metrics: { count: 1, duration: duration || 0, ...metrics }, categories: { satus: status, login: this.loginStatus, ...ctx, ...cookies } });
        if (this.loginPromise)
            this.observe(this.loginPromise.then(value => { this.loginStatus = value ? '1' : '0'; report(); }));
        else
            report();
        this.emit(name === 'ready' ? 'execute' : name, event);
    }
    forwardProxyActivity(event) {
        const { action, op, status, duration, ctx, metrics } = event;
        const name = `execute_${action}_${op.toLocaleLowerCase()}`, cookies = this.processSignCookie();
        const report = () => { if (op !== 'sign' || action !== 'response')
            this.context.telemetry?.dot({ name, metrics: { count: 1, duration: duration || 0, ...metrics }, categories: { satus: status, ...ctx, ...cookies } }); };
        const extras = event.extras === '[redacted]' ? { redacted: true } : event.extras;
        if (this.loginPromise)
            void this.loginPromise.then(value => {
                this.loginStatus = value ? '1' : '0';
                report();
                this.emit('execute', { ...event, extras: { loginStatus: this.loginStatus, ...extras } });
            }).catch(() => { });
        else {
            report();
            this.emit('execute', { ...event, extras: { loginStatus: this.loginStatus, ...extras, ...cookies } });
        }
    }
    observe(task) { void task.catch(error => { try {
        this.context.onBackgroundError?.(error);
    }
    catch { } }); }
}
//# sourceMappingURL=desktop-web-secure-sdk.js.map