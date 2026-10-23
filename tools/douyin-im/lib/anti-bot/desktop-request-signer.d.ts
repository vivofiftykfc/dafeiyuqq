import { DesktopEnvironmentState, type DesktopEnvironmentContext } from './desktop-environment-mask.js';
import { DesktopBehaviorState } from './desktop-behavior.js';
import { type DesktopFingerprintContext } from './desktop-fingerprint.js';
export type DesktopSigningContext = DesktopEnvironmentContext & DesktopFingerprintContext & {
    readonly window: {
        readonly onwheelx?: {
            readonly _Ax?: unknown;
        };
    };
    readonly navigator: {
        readonly userAgent: string;
        readonly __proto__: {
            vendorSubs?: {
                ink: number;
            };
        };
        readonly vendorSubs?: {
            readonly ink?: number;
        };
    };
    readonly Date: {
        now(): number;
    };
    readonly Math: {
        random(): number;
    };
};
export interface DesktopSigningConfig {
    readonly aid: number;
    readonly pageId: number;
    readonly track: {
        readonly mode: number;
    };
}
export declare class DesktopRequestSigner {
    private readonly context;
    private readonly config;
    private readonly behavior;
    private readonly environment;
    constructor(context: DesktopSigningContext, config: DesktopSigningConfig, behavior: DesktopBehaviorState, environment?: DesktopEnvironmentState);
    sign(query: string, body: unknown, contentType?: string): string;
    private readFlag;
}
//# sourceMappingURL=desktop-request-signer.d.ts.map