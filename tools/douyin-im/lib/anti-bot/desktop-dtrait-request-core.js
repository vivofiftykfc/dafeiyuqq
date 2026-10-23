import { DesktopDTraitFeatures, } from './desktop-dtrait-features.js';
const quietPaths = [
    '/passport/web/check_qrconnect/',
    '/passport/token/beat/web/',
    '/check_qrconnect/',
    '/passport/web/get_qrcode/',
    '/passport/ticket_guard/get_client_cert/',
    '/passport/web/challenge/',
    '/passport/general/login_guiding_strategy/',
    '/passport/token/beat/sso/web/',
];
export function createDesktopDTraitCore(context) {
    let instance = null;
    const realmState = context.realmState ?? {
        hookLogCount: 0,
        collectionCount: 0,
        collectionErrors: [],
    };
    return {
        getInstance(params, options) {
            const { sourcePromise, dTraitPath = [], urlRewriteRules = [], getLocalSource, dTraitHost = [], containerSdkVersion = 'unknown', monitor, delayCollect, } = options;
            void sourcePromise;
            void getLocalSource;
            void containerSdkVersion;
            if (!instance) {
                instance = new DesktopDTraitRequestCore({
                    ...context,
                    realmState,
                    get featureProtocol() {
                        return new DesktopDTraitFeatures(context.featureContext, {});
                    },
                }, Object.assign({}, params, { libraGroup: options['libraGroup'] }));
                if (delayCollect)
                    context.setTimeout(() => instance?.setSource(), delayCollect * 1000);
                else
                    instance.setSource();
            }
            if (monitor)
                instance.updateMonitor(monitor);
            instance.updateDTraitPath(dTraitPath);
            instance.updateDTraitHost(dTraitHost);
            instance.updateUrlRewriteRules(urlRewriteRules);
            return true;
        },
    };
}
export class DesktopDTraitRequestCore {
    context;
    initPromise = Promise.resolve(false);
    aesKey;
    centralRsaPub;
    centralVersion;
    centralRsaAesKey = '';
    edgeRsaPub;
    edgeVersion;
    edgeRsaAesKey = '';
    centralDTrait = '';
    edgeDTrait = '';
    dTraitToken = '';
    dTraitPathCache = {};
    dTraitHooksPath = [];
    dTraitHooksHost = [];
    dTraitUrlRewriteRules = [];
    collectStatus = false;
    featureProtocol;
    libraGroup;
    getLocalSource = () => Promise.resolve({});
    realmState;
    cacheLogList = {
        slardarEvent: [],
        sendTeaLog: [],
        slardarLog: [],
    };
    sendSlardarEventBase = undefined;
    sendTeaLogBase = undefined;
    sendSlardarLogBase = undefined;
    constructor(context, params) {
        this.context = context;
        this.realmState = context.realmState ?? {
            hookLogCount: 0,
            collectionCount: 0,
            collectionErrors: [],
        };
        this.sendSlardarEvent({
            name: 'dtrait_monkey_patch_request',
            metrics: { duration: context.performance.now() },
            categories: {
                path_len: Array.isArray(this.dTraitHooksPath)
                    ? this.dTraitHooksPath.length
                    : 0,
            },
        });
        context.installHooks({
            hookConfig: this.hookConfig,
            processRequestConfig: this.processRequestConfig,
            processResponseConfig: this.processResponseConfig,
            errorRequestConfig: this.errorRequestConfig,
        });
        const getKey = () => context.crypto.aes?.getAesKey();
        this.aesKey = context.crypto.util?.uint8ArrayToHex(getKey());
        this.centralRsaPub = context.atob((params['centralRsaPub'] || ''));
        this.centralVersion = params['centralVersion'];
        this.edgeRsaPub = context.atob((params['edgeRsaPub'] || ''));
        this.edgeVersion = params['edgeVersion'];
        this.featureProtocol = context.featureProtocol;
        this.libraGroup = params['libraGroup'];
        this.observe(this.init());
        if (context.monitor)
            this.updateMonitor(context.monitor);
    }
    sendSlardarEvent = (value) => {
        if (this.sendSlardarEventBase)
            return this.sendSlardarEventBase?.(value);
        this.cacheLogList.slardarEvent.push(value);
        return undefined;
    };
    sendTeaLog = (eventName, params) => {
        if (this.sendTeaLogBase)
            return this.sendTeaLogBase?.(eventName, params);
        this.cacheLogList.sendTeaLog.push({ eventName, params });
        return undefined;
    };
    sendSlardarLog = (value) => {
        if (this.sendSlardarLogBase)
            return this.sendSlardarLogBase?.(value);
        this.cacheLogList.slardarLog.push(value);
        return undefined;
    };
    updateMonitor = (monitor) => {
        if (monitor.sendTeaLog) {
            this.sendTeaLogBase = monitor.sendTeaLog;
            this.cacheLogList.sendTeaLog.map(value => {
                if (value)
                    this.sendTeaLog(value.eventName, value.params);
                return null;
            });
        }
        if (monitor.sendSlardarEvent) {
            this.sendSlardarEventBase = value => {
                monitor.sendSlardarEvent(Object.assign({}, value, {
                    categories: Object.assign({ realVersion: '1.0.31' }, value?.['categories']),
                }));
            };
            this.cacheLogList.slardarEvent.map(value => {
                if (value)
                    this.sendSlardarEvent(value);
                return null;
            });
        }
        if (monitor.sendSlardarLog) {
            this.sendSlardarLogBase = monitor.sendSlardarLog;
            this.cacheLogList.slardarLog.map(value => {
                if (value)
                    this.sendSlardarLog(value);
                return null;
            });
        }
    };
    recordCollectionError = (name) => {
        this.realmState.collectionErrors.push({ name });
    };
    getOnlineSourceWithLog = async () => {
        ++this.realmState.collectionCount;
        const start = this.context.Date.now();
        const source = await this.context.collect();
        try {
            const { num = {}, bool = {}, str = {} } = source;
            const numKeys = Object.keys(num), boolKeys = Object.keys(bool), strKeys = Object.keys(str);
            const total = numKeys.length + boolKeys.length + strKeys.length;
            this.sendSlardarEvent({
                name: 'feature_collect',
                metrics: {
                    duration: this.context.Date.now() - start,
                    performance: this.context.performance.now(),
                },
                categories: {
                    result: total ? 1 : 0,
                    bool_total: boolKeys.length,
                    str_total: strKeys.length,
                    index: this.realmState.collectionCount,
                    total,
                    path_len: Array.isArray(this.dTraitHooksPath)
                        ? this.dTraitHooksPath.length
                        : 0,
                },
            });
            this.realmState.collectionErrors.map(error => {
                this.sendSlardarLog({
                    content: '[ft err][' + error.name + ']:[redacted]',
                });
                this.sendSlardarEvent({
                    name: 'feat_collect_error',
                    categories: { type: error.name },
                });
                return null;
            });
            this.realmState.collectionErrors = [];
        }
        catch {
        }
        return source;
    };
    setSource = () => {
        this.initPromise = Promise.all([
            this.getOnlineSourceWithLog().then(source => {
                this.updateFeature(source);
                this.collectStatus = true;
                return Promise.resolve(true);
            }),
        ]).then(() => {
            this.updateFeatureScheduled();
            return true;
        });
        this.observe(this.initPromise);
    };
    updateFeatureScheduled = () => {
    };
    updateGetLocalSource = (source) => {
        this.getLocalSource = source;
    };
    getHooksConfig = () => ({
        dTraitHooksHost: this.dTraitHooksHost,
        dTraitHooksPath: this.dTraitHooksPath,
        dTraitUrlRewriteRules: this.dTraitUrlRewriteRules,
    });
    init = async () => {
        const start = this.context.Date.now();
        this.centralRsaAesKey = await this.rsaEncrypt(this.centralRsaPub, this.aesKey);
        this.sendSlardarEvent({
            name: 'dtrait_online_init',
            metrics: { duration: this.context.Date.now() - start },
            categories: {
                has_aes_key: this.aesKey ? 1 : 0,
                has_central_rsa_aes_key: this.centralRsaAesKey ? 1 : 0,
                crypto: this.context.crypto.util ? 1 : 0,
            },
        });
        await this.initPromise;
        this.observe(this.getDTrait());
        return Promise.resolve(true);
    };
    getDTrait = async () => {
        const { centralString, edgeString } = this.featureProtocol.getResult();
        this.centralDTrait = centralString;
        this.edgeDTrait = edgeString;
        return Promise.resolve(true);
    };
    updateFeature = (source) => {
        const { bool, num, str } = source;
        for (const key in bool)
            this.featureProtocol.addBoolFeature(key, bool[key]);
        for (const key in num)
            this.featureProtocol.addNumFeature(key, num[key]);
        for (const key in str)
            this.featureProtocol.addStringFeature(key, str[key]);
        this.observe(this.getDTrait());
    };
    rsaEncrypt = async (key, plaintext) => await this.context.crypto.rsa?.encryptData(key, plaintext);
    aesEncrypt = async (key, plaintext) => {
        const { cipherText, iv } = (await this.context.crypto.aes?.encryptData(key, plaintext));
        void iv;
        return cipherText;
    };
    getCentralData = async ({ path }) => {
        let rewritten = path;
        await this.initPromise;
        if (!this.centralDTrait)
            await this.getDTrait();
        if (this.dTraitUrlRewriteRules && this.dTraitUrlRewriteRules.length > 0)
            this.dTraitUrlRewriteRules.forEach(rule => {
                if (Array.isArray(rule) &&
                    rule.length > 1 &&
                    rewritten.indexOf(rule[0]) === 0)
                    rewritten = rule[1];
            });
        const text = JSON.stringify({
            dtrait: this.centralDTrait,
            timestamp: Math.floor(this.context.Date.now() / 1000),
            sdkVersion: '1.0.31',
            path: rewritten,
        });
        const cipher = await this.aesEncrypt(this.aesKey, text);
        return this.centralVersion + '_' + this.centralRsaAesKey + '_' + cipher;
    };
    getEdgeData = async ({ path }) => {
        await this.initPromise;
        if (!this.edgeDTrait)
            await this.getDTrait();
        const text = JSON.stringify({
            dtrait: this.edgeDTrait,
            timestamp: Math.floor(this.context.Date.now() / 1000),
            path,
        });
        const cipher = this.aesEncrypt(this.aesKey, text);
        this.observe(cipher);
        return this.edgeVersion + '_' + this.edgeRsaAesKey + '_' + cipher;
    };
    getDTraitHeader = async (input) => {
        const [central] = await Promise.all([
            this.getCentralData(input),
            this.getEdgeData(input),
        ]);
        return central ? { 'x-tt-session-dtrait': central } : null;
    };
    setDTraitToken = (token) => {
        this.dTraitToken = token;
    };
    updateDTraitPath = (paths) => {
        this.dTraitHooksPath = [].concat(this.dTraitHooksPath, paths);
    };
    updateDTraitHost = (hosts) => {
        this.dTraitHooksHost = [].concat(this.dTraitHooksHost, hosts);
    };
    updateUrlRewriteRules = (rules) => {
        this.dTraitUrlRewriteRules = [].concat(this.dTraitUrlRewriteRules, rules);
    };
    hookConfig = ({ pathname, host, }) => {
        if (this.realmState.hookLogCount < 3) {
            this.realmState.hookLogCount++;
            this.sendSlardarEvent({
                name: 'dtrait_request_hook',
                metrics: { count: 1, duration: this.context.performance.now() },
                categories: {
                    pathname,
                    path_len: Array.isArray(this.dTraitHooksPath)
                        ? this.dTraitHooksPath.length
                        : 0,
                },
            });
        }
        let needProxy = false;
        for (let i = 0; i < this.dTraitHooksHost.length; i++)
            if (host && host.indexOf(this.dTraitHooksHost[i]) === 0) {
                needProxy = true;
                break;
            }
        for (let i = 0; i < this.dTraitHooksPath.length; i++)
            if (pathname.indexOf(this.dTraitHooksPath[i]) === 0) {
                needProxy = true;
                break;
            }
        return { needProxy };
    };
    processRequestConfig = async (config, meta) => {
        const { pathname, host } = config, start = this.context.Date.now();
        let isCache = 0, headers = null;
        try {
            if (this.dTraitPathCache?.[pathname] &&
                start - this.dTraitPathCache?.[pathname]?.time < 600_000) {
                headers = this.dTraitPathCache[pathname].val;
                isCache = 1;
            }
            else {
                headers = await this.getDTraitHeader({ path: pathname });
                if (this.collectStatus)
                    this.dTraitPathCache[pathname] = { time: start, val: headers };
            }
            const duration = this.context.Date.now() - start, length = headers?.['x-tt-session-dtrait'].length;
            if (!quietPaths.includes(pathname)) {
                this.sendSlardarEvent({
                    name: 'dtrait_request',
                    metrics: { duration },
                    categories: {
                        pathname,
                        host,
                        isCache,
                        centralDTraitLen: length,
                        result: headers ? 1 : 0,
                    },
                });
                meta.ucProxyParam = Object.assign({}, meta?.ucProxyParam || {}, {
                    startTime: this.context.Date.now(),
                });
            }
        }
        finally {
            config.headers = Object.assign({}, config.headers || {}, headers || {});
            return Promise.resolve(config);
        }
    };
    processResponseConfig = async (response, meta) => {
        const { config, httpCode } = response, { host, pathname } = config;
        if (!response?.headers || typeof response.headers === 'string')
            return true;
        const token = '' + (response.headers?.['x-tt-session-dtrait-token'] || ''), logid = '' + (response.headers?.['x-tt-logid'] || 'unknown');
        if (token)
            this.setDTraitToken(token);
        if (!quietPaths.includes(pathname))
            try {
                this.sendTeaLog('web_bd_ticket_dtrait_response', {
                    duration: meta?.ucProxyParam?.['startTime']
                        ? this.context.Date.now() -
                            meta.ucProxyParam['startTime']
                        : 0,
                    pathname,
                    host,
                    has_dTraitToken: token ? 1 : 0,
                    logid,
                    http_code: httpCode,
                    performance_time: this.context.performance?.now(),
                });
                this.sendSlardarEvent({
                    name: 'dtrait_response',
                    metrics: {
                        count: 1,
                        duration: meta?.ucProxyParam?.['startTime']
                            ? this.context.Date.now() -
                                meta.ucProxyParam['startTime']
                            : 0,
                    },
                    categories: {
                        pathname,
                        path: pathname,
                        host,
                        has_dTraitToken: token ? 1 : 0,
                        logId: logid,
                        http_code: httpCode,
                    },
                });
            }
            catch {
            }
        return true;
    };
    observe(task) {
        void task.catch(error => {
            try {
                this.context.onBackgroundError?.(error);
            }
            catch {
            }
        });
    }
    errorRequestConfig = ({ config, instance, errType, }) => {
        const { pathname, host } = config;
        try {
            this.sendSlardarEvent({
                name: 'dtrait_request_error',
                metrics: {
                    count: 1,
                    duration: instance?.ucProxyParam?.['startTime']
                        ? this.context.Date.now() -
                            instance.ucProxyParam['startTime']
                        : 0,
                },
                categories: { pathname, host, errType },
            });
            this.sendSlardarLog({
                content: '[request error]: [redacted]',
            });
        }
        catch {
        }
    };
}
//# sourceMappingURL=desktop-dtrait-request-core.js.map