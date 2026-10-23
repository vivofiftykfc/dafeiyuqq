export class DesktopWebSecureBridgeHost {
    context;
    nextId = 0;
    retryBeforeId = -1;
    retry = null;
    messageLogEnabled = false;
    entries = {};
    constructor(context) {
        this.context = context;
    }
    createBridge(client, retryTimeout = false, timeout = 8000) {
        const post = client.postIframeMessage;
        return (callObj, callName, callArgs) => {
            let timer;
            const sequence = this.nextId++, id = `${sequence}`;
            if (typeof callObj !== 'string' || typeof callName !== 'string')
                return Promise.reject(this.error('CallBridgeParameterError', `callObj:${callObj}, callName:${callName}`));
            const send = () => client.window.then(() => new Promise((resolve, reject) => {
                const receive = (event) => {
                    try {
                        const data = event.data;
                        const entry = this.entries[id];
                        if (data.id === id && entry && !entry.et) {
                            entry.et = this.now();
                            client.emit('debug', { name: `BackPostMessageId=${id}` });
                            this.context.clearTimeout(timer);
                            client.off('message', receive);
                            if (data.promiseStatus === 'reject')
                                reject(this.error(`${data.message || 'UNKNOW_CallBridge_Error'}`));
                            else
                                resolve(data.message);
                            delete this.entries[id];
                        }
                    }
                    catch (error) {
                        reject(error);
                    }
                };
                client.on('message', receive);
                post({ id, message: { callObj, callName, callArgs } }).catch(reject);
            }));
            const invoke = (delay) => {
                client.emit('debug', { name: `PostMessageId=${id}`, content: `${callObj}:${callName}` });
                this.entries[id] = {};
                this.entries[id].st = this.now();
                return Promise.race([send(), new Promise((_resolve, reject) => {
                        timer = this.context.setTimeout(() => {
                            this.entries[id].timeout = this.now();
                            reject(this.error(`CallBridgeInvokeTimeout:${callObj}:${callName}`, `${JSON.stringify({ iframe: client.getIframeState(), id })}`));
                        }, delay);
                    })]);
            };
            return client.preCheck().then(() => invoke(timeout)).catch(error => {
                if (client.isConnection === true && retryTimeout && (error?.name || '').indexOf('CallBridgeInvokeTimeout') !== -1) {
                    const older = sequence < this.retryBeforeId, boundary = this.nextId;
                    client.emit('debug', { name: 'reCallBridgeWhenTimeout', content: JSON.stringify({ isTimeoutId: older, $MessageId: boundary, $id: sequence, callName, reCallBridgeWhenTimeout: Boolean(this.retry) }) });
                    this.retry = this.retry && older ? this.retry : new Promise(resolve => {
                        this.retryBeforeId = boundary;
                        this.enableMessageLog(client);
                        client.reStartConection('callBridge');
                        resolve();
                    });
                    return this.retry.then(() => invoke(8000));
                }
                throw error;
            });
        };
    }
    enableMessageLog(client) {
        if (!this.messageLogEnabled && client.config.debug) {
            this.messageLogEnabled = true;
            client.emit('debug', { name: 'OpenMessageLog' });
            this.context.addMessageListener(event => {
                if (this.messageLogEnabled && typeof event.data === 'string' && event.data.indexOf('log:') === 0)
                    client.emit('debug', { name: `Message:Log=${event.data.substring(4)}` });
            });
        }
    }
    now() { return this.context.performance.now && Number(this.context.performance.now().toFixed(0)) || this.context.Date.now(); }
    error(name, message = '') { return Object.assign(new Error(message || ''), { name, origin: this.context.origin }); }
}
export function dispatchDesktopWebSecureSocketMessage(config, event, dispatcher) {
    const report = (code, detail) => {
        try {
            event.source?.postMessage(`SOCKET_ERROR_${code}@${detail}`, event.origin);
        }
        catch { }
    };
    try {
        const url = config.url, allow = config.allowOrigin === undefined ? [] : config.allowOrigin;
        const sameOrigin = !!url && storageSocketOrigin(url) === event.origin;
        const accepted = url ? sameOrigin : Boolean([dispatcher.originSuffix, ...allow].filter(origin => event.origin.lastIndexOf(origin) !== -1)[0]);
        try {
            if (!event.origin)
                dispatcher.emit('debug', { name: 'eventLostOrigin', content: JSON.stringify(event.data || {}) });
        }
        catch { }
        if (!accepted)
            return;
        if (typeof event.data === 'string' && event.data.indexOf('ACK_0_') === 0) {
            try {
                event.source?.postMessage(`ACK_1_${event.data}`, event.origin);
            }
            catch { }
        }
        else if (event.data?.protocol === config.protocol) {
            try {
                const data = event.data;
                dispatcher.emit('message', { type: data?.type, data: data?.data, origin: event.origin, sourceWindow: event.source });
            }
            catch (error) {
                report(500, JSON.stringify(event.data));
                dispatcher.emit('debug', { name: `postMessage:protocol:error:${error?.message}` });
            }
        }
    }
    catch (error) {
        report(501, `${error.message}`);
        dispatcher.emit('debug', { name: 'SomePostMessageEventError', content: error?.message });
    }
}
function storageSocketOrigin(url) {
    const parts = url.split('//');
    return `${parts[0]}//${parts[1].split('/')[0]}`;
}
//# sourceMappingURL=desktop-web-secure-bridge.js.map