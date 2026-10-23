import type { Account } from '../account.js';
import type { ActionChallengeError } from '../../http/action-challenge.js';
import type { OpenLoginVerificationOptions } from './login-verification.js';
export interface ActionVerificationTarget {
    operation: 'follow' | 'unfollow';
    uid: string;
}
export interface ActionVerificationResult {
    status: boolean;
}
interface ActionVerificationController {
    open: (verification: ActionVerification, options: OpenLoginVerificationOptions, onUrl: (url: string) => void) => Promise<void>;
    complete: () => void;
    cancel: (reason: string) => void;
}
export declare class ActionVerification {
    #private;
    readonly account: Account;
    readonly id: `${string}-${string}-${string}-${string}-${string}`;
    readonly target: Readonly<ActionVerificationTarget>;
    constructor(account: Account, target: ActionVerificationTarget, challenge: ActionChallengeError, controller: ActionVerificationController);
    get source(): ActionChallengeError['source'];
    get raw(): string;
    get decision(): Readonly<Record<string, unknown>>;
    open(options?: OpenLoginVerificationOptions): Promise<void>;
    openUrl(options?: OpenLoginVerificationOptions): Promise<string>;
    private start;
    complete(result: ActionVerificationResult): Promise<void>;
    cancel(reason?: string): void;
    private assertPending;
}
export {};
//# sourceMappingURL=action-verification.d.ts.map