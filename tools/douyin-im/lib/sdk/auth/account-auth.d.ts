import type { ApiConnection } from '../../desktop/api-connection.js';
import type { PassportApiResponse, PassportTokenBeatScene, QrCodeInfo, QrConnectStatus } from '../../desktop/types.js';
import { AccountStore } from '../../store/account-store.js';
import type { StoredAccount, SessionProbeResult } from '../../store/types.js';
import type { LoginAccountSelectionPayload } from '../account-events.js';
import { LoginVerification } from './login-verification.js';
export type LoginMethod = 'qr' | 'sms' | 'password';
export interface AccountAuthConfig {
    client: ApiConnection;
    store: AccountStore;
    loginMethod: LoginMethod;
    mobile?: string;
    password?: string;
}
export interface AccountAuthHooks {
    onQrcode: (info: QrCodeInfo) => void;
    onQrStatus: (payload: {
        status: QrConnectStatus;
        screenName?: string;
        errorCode?: number;
        description?: string;
        responseFields?: string[];
    }) => void;
    onSms: (payload: {
        mobile: string;
        maskedMobile?: string;
    }) => void;
    onVoice: (payload: {
        mobile: string;
        maskedMobile?: string;
    }) => void;
    onAccountSelection: (payload: LoginAccountSelectionPayload) => void;
    onSmsRequired: (payload: {
        mobile: string;
        reason: string;
    }) => void;
    onVerification: (payload: {
        verification: LoginVerification;
    }) => void;
    onLoggedIn: (account: StoredAccount) => void | Promise<void>;
}
export declare class AccountAuth {
    private readonly config;
    private readonly hooks;
    private pendingId?;
    private qrInfo?;
    private attempt;
    private pendingVerification?;
    private pendingSubAccounts?;
    private lastSmsCode?;
    constructor(config: AccountAuthConfig, hooks: AccountAuthHooks);
    get loginMethod(): LoginMethod;
    get qrCodeInfo(): QrCodeInfo | undefined;
    setClient(client: ApiConnection): void;
    refreshSession(scene: PassportTokenBeatScene, signal: AbortSignal): Promise<PassportApiResponse>;
    probeRestoredSession(client: ApiConnection, signal?: AbortSignal): Promise<SessionProbeResult>;
    cancel(): void;
    beginLogin(): Promise<void>;
    private createQrcode;
    continueQrLogin(): Promise<void>;
    continueSmsLogin(code: string): Promise<void>;
    requestSmsCode(): Promise<void>;
    requestVoiceCode(): Promise<void>;
    continueWithSubAccount(selection: {
        secUid?: string;
        registerNewUser?: boolean;
    }): Promise<void>;
    private finishLogin;
    private ensureActive;
    private promote;
    private ensurePending;
    private performPasswordLogin;
    private performSmsLogin;
    private waitForPassportVerification;
    private sendSmsCode;
    private sendVoiceCode;
    private waitForVerification;
    private handleLoginBranch;
    private requiredSmsCode;
}
//# sourceMappingURL=account-auth.d.ts.map