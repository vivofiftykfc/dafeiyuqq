import type { PassportApiResponse, PassportTokenBeatScene } from './types.js';
export declare class PassportTokenBeat {
    private readonly request;
    private readonly onExpired;
    private controller?;
    private timer?;
    private throttle?;
    private operated;
    constructor(request: (scene: PassportTokenBeatScene, signal: AbortSignal) => Promise<PassportApiResponse>, onExpired: () => void);
    start(): void;
    activity(): void;
    stop(): void;
    private pause;
    private startBeating;
    private beat;
}
//# sourceMappingURL=token-beat.d.ts.map