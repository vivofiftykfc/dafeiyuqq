export interface DesktopBdmsInitOptions {
    aid?: number;
    pageId?: number;
    boe?: boolean;
    ddrt?: number;
    dump?: boolean | null;
    rpU?: string;
    paths?: (string | RegExp)[] | {
        include?: (string | RegExp)[];
        exclude?: (string | RegExp)[];
    };
    track?: {
        mode?: number;
        delay?: number;
        paths?: (string | RegExp)[];
    };
}
export interface DesktopBdmsConfig {
    aid: number;
    pageId: number;
    boe: boolean;
    ddrt: number;
    paths: {
        include: RegExp[];
        exclude: RegExp[];
    };
    track: {
        mode: number;
        delay: number;
        paths: RegExp[];
    };
    dump: boolean;
    rpU: string;
}
export interface DesktopConfigContext {
    readonly window: {
        onwheelx?: object;
    };
    readonly Array: ArrayConstructor;
    readonly Object: ObjectConstructor;
    readonly RegExp: RegExpConstructor;
    readonly Symbol: SymbolConstructor | undefined;
    readonly TypeError: TypeErrorConstructor;
}
export declare class DesktopBdmsConfiguration {
    private readonly context;
    private readonly start;
    readonly config: DesktopBdmsConfig;
    private readonly array;
    private readonly object;
    private readonly regexp;
    private readonly symbol;
    private readonly typeError;
    constructor(context: DesktopConfigContext, start: () => void);
    init(options: DesktopBdmsInitOptions): void;
    matchesSigning(pathname: string): boolean;
    matchesBehavior(pathname: string): boolean;
    private compile;
    private spread;
    private copy;
}
//# sourceMappingURL=desktop-config.d.ts.map