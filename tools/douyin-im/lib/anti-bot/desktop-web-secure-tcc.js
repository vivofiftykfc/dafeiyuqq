const CACHE_KEY = 'ztsdk_tcc_config';
export class DesktopWebSecureTcc {
    context;
    initialized = false;
    configs = {};
    constructor(context) {
        this.context = context;
    }
    async getConfig({ tccPsm, zone = 'default', key }) {
        const cacheId = `${tccPsm.split('.').join('-')}-${zone}`;
        const cached = this.readCache();
        let result;
        if (cached)
            result = cached;
        else if (this.initialized && this.configs[cacheId])
            result = this.configs[cacheId];
        else if (this.initialized && !this.configs[cacheId]) {
            result = await this.fetchConfig(tccPsm, zone);
            this.configs[cacheId] = result;
        }
        else {
            result = await this.init(tccPsm, zone);
            this.configs[cacheId] = result;
        }
        return key ? result?.[key] || result : result;
    }
    async init(tccPsm, zone) {
        this.initialized = true;
        return await this.fetchConfig(tccPsm, zone);
    }
    readCache() {
        try {
            const raw = this.context.window.localStorage.getItem(CACHE_KEY);
            if (!raw)
                return null;
            const { value, expire } = JSON.parse(raw);
            return new this.context.Date().getTime() > expire ? null : value;
        }
        catch {
            return null;
        }
    }
    saveCache(value) {
        try {
            const cached = { value, expire: new this.context.Date().getTime() + 21_600_000 };
            this.context.window.localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
        }
        catch { }
    }
    fetchConfig(tccPsm = 'ucenter.fe.ztsdk', zone = 'default') {
        return new Promise(resolve => {
            if (!this.context.window.XMLHttpRequest)
                return;
            const xhr = new this.context.XMLHttpRequest();
            xhr.open('get', `https://lf3-config.bytetcc.com/obj/tcc-config-web/tcc-v2-data-${tccPsm}-${zone}`, false);
            xhr.onreadystatechange = () => {
                if (xhr.readyState !== 4 || xhr.status !== 200)
                    return;
                try {
                    const data = JSON.parse(xhr.response).data;
                    if (!data || Object.keys(data).length === 0)
                        return;
                    Object.keys(data).forEach(key => { data[key] = JSON.parse(data[key]); });
                    this.saveCache(data);
                    resolve(data);
                }
                catch { }
            };
            xhr.send();
        });
    }
}
//# sourceMappingURL=desktop-web-secure-tcc.js.map