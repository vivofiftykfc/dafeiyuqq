import { randomUUID } from 'crypto';
import { PassportRequestError } from '../../desktop/passport-error.js';
import { AccountStore } from '../../store/account-store.js';
import { LoginVerification, } from './login-verification.js';
import { openBrowserVerification, } from './browser-verification.js';
function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
function qrPollDelay(pollCount) {
    if (pollCount >= 180)
        return 5_000;
    if (pollCount >= 60)
        return 3_000;
    return 1_000;
}
export class AccountAuth {
    config;
    hooks;
    pendingId;
    qrInfo;
    attempt = 0;
    pendingVerification;
    pendingSubAccounts;
    lastSmsCode;
    constructor(config, hooks) {
        this.config = config;
        this.hooks = hooks;
    }
    get loginMethod() {
        return this.config.loginMethod;
    }
    get qrCodeInfo() {
        return this.qrInfo;
    }
    setClient(client) {
        this.config.client = client;
    }
    async refreshSession(scene, signal) {
        signal.throwIfAborted();
        const attempt = this.attempt;
        const client = this.config.client;
        const cancel = () => {
            if (this.attempt === attempt)
                this.pendingVerification?.cancel('Session 续期已停止');
        };
        signal.addEventListener('abort', cancel, { once: true });
        try {
            let response = await client.sendPassportTokenBeat(scene, signal);
            signal.throwIfAborted();
            this.ensureActive(attempt);
            while (!passportSucceeded(response)) {
                const result = await this.waitForPassportVerification('token-beat', response.data, client);
                signal.throwIfAborted();
                this.ensureActive(attempt);
                if (!result)
                    return response;
                response = await client.sendPassportTokenBeat(scene, signal, {
                    ...mergeVerificationOptions({}, result, normalizePassportData(response.data)), retry: response,
                });
                signal.throwIfAborted();
                this.ensureActive(attempt);
            }
            return response;
        }
        finally {
            signal.removeEventListener('abort', cancel);
        }
    }
    async probeRestoredSession(client, signal) {
        signal?.throwIfAborted();
        const attempt = this.attempt;
        const cancel = () => {
            if (this.attempt === attempt)
                this.pendingVerification?.cancel('Session 恢复已取消');
        };
        signal?.addEventListener('abort', cancel, { once: true });
        try {
            return await client.probeSession(signal, async (response) => {
                signal?.throwIfAborted();
                this.ensureActive(attempt);
                const result = await this.waitForPassportVerification('account-info', response.data, client);
                signal?.throwIfAborted();
                this.ensureActive(attempt);
                return result ? mergeVerificationOptions({}, result, normalizePassportData(response.data)) : undefined;
            });
        }
        finally {
            signal?.removeEventListener('abort', cancel);
        }
    }
    cancel() {
        this.attempt += 1;
        this.config.client.invalidateAuthenticationResponses();
        this.pendingVerification?.cancel('登录已取消');
        delete this.pendingVerification;
        delete this.pendingSubAccounts;
        delete this.lastSmsCode;
        delete this.qrInfo;
        if (this.pendingId)
            this.config.store.removePending(this.pendingId);
        delete this.pendingId;
    }
    async beginLogin() {
        const attempt = ++this.attempt;
        delete this.pendingSubAccounts;
        delete this.lastSmsCode;
        this.ensurePending();
        const client = this.config.client;
        client.startTicketGuard();
        await client.startDeviceLifecycle();
        this.ensureActive(attempt);
        const pending = this.config.store.loadPending(this.pendingId);
        if (!pending)
            throw new Error('登录已取消，不能保存设备身份');
        Object.assign(pending.deviceProfile, { deviceId: client.getDeviceId(), installId: client.getInstallId() });
        this.config.store.createPending(pending);
        try {
            await client.ttwidCheck();
        }
        catch {
        }
        this.ensureActive(attempt);
        const { loginMethod, mobile, password } = this.config;
        if (loginMethod === 'qr') {
            await this.createQrcode(attempt);
            return;
        }
        if (loginMethod === 'sms' && mobile) {
            await this.sendSmsCode(attempt);
            return;
        }
        if (loginMethod === 'password' && mobile && password) {
            await this.performPasswordLogin(attempt);
            return;
        }
        throw new Error(`登录配置不完整: method=${loginMethod}`);
    }
    async createQrcode(attempt) {
        let options = {};
        let retry;
        for (;;) {
            this.ensureActive(attempt);
            let qrInfo;
            try {
                qrInfo = retry
                    ? await this.config.client.getQrcode({ error: retry, ...(options.fp ? { fp: options.fp } : {}) })
                    : await this.config.client.getQrcode();
            }
            catch (error) {
                this.ensureActive(attempt);
                if (!(error instanceof PassportRequestError))
                    throw error;
                const data = error.data;
                const result = await this.waitForPassportVerification('get-qrcode', data);
                this.ensureActive(attempt);
                if (!result)
                    throw error;
                options = mergeVerificationOptions(options, result, normalizePassportData(data));
                retry = error;
                continue;
            }
            this.ensureActive(attempt);
            this.qrInfo = qrInfo;
            this.hooks.onQrcode(qrInfo);
            return;
        }
    }
    async continueQrLogin() {
        if (this.config.loginMethod !== 'qr') {
            throw new Error('continueQrLogin() 仅用于扫码登录');
        }
        if (!this.qrInfo) {
            throw new Error('请先 beginLogin() 并等待 onQrcode');
        }
        const attempt = this.attempt;
        let lastStatus;
        let scanned = false;
        let refreshes = 0;
        let transientPassportErrors = 0;
        let missingPassportErrors = 0;
        const retryQrError = (code) => {
            if ((code === 6 || code === 'ECONNABORTED') && transientPassportErrors < 3) {
                transientPassportErrors += 1;
                return true;
            }
            if (!code && missingPassportErrors < 3) {
                missingPassportErrors += 1;
                return true;
            }
            return false;
        };
        let pollCount = 0;
        let extraBody = {};
        let verificationOptions = {};
        let legacyMfaCompleted = false;
        for (;;) {
            this.ensureActive(attempt);
            let poll;
            if (!verificationOptions.retry)
                pollCount += 1;
            try {
                poll = Object.keys(verificationOptions).length > 0
                    ? await this.config.client.checkQrconnect(this.qrInfo.token, extraBody, verificationOptions)
                    : await this.config.client.checkQrconnect(this.qrInfo.token, extraBody);
            }
            catch (error) {
                this.ensureActive(attempt);
                if (!retryQrError(asRecord(error)?.['error_code'])) {
                    throw new Error(`二维码状态查询失败: ${error instanceof Error ? error.message : String(error)}`);
                }
                await sleep(qrPollDelay(pollCount));
                continue;
            }
            this.ensureActive(attempt);
            const data = (asRecord(poll.data) ?? {});
            const passportData = data;
            const normalizedPassportData = normalizePassportData(passportData);
            const passportDecision = poll.message === 'success' ? undefined : verificationDecision(passportData);
            if (passportDecision) {
                this.hooks.onQrStatus({
                    status: 'verifying',
                    ...(data.description ? { description: data.description } : {}),
                });
                const result = await this.waitForVerification(passportVerificationDescriptor('qr-connect', normalizedPassportData, passportDecision), { connection: this.config.client });
                this.ensureActive(attempt);
                verificationOptions = mergeVerificationOptions(verificationOptions, result, normalizedPassportData);
                verificationOptions.retry = poll;
                this.hooks.onQrStatus({ status: 'verified' });
                continue;
            }
            verificationOptions = {};
            if (!legacyMfaCompleted && (data.account_flow === 'verify' || data.biz_params != null)) {
                this.hooks.onQrStatus({
                    status: 'verifying',
                    ...(data.description ? { description: data.description } : {}),
                });
                const challenge = qrMfaChallenge(data);
                const resumeFields = pickQrBizParams(data.biz_params);
                const result = await this.waitForVerification({
                    source: 'qr-connect',
                    operation: 'qr-connect',
                    ...(data.error_code != null ? { errorCode: data.error_code } : {}),
                    ...(data.description ? { description: data.description } : {}),
                    decision: {
                        ...challenge,
                        verify_from: 'qr_connect_mfa',
                        std_verify_way: 'mobile_sms_verify',
                    },
                    methods: ['mobile-sms'],
                }, {
                    connection: this.config.client,
                    qrMfa: { challenge, resumeFields },
                });
                this.ensureActive(attempt);
                extraBody = {
                    ...extraBody,
                    ...resumeFields,
                    ...stringRecord(result.fields),
                };
                legacyMfaCompleted = true;
                this.hooks.onQrStatus({ status: 'verified' });
                continue;
            }
            if (!passportSucceeded(poll)) {
                if (!retryQrError(normalizedPassportData['error_code'])) {
                    throw passportLoginError(normalizedPassportData);
                }
                await sleep(qrPollDelay(pollCount));
                continue;
            }
            if (typeof data.status !== 'string' || data.status.length === 0) {
                throw new Error('二维码状态响应缺少有效状态');
            }
            if (data.status !== lastStatus) {
                lastStatus = data.status;
                const screenName = qrScreenName(data);
                const isScanned = data.status === 'scanned' || data.status === '2';
                if (!isScanned || !scanned) {
                    this.hooks.onQrStatus({
                        status: data.status,
                        ...(screenName ? { screenName } : {}),
                    });
                }
                if (isScanned)
                    scanned = true;
            }
            if (data.status === 'confirmed' || data.status === '3') {
                await this.finishLogin(data.user_data, attempt);
                return;
            }
            if (data.status === 'expired' || data.status === 'refused' || data.status === '4' || data.status === '5') {
                if (data.token && data.qrcode && refreshes < 5) {
                    refreshes += 1;
                    this.qrInfo = {
                        token: data.token,
                        qrcodeBase64: data.qrcode,
                        expireTime: data.expire_time ?? Math.floor((Date.now() + 180_000) / 1000),
                        ...(data.qrcode_index_url ? { qrcodeIndexUrl: data.qrcode_index_url } : {}),
                    };
                    lastStatus = undefined;
                    scanned = false;
                    extraBody = {};
                    verificationOptions = {};
                    legacyMfaCompleted = false;
                    this.hooks.onQrcode(this.qrInfo);
                    await sleep(qrPollDelay(pollCount));
                    continue;
                }
                throw new Error(data.status === 'refused' ? '二维码登录已拒绝' : '二维码已失效');
            }
            if (!['new', '1', 'scanned', '2'].includes(data.status)) {
                throw new Error('二维码状态响应无法识别');
            }
            await sleep(qrPollDelay(pollCount));
        }
    }
    async continueSmsLogin(code) {
        const attempt = this.attempt;
        const mobile = this.config.mobile;
        if (!mobile) {
            throw new Error('未配置手机号');
        }
        const normalizedCode = code.trim();
        if (!/^\d{4,8}$/.test(normalizedCode))
            throw new Error('短信验证码格式不正确');
        this.lastSmsCode = normalizedCode;
        await this.performSmsLogin(attempt);
    }
    async requestSmsCode() {
        if (!this.config.mobile)
            throw new Error('未配置手机号');
        if (this.config.loginMethod === 'qr')
            throw new Error('扫码账号不能切换为手机号登录');
        this.config.loginMethod = 'sms';
        delete this.pendingSubAccounts;
        await this.sendSmsCode(this.attempt);
    }
    async requestVoiceCode() {
        if (!this.config.mobile)
            throw new Error('未配置手机号');
        if (this.config.loginMethod === 'qr')
            throw new Error('扫码账号不能请求语音验证码');
        this.config.loginMethod = 'sms';
        delete this.pendingSubAccounts;
        await this.sendVoiceCode(this.attempt);
    }
    async continueWithSubAccount(selection) {
        const pending = this.pendingSubAccounts;
        const mobile = this.config.mobile;
        if (!pending || !mobile)
            throw new Error('当前没有等待选择的登录账号');
        const selected = selection.secUid
            ? pending.accounts.find((account) => account.secUid === selection.secUid)
            : undefined;
        if (!selection.registerNewUser && !selected)
            throw new Error('登录候选账号不存在');
        if (selected?.isEnterprise && !selected.isActive)
            throw new Error('企业账号尚未激活');
        if (selection.registerNewUser && !pending.accounts.every((account) => !account.isMainAccount)) {
            throw new Error('当前手机号已有关联主账号，不能新建账号');
        }
        const options = {
            subAccount: {
                smsCodeKey: pending.smsCodeKey,
                ...(selection.secUid ? { secUid: selection.secUid } : {}),
                ...(selection.registerNewUser ? { registerNewUser: true } : {}),
            },
        };
        if (pending.method === 'password')
            await this.performPasswordLogin(this.attempt, options);
        else
            await this.performSmsLogin(this.attempt, options);
    }
    async finishLogin(userData, attempt) {
        this.ensureActive(attempt);
        const sessionId = this.config.client.jar.get('sessionid');
        if (!sessionId || sessionId.toLowerCase() === 'deleted') {
            throw new Error('登录成功但未拿到 sessionid');
        }
        let completeUserData = userData;
        if (this.config.loginMethod === 'qr' || !numericUserId(completeUserData)) {
            try {
                const response = await this.config.client.getSelfProfile();
                const profile = asRecord(response['user']);
                const uid = profile?.['uid'] ?? profile?.['user_id_str'] ?? profile?.['user_id'];
                if (uid != null || profile?.['nickname']) {
                    completeUserData = {
                        ...(completeUserData ?? {}),
                        ...(uid != null ? { user_id_str: String(uid) } : {}),
                        ...(profile?.['nickname'] ? { screen_name: String(profile['nickname']) } : {}),
                    };
                }
            }
            catch {
            }
        }
        this.ensureActive(attempt);
        const stored = this.promote(completeUserData);
        delete this.pendingId;
        this.ensureActive(attempt);
        await this.hooks.onLoggedIn(stored);
    }
    ensureActive(attempt) {
        if (attempt !== this.attempt)
            throw new Error('登录已取消');
    }
    promote(userData) {
        const pendingId = this.ensurePending();
        const { client, store } = this.config;
        const platformUid = AccountStore.resolveCanonicalUserId(userData);
        const meta = {};
        const ud = userData;
        if (ud?.['screen_name'])
            meta['screenName'] = String(ud['screen_name']);
        if (ud?.['avatar_url'])
            meta['avatarUrl'] = String(ud['avatar_url']);
        const uidTt = client.jar.get('uid_tt');
        if (uidTt)
            meta['passportUidTt'] = uidTt;
        return store.promote(pendingId, platformUid, AccountStore.buildSession(client.getCookies(), client.getTicketGuardState()), meta);
    }
    ensurePending() {
        if (!this.pendingId) {
            this.pendingId = randomUUID();
            const { client, store, loginMethod } = this.config;
            const screen = client.getScreenSize();
            store.createPending({
                id: this.pendingId,
                loginMethod: loginMethod === 'qr' ? 'qr' : loginMethod === 'sms' ? 'sms' : 'password',
                startedAt: new Date().toISOString(),
                deviceProfile: AccountStore.buildDeviceProfile(client.getUserAgent(), client.getBizTraceId(), {
                    deviceId: client.getDeviceId(),
                    installId: client.getInstallId(),
                    guid: client.getGuid(),
                    screenWidth: screen.width,
                    screenHeight: screen.height,
                }),
                cookies: client.getCookies(),
            });
            const pendingId = this.pendingId;
            client.setDeviceUpdateHandler(device => {
                if (this.pendingId !== pendingId || this.config.client !== client)
                    return;
                const pending = store.loadPending(pendingId);
                if (!pending)
                    throw new Error('登录已取消，不能保存设备身份');
                Object.assign(pending.deviceProfile, device);
                store.createPending(pending);
            });
            client.enableTicketGuard(state => {
                if (this.pendingId !== pendingId || this.config.client !== client)
                    return;
                const pending = store.loadPending(pendingId);
                if (!pending)
                    throw new Error('登录已取消，不能保存验证票据');
                pending.cookies = client.getCookies();
                pending.desktopTicketGuard = state;
                store.createPending(pending);
            });
        }
        return this.pendingId;
    }
    async performPasswordLogin(attempt, options = {}) {
        const mobile = this.config.mobile;
        const password = this.config.password;
        if (!mobile || !password)
            throw new Error('密码登录配置不完整');
        const response = hasPassportOptions(options)
            ? await this.config.client.userLogin(mobile, password, options)
            : await this.config.client.userLogin(mobile, password);
        this.ensureActive(attempt);
        if (passportSucceeded(response)) {
            delete this.pendingSubAccounts;
            await this.finishLogin(normalizePassportData(response.data), attempt);
            return;
        }
        const responseData = normalizePassportData(response.data);
        const result = await this.waitForPassportVerification('password-login', response.data);
        if (result) {
            await this.performPasswordLogin(attempt, { ...mergeVerificationOptions(options, result, responseData), retry: response });
            return;
        }
        if (this.handleLoginBranch('password', responseData))
            return;
        throw passportLoginError(responseData);
    }
    async performSmsLogin(attempt, options = {}) {
        const mobile = this.config.mobile;
        if (!mobile)
            throw new Error('未配置手机号');
        const code = this.requiredSmsCode();
        const response = hasPassportOptions(options)
            ? await this.config.client.smsLogin(mobile, code, options)
            : await this.config.client.smsLogin(mobile, code);
        this.ensureActive(attempt);
        if (passportSucceeded(response)) {
            delete this.pendingSubAccounts;
            await this.finishLogin(normalizePassportData(response.data), attempt);
            return;
        }
        const responseData = normalizePassportData(response.data);
        const result = await this.waitForPassportVerification('sms-login', response.data);
        if (result) {
            await this.performSmsLogin(attempt, { ...mergeVerificationOptions(options, result, responseData), retry: response });
            return;
        }
        if (this.handleLoginBranch('sms', responseData))
            return;
        throw passportLoginError(responseData);
    }
    async waitForPassportVerification(operation, data, client = this.config.client) {
        const decision = verificationDecision(data);
        if (!decision)
            return undefined;
        const response = normalizePassportData(data);
        return this.waitForVerification(passportVerificationDescriptor(operation, response, decision), { connection: client });
    }
    async sendSmsCode(attempt, options = {}) {
        const mobile = this.config.mobile;
        if (!mobile)
            throw new Error('未配置手机号');
        const response = hasPassportOptions(options)
            ? await this.config.client.sendCode(mobile, options)
            : await this.config.client.sendCode(mobile);
        this.ensureActive(attempt);
        if (!passportSucceeded(response)) {
            const responseData = normalizePassportData(response.data);
            const result = await this.waitForPassportVerification('send-sms', response.data);
            if (result) {
                await this.sendSmsCode(attempt, { ...mergeVerificationOptions(options, result, responseData), retry: response });
                return;
            }
            throw passportLoginError(responseData);
        }
        const payload = { mobile };
        if (response.data.mobile != null)
            payload.maskedMobile = String(response.data.mobile);
        this.hooks.onSms(payload);
    }
    async sendVoiceCode(attempt, options = {}) {
        const mobile = this.config.mobile;
        if (!mobile)
            throw new Error('未配置手机号');
        const response = hasPassportOptions(options)
            ? await this.config.client.sendVoiceCode(mobile, options)
            : await this.config.client.sendVoiceCode(mobile);
        this.ensureActive(attempt);
        if (!passportSucceeded(response)) {
            const responseData = normalizePassportData(response.data);
            const result = await this.waitForPassportVerification('send-voice-sms', response.data);
            if (result) {
                await this.sendVoiceCode(attempt, { ...mergeVerificationOptions(options, result, responseData), retry: response });
                return;
            }
            throw passportLoginError(responseData);
        }
        const payload = { mobile };
        if (response.data.mobile != null)
            payload.maskedMobile = String(response.data.mobile);
        this.hooks.onVoice(payload);
    }
    waitForVerification(descriptor, browserContext) {
        if (this.pendingVerification)
            throw new Error('已有登录验证正在进行');
        return new Promise((resolve, reject) => {
            let finished = false;
            const finish = (result, error) => {
                if (finished)
                    return;
                finished = true;
                delete this.pendingVerification;
                if (error)
                    reject(error);
                else
                    resolve(result ?? {});
            };
            const verification = new LoginVerification(descriptor, {
                open: (current, options, onUrl) => openBrowserVerification(current, browserContext, options, onUrl),
                complete: async (result) => finish(result),
                cancel: (reason) => finish(undefined, new Error(reason ?? '登录验证已取消')),
            });
            this.pendingVerification = verification;
            this.hooks.onVerification({ verification });
        });
    }
    handleLoginBranch(method, data) {
        const errorCode = data['error_code'];
        if (method === 'password' && errorCode === 1039 && this.config.mobile) {
            this.hooks.onSmsRequired({
                mobile: this.config.mobile,
                reason: String(data['description'] ?? '为保护账号安全，请使用验证码登录'),
            });
            return true;
        }
        const rawAccounts = Array.isArray(data['sub_account'])
            ? data['sub_account'].filter(isRecord)
            : [];
        const smsCodeKey = String(data['sms_code_key'] ?? '');
        if (errorCode !== 1454 || rawAccounts.length === 0 || !smsCodeKey)
            return false;
        const accounts = rawAccounts.map(normalizeLoginAccount).filter(isPresent);
        if (accounts.length === 0)
            return false;
        this.pendingSubAccounts = { method, smsCodeKey, accounts };
        this.hooks.onAccountSelection({
            method,
            accounts,
            canRegisterNewUser: accounts.every((account) => !account.isMainAccount),
        });
        return true;
    }
    requiredSmsCode() {
        if (!this.lastSmsCode)
            throw new Error('当前登录账号缺少已提交的短信验证码');
        return this.lastSmsCode;
    }
}
function normalizeLoginAccount(raw) {
    const secUid = String(raw.sec_uid ?? '');
    if (!secUid)
        return undefined;
    const uid = String(raw.user_id ?? '');
    const nickname = String(raw.name ?? '');
    const avatar = String(raw.avatar ?? '');
    const douyinId = String(raw.aweme_id ?? '');
    return {
        secUid,
        ...(uid && uid !== '0' ? { uid } : {}),
        ...(nickname ? { nickname } : {}),
        ...(avatar ? { avatar } : {}),
        ...(douyinId && douyinId !== '0' ? { douyinId } : {}),
        isMainAccount: Boolean(raw.is_bind_login_mobile),
        isEnterprise: raw.passport_enterprise_user_type === 6,
        isActive: Boolean(raw.business_account_active),
        raw,
    };
}
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
function isPresent(value) {
    return value !== undefined;
}
function passportSucceeded(response) {
    return response.message === 'success';
}
const QR_BIZ_PARAM_KEYS = [
    'passport_mfa_retry_tag',
    'std_verify_flow_id',
    'std_verify_scene',
    'std_verify_template',
    'std_verify_token',
    'std_verify_type',
    'std_verify_way',
];
function pickQrBizParams(params) {
    const result = {};
    if (!params)
        return result;
    for (const key of QR_BIZ_PARAM_KEYS) {
        const value = params[key];
        if (value != null)
            result[key] = String(value);
    }
    return result;
}
function qrMfaChallenge(data) {
    return {
        ...(data.encrypt_uid ? { encrypt_uid: data.encrypt_uid } : {}),
        ...(data.biz_params ? { biz_params: data.biz_params } : {}),
        ...(data.common_params ? { common_params: data.common_params } : {}),
    };
}
function verificationDecision(data) {
    const nested = asRecord(data['data']);
    const candidates = [
        [nested?.['verify_center_decision_conf'], false],
        [nested?.['verify_center_secondary_decision_conf'], true],
        [data['verify_center_decision_conf'], false],
        [data['verify_center_secondary_decision_conf'], true],
    ];
    const selected = candidates.find(([value]) => Boolean(value));
    const rawValue = selected?.[0];
    const secondary = selected?.[1] === true;
    if (isRecord(rawValue)) {
        return {
            raw: JSON.stringify(rawValue),
            data: {
                ...rawValue,
                ...(secondary ? { verification_level: 'secondary' } : {}),
            },
            secondary,
        };
    }
    if (typeof rawValue === 'string' && rawValue.length > 0) {
        return {
            raw: rawValue,
            data: {
                ...parseDecisionConf(rawValue),
                ...(secondary ? { verification_level: 'secondary' } : {}),
            },
            secondary,
        };
    }
    return undefined;
}
function parseDecisionConf(value) {
    try {
        const parsed = JSON.parse(value);
        return isRecord(parsed) ? parsed : { verify_data: parsed };
    }
    catch {
        return { verify_data: value };
    }
}
function passportVerificationDescriptor(operation, response, decision) {
    const errorCode = Number(response['error_code']);
    return {
        source: operation === 'qr-connect' ? 'qr-connect' : 'passport',
        operation,
        ...(Number.isFinite(errorCode) ? { errorCode } : {}),
        ...(typeof response['description'] === 'string'
            ? { description: response['description'] }
            : {}),
        decisionConf: decision.raw,
        decision: decision.data,
        ...(decision.secondary ? { methods: inferSecondaryMethods(decision.data) } : {}),
    };
}
function inferSecondaryMethods(decision) {
    const text = JSON.stringify(decision).toLowerCase();
    const methods = [];
    if (/sms|mobile/.test(text))
        methods.push('auxiliary-mobile-sms');
    if (/qr|scan/.test(text))
        methods.push('mobile-qr');
    if (/push/.test(text))
        methods.push('push');
    return methods.length > 0 ? methods : ['unknown'];
}
function mergeVerificationOptions(current, result, response) {
    const next = { ...current };
    delete next.fp;
    delete next.verificationFields;
    const fields = {};
    if (!result.fp && response['error_code'] === 2046 && response['sms_code_key']) {
        fields['sms_code_key'] = response['sms_code_key'];
    }
    return {
        ...next,
        ...(result.fp ? { fp: result.fp } : {}),
        ...(Object.keys(fields).length > 0 ? { verificationFields: fields } : {}),
    };
}
function stringRecord(value) {
    const result = {};
    if (!value)
        return result;
    for (const [key, item] of Object.entries(value)) {
        if (item == null)
            continue;
        result[key] = typeof item === 'string' ? item : JSON.stringify(item);
    }
    return result;
}
function passportLoginError(data) {
    const code = data['error_code'] ?? '-';
    const description = data['description'] ?? data['error_str'] ?? 'unknown error';
    return new Error(`登录失败：Passport 未返回 success，error_code=${String(code)} ${String(description)}`);
}
function normalizePassportData(data) {
    const nested = asRecord(data['data']);
    return nested ? { ...data, ...nested } : data;
}
function hasPassportOptions(options) {
    return Object.keys(options).length > 0;
}
function qrScreenName(data) {
    const value = data.scan_user_info?.['screen_name'];
    return value == null ? undefined : String(value);
}
function asRecord(value) {
    return typeof value === 'object' && value !== null
        ? value
        : undefined;
}
function numericUserId(value) {
    for (const candidate of [value?.['user_id_str'], value?.['user_id']]) {
        const text = candidate == null ? '' : String(candidate);
        if (/^\d+$/.test(text) && text !== '0')
            return text;
    }
    return undefined;
}
//# sourceMappingURL=account-auth.js.map