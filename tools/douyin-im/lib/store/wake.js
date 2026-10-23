import { checkSessionHealth } from './session-health.js';
export async function tryRestoreSession(store, createClient, platformUid, options = {}) {
    options.signal?.throwIfAborted();
    const uid = store.resolvePlatformUid(platformUid);
    if (!uid) {
        return { outcome: 'missing' };
    }
    const account = store.load(uid);
    if (!account?.session.cookies?.trim()) {
        return { outcome: 'missing' };
    }
    const local = checkSessionHealth(account);
    if (local.expired) {
        const clientCfg = store.toClientConfig(account);
        const client = createClient(clientCfg);
        return {
            outcome: 'expired',
            wake: {
                status: 'expired',
                account,
                client,
                verified: false,
                reason: 'sid_guard 已过期',
            },
        };
    }
    const wake = await wakeAccount(store, createClient, uid, options);
    if (wake.status === 'ok') {
        return { outcome: 'ok', wake };
    }
    return { outcome: wake.status === 'error' ? 'error' : 'expired', wake };
}
export async function wakeAccount(store, createClient, platformUid, options = {}) {
    options.signal?.throwIfAborted();
    const account = store.load(platformUid);
    if (!account) {
        throw new Error(`Account ${platformUid} not found in store`);
    }
    const clientCfg = store.toClientConfig(account);
    const client = createClient(clientCfg);
    let probing = false;
    let accepted = false;
    let active = true;
    let ticketState = account.session.desktopTicketGuard;
    const cancel = () => {
        active = false;
        client.invalidateAuthenticationResponses?.();
    };
    options.signal?.addEventListener('abort', cancel, { once: true });
    try {
        client.setDeviceUpdateHandler?.(device => {
            if (!active || options.signal?.aborted)
                return;
            Object.assign(account.deviceProfile, device);
            store.save(account);
        });
        client.enableTicketGuard?.(state => {
            if (!active || options.signal?.aborted)
                return;
            ticketState = state;
            if (probing)
                return;
            account.session = { ...account.session, cookies: client.getCookies(), desktopTicketGuard: state };
            store.save(account);
        });
        client.startTicketGuard?.();
        if (client.startDeviceLifecycle || client.initializeDevice) {
            const device = await (client.startDeviceLifecycle?.() ?? client.initializeDevice());
            options.signal?.throwIfAborted();
            Object.assign(account.deviceProfile, device);
            store.save(account);
        }
        if (options.skipVerify) {
            accepted = true;
            return {
                status: 'ok',
                account,
                client,
                verified: false,
                reason: '已按配置跳过远端 Session 校验',
                ...(account.meta.screenName ? { screenName: account.meta.screenName } : {}),
            };
        }
        probing = true;
        const probe = options.probeSession
            ? await options.probeSession(client, options.signal)
            : await client.probeSession(options.signal);
        options.signal?.throwIfAborted();
        if (probe.status === 'alive') {
            if (!probe.uid || probe.uid !== platformUid) {
                return {
                    status: 'error', account, client, verified: false,
                    reason: probe.uid
                        ? `Session 身份不匹配：预期 ${platformUid}，远端 ${probe.uid}`
                        : 'Session 校验未返回账号 UID',
                };
            }
            const session = {
                ...account.session,
                cookies: client.getCookies(),
                ...(ticketState ? { desktopTicketGuard: ticketState } : {}),
                verifiedAt: new Date().toISOString(),
            };
            const refreshed = {
                ...account,
                session,
                meta: {
                    ...account.meta,
                    ...(probe.screenName ? { screenName: probe.screenName } : {}),
                    updatedAt: new Date().toISOString(),
                },
            };
            store.save(refreshed);
            Object.assign(account, refreshed);
            probing = false;
            accepted = true;
            return {
                status: 'ok',
                account,
                client,
                verified: true,
                reason: probe.reason,
                ...(probe.screenName || account.meta.screenName
                    ? { screenName: probe.screenName ?? account.meta.screenName }
                    : {}),
            };
        }
        return {
            status: probe.status,
            account,
            client,
            verified: probe.status === 'expired',
            reason: probe.reason,
            ...(account.meta.screenName ? { screenName: account.meta.screenName } : {}),
        };
    }
    finally {
        active = accepted;
        options.signal?.removeEventListener('abort', cancel);
        if (!accepted)
            client.invalidateAuthenticationResponses?.();
    }
}
//# sourceMappingURL=wake.js.map