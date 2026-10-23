import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync, renameSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
const ACCOUNT_FILE = 'account.json';
const PENDING_DIR = '_pending';
function generateGuid() {
    return randomUUID().replaceAll('-', '');
}
function screenSizeFromFingerprint(value) {
    if (!value)
        return undefined;
    const parts = value.split('|');
    const width = Number(parts[0]);
    const height = Number(parts[1]);
    if (!Number.isSafeInteger(width) || width <= 0 || !Number.isSafeInteger(height) || height <= 0) {
        return undefined;
    }
    return { width, height };
}
export class AccountStore {
    accountsDir;
    pendingDir;
    constructor(options = {}) {
        const base = options.dataDir ?? './data';
        this.accountsDir = join(base, 'accounts');
        this.pendingDir = join(this.accountsDir, PENDING_DIR);
        mkdirSync(this.accountsDir, { recursive: true });
        mkdirSync(this.pendingDir, { recursive: true });
    }
    accountDataDir(platformUid) {
        const directory = join(this.accountsDir, platformUid);
        mkdirSync(directory, { recursive: true });
        return directory;
    }
    listUids() {
        if (!existsSync(this.accountsDir))
            return [];
        return readdirSync(this.accountsDir, { withFileTypes: true })
            .filter((d) => d.isDirectory() && d.name !== PENDING_DIR)
            .map((d) => d.name);
    }
    resolvePlatformUid(preferred) {
        if (preferred) {
            if (this.load(preferred))
                return preferred;
            const byField = this.findByField(preferred);
            if (byField)
                return byField;
            return undefined;
        }
        const uids = this.listUids();
        if (uids.length === 0)
            return undefined;
        if (uids.length === 1)
            return uids[0];
        let latestUid = uids[0];
        let latestAt = 0;
        for (const uid of uids) {
            const account = this.load(uid);
            if (!account)
                continue;
            const at = Date.parse(account.meta.updatedAt);
            if (at > latestAt) {
                latestAt = at;
                latestUid = uid;
            }
        }
        return latestUid;
    }
    findByField(value) {
        for (const uid of this.listUids()) {
            const account = this.load(uid);
            if (!account)
                continue;
            if (account.passportUidTt === value) {
                return uid;
            }
        }
        return undefined;
    }
    load(platformUid) {
        const file = join(this.accountsDir, platformUid, ACCOUNT_FILE);
        if (!existsSync(file))
            return undefined;
        const account = JSON.parse(readFileSync(file, 'utf8'));
        let changed = false;
        for (const legacyKey of ['creatorUserId', 'ticketGuard']) {
            if (legacyKey in account) {
                delete account[legacyKey];
                changed = true;
            }
        }
        const device = account.deviceProfile;
        if (device && 'loginFlavor' in device) {
            delete device['loginFlavor'];
            changed = true;
        }
        if (changed)
            this.save(account);
        return account;
    }
    save(account) {
        const dir = join(this.accountsDir, account.platformUid);
        mkdirSync(dir, { recursive: true });
        writeSensitiveJson(join(dir, ACCOUNT_FILE), account);
    }
    updateSession(platformUid, session) {
        const account = this.load(platformUid);
        if (!account) {
            throw new Error(`Account ${platformUid} not found`);
        }
        account.session = session;
        account.meta.updatedAt = new Date().toISOString();
        this.save(account);
    }
    createPending(pending) {
        const dir = join(this.pendingDir, pending.id);
        mkdirSync(dir, { recursive: true });
        writeSensitiveJson(join(dir, 'pending.json'), pending);
    }
    loadPending(id) {
        const file = join(this.pendingDir, id, 'pending.json');
        if (!existsSync(file))
            return undefined;
        return JSON.parse(readFileSync(file, 'utf8'));
    }
    promote(pendingId, platformUid, session, meta = {}) {
        const pending = this.loadPending(pendingId);
        if (!pending) {
            throw new Error(`Pending account ${pendingId} not found`);
        }
        const now = new Date().toISOString();
        const existing = this.load(platformUid);
        let account;
        if (existing) {
            existing.session = session;
            existing.deviceProfile = pending.deviceProfile;
            existing.meta.updatedAt = now;
            if (meta.screenName)
                existing.meta.screenName = meta.screenName;
            if (meta.avatarUrl)
                existing.meta.avatarUrl = meta.avatarUrl;
            if (meta.passportUidTt)
                existing.passportUidTt = meta.passportUidTt;
            account = existing;
        }
        else {
            const accountMeta = { createdAt: now, updatedAt: now };
            if (meta.screenName)
                accountMeta.screenName = meta.screenName;
            if (meta.avatarUrl)
                accountMeta.avatarUrl = meta.avatarUrl;
            account = {
                platformUid,
                session,
                deviceProfile: pending.deviceProfile,
                meta: accountMeta,
            };
            if (meta.passportUidTt)
                account.passportUidTt = meta.passportUidTt;
        }
        this.save(account);
        this.removePending(pendingId);
        return account;
    }
    removePending(id) {
        const dir = join(this.pendingDir, id);
        if (existsSync(dir)) {
            rmSync(dir, { recursive: true });
        }
    }
    toClientConfig(account) {
        const profile = this.ensureDeviceProfile(account);
        const cfg = {
            initialCookies: account.session.cookies,
            userAgent: profile.userAgent,
            bizTraceId: profile.bizTraceId,
            deviceId: profile.deviceId,
            installId: profile.installId,
            guid: profile.guid,
            screenWidth: String(profile.screenWidth),
            screenHeight: String(profile.screenHeight),
            desktopSettingsDirectory: this.accountDataDir(account.platformUid),
        };
        if (profile.screenFingerprint) {
            cfg['screenFingerprint'] = profile.screenFingerprint;
        }
        if (account.session.desktopTicketGuard)
            cfg['desktopTicketGuard'] = account.session.desktopTicketGuard;
        return cfg;
    }
    listAccounts() {
        return this.listUids().map((uid) => {
            const account = this.load(uid);
            return {
                platformUid: uid,
                screenName: account?.meta.screenName,
                updatedAt: account?.meta.updatedAt ?? '',
                path: join(this.accountsDir, uid),
            };
        });
    }
    static resolveCanonicalUserId(userData) {
        const userIdStr = String(userData?.['user_id_str'] ?? '');
        if (/^\d+$/.test(userIdStr) && userIdStr !== '0')
            return userIdStr;
        const userId = userData?.['user_id'];
        const value = userId == null ? '' : String(userId);
        if (/^\d+$/.test(value) && value !== '0')
            return value;
        throw new Error('Cannot resolve canonical user ID: login response and self profile contain no numeric user ID');
    }
    static buildSession(cookies, guard) {
        const s = {
            cookies,
            verifiedAt: new Date().toISOString(),
        };
        if (guard)
            s.desktopTicketGuard = guard;
        return s;
    }
    static buildDeviceProfile(userAgent, bizTraceId, extras) {
        const screen = screenSizeFromFingerprint(extras?.screenFingerprint);
        const guid = extras?.guid ?? generateGuid();
        return {
            ...extras,
            userAgent,
            bizTraceId,
            deviceId: extras?.deviceId ?? '0',
            guid,
            screenWidth: extras?.screenWidth ?? screen?.width ?? 1728,
            screenHeight: extras?.screenHeight ?? screen?.height ?? 1117,
        };
    }
    ensureDeviceId(account) {
        return this.ensureDeviceProfile(account).deviceId;
    }
    ensureDeviceProfile(account) {
        const profile = account.deviceProfile;
        const screen = screenSizeFromFingerprint(profile.screenFingerprint);
        let changed = false;
        if (!profile.guid?.trim()) {
            profile.guid = generateGuid();
            changed = true;
        }
        if (!profile.deviceId?.trim()) {
            profile.deviceId = '0';
            changed = true;
        }
        if (!Number.isSafeInteger(profile.screenWidth) || profile.screenWidth <= 0) {
            profile.screenWidth = screen?.width ?? 1728;
            changed = true;
        }
        if (!Number.isSafeInteger(profile.screenHeight) || profile.screenHeight <= 0) {
            profile.screenHeight = screen?.height ?? 1117;
            changed = true;
        }
        if (changed)
            this.save(account);
        return profile;
    }
}
function writeSensitiveJson(file, value) {
    const temporary = `${file}.${randomUUID()}.tmp`;
    try {
        writeFileSync(temporary, JSON.stringify(value, null, 2), { mode: 0o600, flag: 'wx' });
        renameSync(temporary, file);
    }
    finally {
        rmSync(temporary, { force: true });
    }
}
//# sourceMappingURL=account-store.js.map