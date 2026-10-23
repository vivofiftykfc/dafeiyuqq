export class DesktopWebSecureConfiguration {
    aid;
    config = {};
    setConfig(value) {
        const { scene, aid } = value;
        this.aid = aid;
        const key = String(scene);
        const previous = this.config[key];
        if (previous && Array.isArray(previous))
            previous.push(value);
        else
            this.config[key] = [value];
    }
    applyRemoteConfig(value) {
        if (!value || !this.aid)
            return;
        const selected = value[this.aid];
        if (selected && Array.isArray(selected))
            selected.forEach(entry => this.setConfig(entry));
    }
}
export function classifyDesktopWebSecureRequest(request, config, pageHref, signType, initType) {
    try {
        if (!config)
            return { needProxy: false };
        const url = (request || {}).url;
        if (!url)
            return { needProxy: false };
        let hostname;
        let pathname;
        try {
            const parsed = new URL(url, pageHref);
            hostname = parsed.host;
            pathname = parsed.pathname;
        }
        catch {
            pathname = url;
        }
        if (['mcs.zijieapi.com', 'mon.zijieapi.com'].includes(hostname || ''))
            return { needProxy: false };
        let needProxy = false;
        let onlyProxyResp = false;
        let needReport = true;
        let providerConfig;
        let consumerConfig;
        Object.keys(config).forEach(scene => {
            const entries = config[scene];
            if (!Array.isArray(entries))
                return;
            entries.forEach((entry) => {
                const { excludeConsumerPathList = [], providerPathList = [], providerHostPathList = [], onlyProviderPathList = [], consumerHostList = [], consumerPathList = [], consumerHostPathList = [], excludeReportPathList = [], } = entry || {};
                for (let i = 0; i < excludeReportPathList.length; i++) {
                    if (pathname && pathname.indexOf(excludeReportPathList[i]) === 0)
                        needReport = false;
                }
                if (excludeConsumerPathList.length > 0 && !consumerConfig) {
                    for (let i = 0; i < onlyProviderPathList.length; i++) {
                        if (pathname && pathname.indexOf(excludeConsumerPathList[i]) === 0) {
                            needProxy = false;
                            onlyProxyResp = false;
                            break;
                        }
                    }
                }
                if (onlyProviderPathList.length > 0 && !providerConfig) {
                    for (let i = 0; i < onlyProviderPathList.length; i++) {
                        if (pathname && pathname.indexOf(onlyProviderPathList[i]) === 0) {
                            needProxy = true;
                            onlyProxyResp = true;
                            providerConfig = entry;
                            break;
                        }
                    }
                }
                if (providerHostPathList.length > 0 && !providerConfig) {
                    for (let i = 0; i < providerHostPathList.length; i++) {
                        if (hostname && `${hostname}${pathname}`.indexOf(providerHostPathList[i]) === 0) {
                            needProxy = true;
                            onlyProxyResp = false;
                            providerConfig = entry;
                            break;
                        }
                    }
                }
                if (providerPathList.length > 0 && !providerConfig) {
                    for (let i = 0; i < providerPathList.length; i++) {
                        if (pathname && pathname.indexOf(providerPathList[i]) === 0) {
                            needProxy = true;
                            onlyProxyResp = false;
                            providerConfig = entry;
                            break;
                        }
                    }
                }
                if (consumerHostPathList.length > 0 && !consumerConfig) {
                    for (let i = 0; i < consumerHostPathList.length; i++) {
                        if (hostname && `${hostname}${pathname}`.indexOf(consumerHostPathList[i]) === 0) {
                            needProxy = true;
                            onlyProxyResp = false;
                            consumerConfig = entry;
                            break;
                        }
                    }
                }
                if (consumerHostList.length > 0 && !consumerConfig) {
                    for (let i = 0; i < consumerHostList.length; i++) {
                        if (hostname && hostname.indexOf(consumerHostList[i]) === 0) {
                            needProxy = true;
                            onlyProxyResp = false;
                            consumerConfig = entry;
                            break;
                        }
                    }
                }
                if (consumerPathList.length > 0 && !consumerConfig) {
                    for (let i = 0; i < consumerPathList.length; i++) {
                        if (pathname && pathname.indexOf(consumerPathList[i]) === 0) {
                            needProxy = true;
                            onlyProxyResp = false;
                            consumerConfig = entry;
                            break;
                        }
                    }
                }
            });
        });
        return { needProxy, onlyProxyResp, providerConfig, consumerConfig, signType, initType, pathname, hostname, needReport };
    }
    catch {
        return { needProxy: false };
    }
}
//# sourceMappingURL=desktop-web-secure-config.js.map