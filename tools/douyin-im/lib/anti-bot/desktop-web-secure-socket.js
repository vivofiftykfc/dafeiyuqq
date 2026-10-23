import { DesktopWebSecureEvents } from './desktop-web-secure-events.js';
import { dispatchDesktopWebSecureSocketMessage, } from './desktop-web-secure-bridge.js';
export class DesktopWebSecureSocket extends DesktopWebSecureEvents {
    host;
    context;
    config;
    iframeConnection;
    window;
    isStart;
    isConnection;
    loadTime = 0;
    startTime = 0;
    endTime = 0;
    parentCallIndex = 0;
    originSuffix;
    constructor(host, context, config = {}) {
        super();
        this.host = host;
        this.context = context;
        this.originSuffix = host.originSuffix;
        this.config = { protocol: 'Common', ...config };
        this.iframeConnection = host.createConnection();
        this.startConnection('init');
        this.on('config', () => { this.startConnection('config'); });
        this.initMessageEvent();
        this.on('connection', connection => {
            this.loadTime = connection.endTime - connection.startTime;
            this.startTime = connection.startTime;
            this.endTime = connection.endTime;
            this.isConnection = true;
            if (this.config.enableFallback && !connection.target.fallback)
                try {
                    context.writeLocalStorage('X_STORAGE_FALLBACK_VERSION', '4.0.3');
                }
                catch { }
            this.emit('debug', { name: 'ConnectionSuccess' });
            this.initMessageEvent();
        });
        for (const name of ['debug', 'log', 'metrics'])
            this.iframeConnection.on(name, event => { this.emit(name, event); });
        this.on('connectionFail', error => {
            const downgrade = this.config.downgradeCSPURL;
            this.isConnection = false;
            this.emit('error', this.host.error(`Connection:${error.name}`, error.message));
            this.emit('debug', { name: 'connectionFail' });
            if (downgrade && error?.message.indexOf('Content Security Policy') !== -1) {
                const url = typeof downgrade === 'string' ? downgrade : host.resourceURL('https://lf-zt.douyin.com/obj/uc-assets/zt/', undefined, 'page');
                if (url && this.config.url !== url) {
                    this.emit('debug', { name: 'fireDefaultPageURL', content: url });
                    this.config.url = url;
                    this.reStartConection('csp');
                }
            }
        });
        host.context.addMessageListener(event => {
            if (typeof event.data === 'string') {
                if (event.data.indexOf('SOCKET_ERROR_') !== -1)
                    this.emit('error', host.error('SCOKET_ERROR', event.data));
                else if (event.data.indexOf('Version:') !== -1)
                    this.emit('debug', { name: 'SocketVersion', content: event.data.split(':')[1] });
            }
        });
    }
    listen = () => { const window = this.context.window; if (window.parent !== window)
        window.parent.postMessage('ACK', '*'); };
    getIframeState = () => ({
        isConnection: typeof this.isConnection === 'boolean' ? Number(Boolean(this.isConnection)) : -1,
        retryCount: this.iframeConnection.autoLoadIframeConfig.current, startTime: this.startTime, endTime: this.endTime, loadTime: this.loadTime, origin: this.host.context.origin,
    });
    postIframeMessage = (message) => {
        const protocol = this.config.protocol;
        if (this.window) {
            const url = this.config.url;
            return this.window.catch(() => this.reConnection()).then(connection => { connection.target.postMessage({ protocol, data: message }, origin(url)); });
        }
        return Promise.reject(this.host.error('postMessageError'));
    };
    postWindowMessage = (target, type, data, targetOrigin = '*') => {
        const protocol = this.config.protocol;
        return new Promise(resolve => { target.postMessage({ type, protocol, data }, targetOrigin); resolve(); });
    };
    postParentMessage = (type, data, targetOrigin = '*') => {
        const window = this.context.window;
        return window.parent !== window ? this.postWindowMessage(window.parent, type, data, targetOrigin) : Promise.resolve();
    };
    dispatchParentEvent = (eventName, eventData) => this.postParentMessage('event', { id: `p-${this.parentCallIndex++}`, message: { eventName, eventData } });
    callParentBridge = (callObj, callName, callArgs) => {
        const id = `p-${this.parentCallIndex++}`;
        return Promise.race([new Promise((resolve, reject) => {
                const receive = (event) => {
                    const data = event.data;
                    if (data.id === id) {
                        this.off('message', receive);
                        if (data.promiseStatus === 'reject')
                            reject(this.host.error(`${data.message || 'UNKNOW_CallParentBridge_Error'}`));
                        else
                            resolve(data.message);
                    }
                };
                this.on('message', receive);
                this.postParentMessage('function', { id, message: { callObj, callName, callArgs } }).catch(reject);
            }), new Promise((_resolve, reject) => {
                this.host.context.setTimeout(() => { reject(this.host.error('CallParentBridgeInvokeTimeout', `CallBridge invoke timeout: callObj=${callObj};callName=${callName};`)); }, 5000);
            })]);
    };
    startConnection = (reason) => {
        const url = this.config.url;
        if (!this.window && url) {
            this.isStart = true;
            this.isConnection = undefined;
            this.emit('log', { name: `startConnection:${reason}` });
            this.createConnection(url);
        }
    };
    reStartConection = (reason) => {
        this.isStart = false;
        if (this.window)
            void this.window.then(connection => { connection.target.destory(); }).catch(() => undefined);
        this.window = undefined;
        this.iframeConnection.reset();
        this.startConnection(reason);
    };
    start = (config) => new Promise(resolve => {
        this.config = { ...this.config, ...config };
        this.isStart = true;
        this.emit('config', undefined);
        resolve();
    });
    reConnection = () => this.createConnection(this.config.url);
    preCheck = () => {
        if (this.isConnection && this.isStart && this.window)
            return this.window.then(connection => { if (!connection.target.isValid())
                this.reStartConection('valid'); });
        if (!this.config.disablePreCheckConnection && this.isConnection === false && this.iframeConnection.autoLoadIframeConfig.current >= this.iframeConnection.autoLoadIframeConfig.max)
            this.reStartConection('reConnection');
        return Promise.resolve();
    };
    onMessage = (event) => {
        dispatchDesktopWebSecureSocketMessage(this.config, event, { originSuffix: this.originSuffix,
            emit: (name, data) => { if (name === 'message')
                this.emit('message', data);
            else
                this.emit(name, data); },
        });
    };
    initMessageEvent = () => { this.removeMessageEvent(); this.host.context.addMessageListener(this.onMessage); this.emit('debug', { name: 'initMessageEvent' }); };
    removeMessageEvent = () => { this.host.context.addMessageListener(this.onMessage); };
    createConnection(url) {
        const ackTimeout = this.config.ackTimeout, startTime = this.host.now(), max = this.iframeConnection.autoLoadIframeConfig.max;
        this.iframeConnection.setConfig({ url: max > 10 ? query(url, `t=${max}`) : url, ackTimeout });
        const pending = this.iframeConnection.start().then(target => {
            const result = { target, startTime, endTime: this.host.now() };
            this.emit('connection', { ...result });
            return result;
        }).catch((error) => { this.emit('connectionFail', this.host.error(`${error.name || 'ConnectionError'}`, error.message)); throw error; });
        this.window = pending;
        void pending.catch(error => { try {
            this.context.onBackgroundError?.(error);
        }
        catch { } });
        return pending;
    }
}
function origin(url) { const parts = url.split('//'); return `${parts[0]}//${parts[1].split('/')[0]}`; }
function query(url, value) { return `${url}${url.indexOf('html?') !== -1 ? '&' : '?'}${value}`; }
//# sourceMappingURL=desktop-web-secure-socket.js.map