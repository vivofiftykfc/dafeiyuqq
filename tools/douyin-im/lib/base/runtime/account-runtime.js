export class AccountRuntime {
    store;
    apiConnection;
    onDeviceUpdate;
    stored;
    bindingGeneration = 0;
    constructor(store, apiConnection, onDeviceUpdate) {
        this.store = store;
        this.apiConnection = apiConnection;
        this.onDeviceUpdate = onDeviceUpdate;
    }
    get connection() {
        return this.apiConnection;
    }
    get platformUid() {
        return this.stored?.platformUid;
    }
    get bound() {
        if (!this.stored || !this.apiConnection) {
            throw new Error('账号未绑定，请先登录或 Wake');
        }
        const profile = this.store.ensureDeviceProfile(this.stored);
        return {
            client: this.apiConnection,
            account: this.stored,
            platformUid: this.stored.platformUid,
            deviceId: profile.deviceId,
        };
    }
    bindRestored(client, account) {
        client.jar.merge(account.session.cookies);
        this.bindPromoted(client, account);
    }
    bindPromoted(client, account) {
        if (this.apiConnection !== client || (this.stored && this.stored !== account))
            this.suspend();
        this.apiConnection = client;
        this.stored = account;
        const generation = ++this.bindingGeneration;
        client.setDeviceUpdateHandler?.(device => {
            if (generation !== this.bindingGeneration || this.apiConnection !== client || this.stored !== account)
                return;
            Object.assign(account.deviceProfile, device);
            this.store.save(account);
            this.onDeviceUpdate?.();
        });
        client.enableTicketGuard?.(state => {
            if (generation !== this.bindingGeneration || this.apiConnection !== client || this.stored !== account)
                return;
            account.session = { ...account.session, cookies: client.getCookies(), desktopTicketGuard: state };
            this.store.save(account);
        });
    }
    suspend() {
        this.bindingGeneration++;
        this.apiConnection.invalidateAuthenticationResponses();
    }
    clear() {
        this.suspend();
        delete this.stored;
    }
}
//# sourceMappingURL=account-runtime.js.map