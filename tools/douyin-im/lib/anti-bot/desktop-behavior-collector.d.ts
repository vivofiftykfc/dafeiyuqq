import { DesktopBehaviorState } from './desktop-behavior.js';
interface HoverElement {
    readonly nodeName: string;
    readonly innerText: string;
}
export interface DesktopBehaviorInputContext {
    readonly performance: {
        now(): number;
    };
    readonly Date: {
        now(): number;
    };
    readonly Math: {
        random(): number;
    };
    readonly HTMLElement: abstract new (...args: never[]) => HoverElement;
    readonly encodeURI: typeof encodeURI;
    readonly document: {
        readonly visibilityState: string;
        addEventListener(type: string, listener: (event: unknown) => void): void;
    };
    readonly window: {
        readonly self: unknown;
        readonly top: unknown;
        requestAnimationFrame(callback: (time: number) => void): unknown;
        addEventListener(type: string, listener: (event: unknown) => void): void;
    };
}
export declare class DesktopBehaviorCollector extends DesktopBehaviorState {
    private readonly context;
    constructor(context: DesktopBehaviorInputContext);
    readonly startCollection: () => void;
    private queueFrame;
    private mousePoint;
    private touchPoint;
    private hoverPoint;
}
export {};
//# sourceMappingURL=desktop-behavior-collector.d.ts.map