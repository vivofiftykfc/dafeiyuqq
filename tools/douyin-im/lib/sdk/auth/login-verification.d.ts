export type LoginVerificationSource = 'passport' | 'qr-connect';
export type LoginVerificationMethod = 'captcha' | 'mobile-sms' | 'auxiliary-mobile-sms' | 'mobile-qr' | 'push' | 'unknown';
export type LoginVerificationOperation = 'token-beat' | 'account-info' | 'get-qrcode' | 'send-sms' | 'send-voice-sms' | 'sms-login' | 'password-login' | 'qr-connect';
export interface LoginVerificationResult {
    fp?: string;
    fields?: Readonly<Record<string, unknown>>;
}
export interface OpenLoginVerificationOptions {
    port?: number;
    openBrowser?: boolean;
    timeoutMs?: number;
}
export interface LoginVerificationDescriptor {
    source: LoginVerificationSource;
    operation: LoginVerificationOperation;
    errorCode?: number;
    description?: string;
    decisionConf?: string;
    decision: Readonly<Record<string, unknown>>;
    methods?: readonly LoginVerificationMethod[];
}
interface LoginVerificationController {
    open: (verification: LoginVerification, options: OpenLoginVerificationOptions, onUrl: (url: string) => void) => Promise<void>;
    complete: (result: LoginVerificationResult) => Promise<void>;
    cancel: (reason?: string) => void;
}
export declare class LoginVerification {
    #private;
    private readonly controller;
    readonly id: `${string}-${string}-${string}-${string}-${string}`;
    readonly source: LoginVerificationSource;
    readonly operation: LoginVerificationOperation;
    readonly errorCode: number | undefined;
    readonly description: string | undefined;
    readonly decisionConf: string | undefined;
    readonly decision: Readonly<Record<string, unknown>>;
    readonly methods: readonly LoginVerificationMethod[];
    private settled;
    private openTask?;
    private urlTask?;
    private resolveUrl?;
    private rejectUrl?;
    constructor(descriptor: LoginVerificationDescriptor, controller: LoginVerificationController);
    open(options?: OpenLoginVerificationOptions): Promise<void>;
    openUrl(options?: OpenLoginVerificationOptions): Promise<string>;
    private start;
    complete(result?: LoginVerificationResult): Promise<void>;
    cancel(reason?: string): void;
    private assertPending;
}
export {};
//# sourceMappingURL=login-verification.d.ts.map