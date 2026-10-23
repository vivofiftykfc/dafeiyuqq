import { DesktopDTraitParameters, } from './desktop-dtrait-parameters.js';
export class DesktopDTraitBootstrap {
    context;
    parameters;
    coreResult = false;
    loaded = false;
    loading;
    builtin = {
        urlVersion: '1.0.31',
        centralRsaPub: 'LS0tLS1CRUdJTiBSU0EgUFVCTElDIEtFWS0tLS0tCk1JSUJDZ0tDQVFFQTQrZHZ2WTd1TStvcGMrbkxHL0R1bVNlRm83YVZjSW0xTE8rbVVJcldwclJ6UDBhMUdwRVEKNHF0TzlNUmYvbHdFSXgzOCs0Qlo0WE9HemV2VnR1VXZmSU9VRTdBVHRRVzdGS0pmNVBuU0xDSTYvazB2bDFGQwpMVVNWbUVQNnFQSnJJalo0elhvcWkzeXVOWisxb2RiUkEvL0dIZ2NnU3l5eWFMcXp3amtwV0dYb3VNWW12WXNTCnBway9mdjJFV0FCc3RQTnhXYTRFT0JDYWRUVVBrWE5RNzZOQkVQOXh6ZkpTMjB3aUR2MW9TL3ZLdnJTVXBXY0oKbmF6a2tCdnFRYmJBcVZiUUZURi9EUGlrcHB1NlpUNmxHSVh2SktDcmVlRmlIQTJxSzZ0UzE4U1dWSFc5QVJ6MQorcGpCMWVxSUlZdG9oV3BUMkI0ME9DNE84dFZlQkFuYmlRSURBUUFCCi0tLS0tRU5EIFJTQSBQVUJMSUMgS0VZLS0tLS0=',
        centralVersion: 'd0',
        edgeRsaPub: 'LS0tLS1CRUdJTiBSU0EgUFVCTElDIEtFWS0tLS0tCk1JSUJDZ0tDQVFFQXlFQkQ0MXQzcWpqL1NOaU5rT3BBbnNGdGZKZ0F5MGF5VTZCbEJ3RS9EZVZjNkdWV0xWUk4KWjdiMWRuRHVmQk5iUm1XQjlZeWVyYm1FOFFDM2lPOXp1NVFWd2x4SGV2ZEN0ZFFyeDZpQzF3QVRoaHFjdTNIYgprZ1dsazZ1Ylk5MXRvRFhNd0k2WGdmRUoyVEJsdHVSbklXRjR5RDVEaEc2c3lSSVNmNTRMWGY0WjgzbzlGcXNvCmlsNkV3cVZCbEU3dXlIY3dJOTA5WDg4Rlc3MXFLdmJMU040OGJlQ0EwbzFmZitqbmhRakNBTDZqbUR2dUhJeWEKUk1vYm1wRFVOLzQ3L3NHbDNzNDlFOEZFSEFXUmk5d1cyc2NZUDBJTkJXUlR5RlRHcG9GUGlqekJFUndnYzdrWQozVno3ZytSMXd2RkxUSEVITEtYUWFwTHpEMWR5Uk81YUt3SURBUUFCCi0tLS0tRU5EIFJTQSBQVUJMSUMgS0VZLS0tLS0K',
        edgeVersion: 'd0',
        dTraitVersion: '0',
    };
    constructor(context) {
        this.context = context;
        this.parameters = new DesktopDTraitParameters(context.parameters);
    }
    setWebId = (value) => {
        this.context.monitor.setWebId?.(value);
    };
    start = async (options) => {
        const { aid = 6383, consumerPathList = [], urlRewriteRules = [], consumerHostList = [], reportAppLog, webId, libraGroup = '', delayCollect = 0, useBuildIn = false, } = options;
        const { monitor, window } = this.context, now = () => this.context.parameters.Date.now();
        monitor.init({
            appId: aid,
            commonParams: { dTraitVersion: '1.0.23' },
            webId,
            reportAppLog,
        }, {
            slardarInstance: this.context.monitorInstances?.slardarInstance,
            teaInstance: this.context.monitorInstances?.teaInstance,
        });
        let params = {
            centralVersion: '',
            dTraitVersion: '',
            edgeVersion: '',
            urlVersion: '',
            centralRsaPub: '',
            edgeRsaPub: '',
        };
        const initialize = async () => {
            if (useBuildIn) {
                const start = now();
                let cdnResult = 0;
                try {
                    if (!window.DTraitSDK)
                        await this.loadCore('1.0.31', options.aid);
                    params = { ...this.builtin };
                    cdnResult = 1;
                }
                catch {
                }
                monitor.sendSlardarEvent({
                    name: 'dtrait_sdk_init_local',
                    metrics: {
                        duration: now() - start,
                        performance: this.context.performance?.now?.() || 0,
                    },
                    categories: { cdn_result: cdnResult, ...this.cryptoPresence() },
                });
            }
            else {
                const start = now();
                params = await this.parameters.get(aid).catch(error => {
                    monitor.sendSlardarLog({
                        content: `[getDTraitParamsWithCache error]: ${error}`,
                    });
                    return this.builtin;
                });
                const duration = now() - start;
                if (!this.coreResult) {
                    let urlDuration = 0, cdnResult = 0;
                    try {
                        const begin = now();
                        await this.loadCore(params['urlVersion'], options.aid);
                        urlDuration = now() - begin;
                        cdnResult = 1;
                    }
                    catch {
                    }
                    monitor.sendSlardarEvent({
                        name: 'dtrait_sdk_init',
                        metrics: {
                            url_duration: urlDuration,
                            int_duration: duration,
                            performance: this.context.performance?.now?.() || 0,
                        },
                        categories: {
                            dataFrom: params['dataFrom'],
                            cdn_result: cdnResult,
                            ...this.cryptoPresence(),
                        },
                    });
                }
            }
        };
        await initialize();
        monitor.setConfig({
            centralVersion: params?.['centralVersion'],
            dTraitVersion: params?.['dTraitVersion'],
            edgeVersion: params?.['edgeVersion'],
            urlVersion: params?.['urlVersion'],
            dTraitContainerSdkVersion: '1.0.23',
            useBuildIn: Number(useBuildIn || false),
        });
        const module = (this.context.localCore
            ? this.context.localCore.resolve(params)
            : window.DTraitSDK);
        return (this.coreResult = (module.default || module).getInstance(params, {
            dTraitPath: consumerPathList,
            dTraitHost: consumerHostList,
            urlRewriteRules,
            containerSdkVersion: '1.0.23',
            libraGroup,
            delayCollect,
            monitor: {
                sendSlardarEvent: monitor.sendSlardarEvent,
                sendSlardarLog: monitor.sendSlardarLog,
                sendTeaLog: monitor.sendTeaLog,
            },
        }));
    };
    cryptoPresence() {
        const window = this.context.window;
        return {
            aesEncrypt: window.DTraitUcAesEncrypt ? 1 : 0,
            rsaEncrypt: window.DTraitUcRsaEncrypt ? 1 : 0,
            cryptoJSUtil: window.DTraitUcCryptoJSUtil ? 1 : 0,
        };
    }
    loadCore(version, aid) {
        if (this.loaded)
            return Promise.resolve(true);
        if (!this.loading)
            this.loading = new Promise((resolve, reject) => {
                this.loadWithRetry(version, aid)
                    .then(value => {
                    if (value)
                        this.loaded = true;
                    resolve(value);
                    this.loading = undefined;
                })
                    .catch(error => {
                    reject(error);
                    this.loading = undefined;
                });
            });
        return this.loading;
    }
    async loadWithRetry(version, aid) {
        if (this.context.localCore)
            return this.context.localCore.load(version, aid);
        const url = version && version.startsWith('http')
            ? version
            : `${aid === 6383 ? 'https://lf-douyin-pc-web.douyinstatic.com' : 'https://lf-ucenter-web.yhgfb-cn-static.com'}/obj/passport-fe/ucenter_fe/@byted/uc-secure-dtrait-core/${version}/dist/index.umd.production.js`;
        try {
            for (let remaining = 5;; remaining--) {
                try {
                    await this.loadScript(url);
                    return true;
                }
                catch (error) {
                    if (!remaining)
                        throw error;
                }
            }
        }
        catch (error) {
            this.context.monitor.sendSlardarLog({
                content: `[loadResource error]: ${error}`,
            });
            throw error;
        }
    }
    loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = this.context.document.createElement('script');
            script.type = 'text/javascript';
            script.src = url;
            this.context.document
                .getElementsByTagName('head')[0]
                .appendChild(script);
            if (script.readyState)
                script.onreadystatechange = () => {
                    if (script.readyState === 'complete' ||
                        script.readyState === 'loaded') {
                        script.onreadystatechange = null;
                        resolve(true);
                    }
                };
            else {
                script.onload = () => resolve(true);
                script.onerror = reject;
            }
        });
    }
}
//# sourceMappingURL=desktop-dtrait-bootstrap.js.map