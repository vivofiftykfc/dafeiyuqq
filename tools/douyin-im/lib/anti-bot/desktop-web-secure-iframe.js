import { DesktopWebSecureEvents } from './desktop-web-secure-events.js';
export class DesktopWebSecureIframeHost {
    context;
    flightErrors = { current: 0, max: 2 };
    boxId;
    originSuffix;
    latest;
    constructor(context) {
        this.context = context;
        this.latest = this.supportsLatest();
        this.boxId = `J_uc_iframe_box-${context.Date.now()}`;
        this.originSuffix = `.${context.origin.split('.').slice(-2).join('.')}`;
    }
    createConnection(config = {}) { return new DesktopWebSecureIframeConnection(this, config); }
    resourceURL(base, version, flavor) { return `${base}@byted/x-storage-web/${version || '4.0.3'}/dist/${flavor || (this.latest ? 'latest' : 'page')}/index.html`; }
    fallbackURL() {
        let version;
        try {
            version = this.context.readLocalStorage('X_STORAGE_FALLBACK_VERSION');
        }
        catch { }
        return version ? this.resourceURL('https://lf-zt.douyin.com/obj/uc-assets/zt/', version) : undefined;
    }
    now() { return this.context.performance.now && Number(this.context.performance.now().toFixed(0)) || this.context.Date.now(); }
    error(name, message = '') { return Object.assign(new Error(message || ''), { name, origin: this.context.origin }); }
    container() {
        return new Promise(resolve => {
            const document = this.context.document;
            const wrapper = { appendChild: (frame) => {
                    let box = document.getElementById(this.boxId);
                    if (!box) {
                        const div = document.createElement('div');
                        div.style.display = 'none';
                        div.id = this.boxId;
                        document.body.appendChild(div);
                        box = div;
                    }
                    return box.appendChild(frame);
                } };
            if (document.body)
                resolve(wrapper);
            else if (document.readyState === 'loading')
                document.addEventListener('DOMContentLoaded', () => { resolve(wrapper); });
            else
                resolve(wrapper);
        });
    }
    supportsLatest() {
        return isDesktopWebSecureModernBrowser(this.context);
    }
}
export function isDesktopWebSecureModernBrowser(context) {
    try {
        const { navigator, window } = context;
        return Boolean(navigator.userAgent.match(/chrome\/[\d.]+/gi)) && Boolean(navigator?.userAgentData)
            || Boolean(navigator.storage?.getDirectory) || Boolean(navigator.canShare)
            || (window.Promise?.allSettled || '').toString().indexOf('[native code]') !== -1
                && Boolean(Number((navigator.userAgent.match(/Chrome\/(\d+\.+\d+)/) || [])[1]) >= 76 && window.visualViewport);
    }
    catch {
        return false;
    }
}
export class DesktopWebSecureIframeConnection extends DesktopWebSecureEvents {
    host;
    autoLoadIframeConfig = { max: 10, current: 0, iframeLoadPromise: null };
    config;
    constructor(host, config) {
        super();
        this.host = host;
        this.config = { ackTimeout: 2000, ...config };
    }
    reset = () => {
        const state = this.autoLoadIframeConfig;
        if (state.current >= state.max)
            state.max += 10;
        state.iframeLoadPromise = null;
        if (this.host.flightErrors.current >= this.host.flightErrors.max)
            this.host.flightErrors.max += 3;
    };
    setConfig(config) { this.config = { ackTimeout: config.ackTimeout || this.config.ackTimeout, url: config.url || this.config.url }; }
    start() { const state = this.autoLoadIframeConfig; return state.iframeLoadPromise = state.iframeLoadPromise || this.loadWindow(); }
    loadWindow = () => {
        const { url, ackTimeout } = this.config, state = this.autoLoadIframeConfig, context = this.host.context;
        return new Promise(resolve => { context.setTimeout(resolve, state.current === 0 ? 0 : 100); }).then(() => {
            if (!url)
                throw new Error('URL Error');
            return this.createIframeElement(state.current === state.max ? query(url, `t=${context.Date.now()}`) : url, ackTimeout);
        }).catch(error => {
            if (state.current >= state.max) {
                if (context.document.visibilityState === 'hidden')
                    return new Promise(resolve => {
                        const visible = () => { if (context.document.visibilityState !== 'hidden') {
                            context.document.removeEventListener('visibilitychange', visible);
                            resolve(1);
                        } };
                        context.document.addEventListener('visibilitychange', visible);
                    }).then(() => this.loadWindow().then(frame => { this.emit('log', { name: 'visibilityChangeLoadWindowSuccuess' }); return frame; }));
                const fallback = this.host.fallbackURL();
                if (fallback) {
                    this.emit('debug', { name: 'StartFireFallbackURL', content: fallback });
                    return this.createIframeElement(fallback, ackTimeout).then(frame => { this.emit('debug', { name: 'EndFireFallbackURL', content: fallback }); frame.fallback = true; return frame; })
                        .catch(failure => { this.emit('debug', { name: 'fireFallbackURLError', content: `${failure?.name}:${failure?.message}` }); throw error; });
                }
                throw error;
            }
            state.current++;
            return this.loadWindow();
        });
    };
    createPostMessageFlight = (post, timeout = 3000) => {
        const context = this.host.context, start = this.host.now();
        let end = start, timer;
        const metrics = (status) => { if (this.config.debug)
            this.emit('metrics', { name: 'PostMessageFlight', metrics: { startTime: start, endTime: end, loadTime: end - start }, categories: { status, retryCount: String(this.host.flightErrors.current), version: '4.0.3' } }); };
        return Promise.race([new Promise((resolve, reject) => {
                const token = `ACK_0_${context.Math.random()}`;
                const receive = (event) => { if (event.data === `ACK_1_${token}`) {
                    context.clearTimeout(timer);
                    end = this.host.now();
                    resolve();
                    context.removeMessageListener(receive);
                } };
                context.addMessageListener(receive);
                try {
                    post(token);
                }
                catch (error) {
                    reject(this.host.error('PostMessageWindowError', error?.message));
                }
            }), new Promise((_resolve, reject) => { timer = context.setTimeout(() => { end = this.host.now(); reject(this.host.error('PostMessageTimeout')); }, timeout); })])
            .then(() => { metrics('1'); }).catch(error => { metrics('0'); throw error; });
    };
    createIframeElement(url, ackTimeout) {
        const context = this.host.context, timeout = ackTimeout || this.config.ackTimeout, state = this.autoLoadIframeConfig;
        let source = null, ackTimer, mainTimer;
        const start = this.host.now(), frame = context.document.createElement('iframe');
        let loaded = start, ack = false, status = -1;
        frame.style.display = 'none';
        frame.src = url;
        return this.host.container().then(container => {
            const pending = Promise.race([new Promise((_resolve, reject) => {
                    frame.onload = () => {
                        loaded = this.host.now();
                        if (!ack)
                            ackTimer = context.setTimeout(() => {
                                if (!ack)
                                    reject(this.host.error('CreateIframeError', JSON.stringify({ startTime: start, endTime: loaded, loadTime: loaded - start, visibility: context.document.visibilityState, current: state.current, max: state.max })));
                            }, timeout || 2000);
                    };
                }), new Promise((resolve, reject) => {
                    const receive = (event) => {
                        try {
                            if (status === -1 && event.data === 'ACK' && frameOrigin(url) === event.origin) {
                                ack = true;
                                source = event.source;
                                context.clearTimeout(ackTimer);
                                context.clearTimeout(mainTimer);
                                resolve();
                                context.removeMessageListener(receive);
                            }
                        }
                        catch (error) {
                            reject(error);
                        }
                    };
                    context.addMessageListener(receive);
                }), new Promise((_resolve, reject) => { mainTimer = context.setTimeout(() => { reject(this.host.error('CreateIframeMainTimeout')); }, 120000); })]);
            container.appendChild(frame);
            return pending;
        }).then(() => this.createPostMessageFlight(data => { (frame.contentWindow || source).postMessage(data, frameOrigin(url)); }).catch(error => {
            if (error.name !== 'PostMessageWindowError')
                throw error;
            if (this.host.flightErrors.current < this.host.flightErrors.max) {
                this.host.flightErrors.current++;
                throw error;
            }
        })).then(() => {
            if (!frame.parentNode)
                throw new Error('CreateIframeElementError');
            status = 1;
            return { startTime: start, endTime: this.host.now(),
                postMessage: (data, targetOrigin) => { (frame.contentWindow || source).postMessage(data, targetOrigin || '*'); },
                destory: () => { try {
                    frame.parentNode?.removeChild(frame);
                }
                catch { } },
                isValid: () => Boolean(frame.parentNode && frame.parentNode?.parentNode), };
        }).catch(error => {
            status = 0;
            try {
                frame.parentNode?.removeChild(frame);
            }
            catch { }
            try {
                if (error.name === 'CreateIframeMainTimeout')
                    this.emit('debug', { name: 'CreateIframeMainTimeout' });
            }
            catch { }
            throw error;
        });
    }
}
function frameOrigin(url) { const parts = url.split('//'); return `${parts[0]}//${parts[1].split('/')[0]}`; }
function query(url, value) { return `${url}${url.indexOf('html?') !== -1 ? '&' : '?'}${value}`; }
//# sourceMappingURL=desktop-web-secure-iframe.js.map