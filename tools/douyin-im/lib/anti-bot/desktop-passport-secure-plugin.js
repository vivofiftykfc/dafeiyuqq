const initialized = new WeakSet();
export class DesktopPassportSecurePlugin {
    context;
    initProps;
    hasInit = false;
    defaultConfig = { scene: 'web_protect', signVersion: 2 };
    defaultWebConsumerPathList = ['/passport/token/beat/web', '/passport/account/info/v2'];
    constructor(context, initProps) {
        this.context = context;
        this.initProps = initProps;
    }
    init = () => {
        if (this.hasInit || initialized.has(this.context.realm))
            return;
        const { aid, ztsdkOptions = {}, ssoZtsdkOptions = {}, dtrait = true } = this.initProps;
        void this.initProps.dtraitOption;
        const { agid = 1, initCallback, enableHeaderOptions = true, enableCookieOptions = true, ...web } = ztsdkOptions;
        const { enable: enableSso = true, ...sso } = ssoZtsdkOptions;
        const { consumerPathList = [], providerPathList = [], onlyProviderPathList = [], urlRewriteRules = [], disableCrossStorage = false, ...webRest } = web;
        const { consumerPathList: ssoConsumers = [], providerPathList: ssoProviders = [], urlRewriteRules: ssoRules = [], ...ssoRest } = sso;
        const sdk = this.context.sdk;
        if (enableCookieOptions)
            sdk.setConfig({ aid, certType: 'cookie', ...this.defaultConfig,
                consumerPathList: append(append([], consumerPathList || []), this.defaultWebConsumerPathList), ...ztsdkOptions });
        if (enableHeaderOptions)
            sdk.setConfig({ aid, certType: 'header', scene: 'web_protect', namespace: 'web', signVersion: 2,
                providerPathList: append(['/passport/web/sms_login/', '/passport/web/sms_login_only/', '/passport/web/email/login/', '/passport/web/email/code_login/',
                    '/passport/web/email/quick_login/', '/passport/web/web_login/', '/passport/web/check_qrconnect/', '/passport/web/user/login/'], providerPathList || []),
                onlyProviderPathList: append(['/passport/web/one_login/'], onlyProviderPathList || []),
                consumerPathList: append(append([], consumerPathList || []), this.defaultWebConsumerPathList), urlRewriteRules: append([], (urlRewriteRules || [])), ...webRest });
        if (enableSso)
            sdk.setConfig({ aid, certType: 'header', scene: 'sso', namespace: 'sso', signVersion: 2,
                consumerPathList: append(['sso.douyin.com/check_login/'], ssoConsumers || []),
                providerPathList: append(['sso.douyin.com/quick_login/v2/', 'sso.douyin.com/check_qrconnect/', 'sso.douyin.com/account_login/v2/',
                    'sso.douyin.com/one_login/', 'sso.douyin.com/quick_login_only/'], ssoProviders || []),
                urlRewriteRules: append([['sso.douyin.com/check_login/', '/passport/sso/check_login/']], (ssoRules || [])), ...ssoRest });
        if (disableCrossStorage)
            sdk.setDisableCrossStorage(true);
        sdk.setAgidAndHost(agid);
        const webId = this.context.getCookie('passport_csrf_token') || this.context.getCookie('passport_csrf_token_default') || '';
        sdk.setWebId(webId);
        const pending = sdk.start();
        void pending.catch(error => { try {
            this.context.onBackgroundError?.(error);
        }
        catch { } });
        if (dtrait)
            sdk.startDTrait({ aid, webId });
        initialized.add(this.context.realm);
        initCallback?.();
        this.hasInit = true;
    };
}
function append(target, source) {
    const copy = [];
    for (let i = 0, length = source.length; i < length; i++)
        copy[i] = source[i];
    return target.concat(copy);
}
//# sourceMappingURL=desktop-passport-secure-plugin.js.map