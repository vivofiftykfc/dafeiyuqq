import { captureRejectionSymbol } from 'events';
import { BaseClient } from '../base/client.js';
import { ApiConnection } from '../desktop/api-connection.js';
import { DESKTOP_LOGIN_USER_AGENT } from '../desktop/constants.js';
import { AccountStore } from '../store/account-store.js';
import { Account } from './account.js';
import { toError } from './errors.js';
import { getLogger } from '../logger.js';
const logger = getLogger('Client');
const PASSIVE_MESSAGE_EVENTS = new Set([
    'message',
    'message.private',
    'message.stranger',
    'message.group',
    'request',
    'request.group',
    'request.group.join',
    'notice',
    'notice.conversation',
    'notice.conversation.marked-read',
    'notice.friend',
    'notice.friend.marked-read',
    'notice.friend.add-request',
    'notice.friend.increase',
    'notice.friend.decrease',
    'notice.group',
    'notice.group.member-change',
    'notice.group.member-increase',
    'notice.group.invite',
    'notice.group.member-decrease',
    'notice.group.admin',
    'notice.group.name-change',
    'notice.group.avatar-change',
    'notice.group.metadata-change',
    'notice.group.marked-read',
    'notice.conversation.update',
    'notice.conversation.delete',
    'notice.message.recall',
    'notice.message.update',
    'notice.message.batch-update',
    'notice.message.delete',
    'notice.message.reaction',
    'notice.conversation.read-summary',
    'notice.message',
    'notice.im.command',
]);
const ACCOUNT_EVENTS = [
    'system.login.session',
    'system.login.qrcode',
    'system.login.qrcode.status',
    'system.login.sms',
    'system.login.voice',
    'system.login.accounts',
    'system.login.sms-required',
    'system.login.verification',
    'system.action.verification',
    'system.login.error',
    'system.handler.error',
    'system.online',
    'system.reconnecting',
    'system.offline',
    'message.private',
    'message.stranger',
    'message.group',
    'message',
    'message.raw',
    'request',
    'request.group',
    'request.group.join',
    'notice',
    'notice.conversation',
    'notice.conversation.marked-read',
    'notice.friend',
    'notice.friend.marked-read',
    'notice.friend.add-request',
    'notice.friend.increase',
    'notice.friend.decrease',
    'notice.group',
    'notice.group.member-change',
    'notice.group.member-increase',
    'notice.group.invite',
    'notice.group.member-decrease',
    'notice.group.admin',
    'notice.group.name-change',
    'notice.group.avatar-change',
    'notice.group.metadata-change',
    'notice.group.marked-read',
    'notice.conversation.update',
    'notice.conversation.delete',
    'notice.message.recall',
    'notice.message.update',
    'notice.message.batch-update',
    'notice.message.delete',
    'notice.message.reaction',
    'notice.conversation.read-summary',
    'notice.message',
    'notice.im.command',
];
export class Client extends BaseClient {
    store;
    defaults;
    accountForwarders = new Map();
    constructor(options = {}) {
        super();
        this.store = new AccountStore(options.dataDir ? { dataDir: options.dataDir } : {});
        this.defaults = {
            ...(options.skipVerify !== undefined ? { skipVerify: options.skipVerify } : {}),
            ...(options.localState !== undefined ? { localState: options.localState } : {}),
        };
        if (options.autoLoad ?? true)
            this.loadAccounts();
    }
    on(event, listener) {
        return super.on(event, listener);
    }
    emit(event, ...args) {
        return super.emit(event, ...args);
    }
    instantiateAccount(options) {
        return Account.create(this.createTransport(options), this.store, options);
    }
    listStoredAccountIds() {
        return this.store.listUids();
    }
    resolveStoredAccountId(accountId) {
        return this.store.resolvePlatformUid(accountId);
    }
    accountRegistrationKey(options) {
        return options.accountId ?? (options.login && 'mobile' in options.login
            ? options.login.mobile
            : undefined);
    }
    normalizeAccountOptions(options, context) {
        return {
            ...this.defaults,
            ...options,
            ...(context.resolvedAccountId ? { accountId: context.resolvedAccountId } : {}),
        };
    }
    onAccountAdded(account) {
        this.forwardEvents(account);
        super.emit('account.added', { account });
    }
    onAccountRemoved(account) {
        for (const [event, listener] of this.accountForwarders.get(account) ?? []) {
            account.off(event, listener);
        }
        this.accountForwarders.delete(account);
        super.emit('account.removed', { account });
    }
    createTransport(options) {
        const savedUid = this.store.resolvePlatformUid(options.accountId);
        const saved = savedUid ? this.store.load(savedUid) : undefined;
        if (saved) {
            if (saved.deviceProfile.userAgent !== DESKTOP_LOGIN_USER_AGENT) {
                saved.deviceProfile.userAgent = DESKTOP_LOGIN_USER_AGENT;
                this.store.save(saved);
            }
            return new ApiConnection(this.store.toClientConfig(saved));
        }
        return new ApiConnection();
    }
    forwardEvents(account) {
        const forwarders = [];
        for (const event of ACCOUNT_EVENTS) {
            const listener = (data) => {
                if (event === 'system.online') {
                    const online = data;
                    this.rememberAccountAlias(account, online.platformUid);
                    this.promoteAccountIdentity(account);
                }
                if (PASSIVE_MESSAGE_EVENTS.has(event)) {
                    super.emit(event, data);
                }
                else {
                    this.emitAccountEvent(event, account, data);
                }
            };
            forwarders.push([event, listener]);
            account.on(event, listener);
        }
        this.accountForwarders.set(account, forwarders);
    }
    [captureRejectionSymbol](error, event, payload) {
        const normalized = toError(error);
        if (event === 'system.handler.error') {
            logger.error(normalized, 'system.handler.error listener failed');
            return;
        }
        const account = payload instanceof Account
            ? payload
            : typeof payload === 'object' && payload !== null && 'account' in payload &&
                payload.account instanceof Account
                ? payload.account
                : undefined;
        if (!account) {
            logger.error(normalized, 'handler failed for %s', String(event));
            return;
        }
        super.emit('system.handler.error', { account, event, error: normalized });
    }
    emitAccountEvent(event, account, data) {
        if (event === 'system.offline') {
            super.emit(event, { account });
            return;
        }
        if (event === 'system.login.error') {
            super.emit(event, { account, error: data });
            return;
        }
        super.emit(event, { ...data, account });
    }
}
export function createClient(options = {}) {
    return new Client(options);
}
//# sourceMappingURL=client.js.map