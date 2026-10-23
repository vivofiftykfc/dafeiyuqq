export interface DesktopPropertyContext {
    readonly Symbol?: unknown;
    readonly Object: typeof Object;
}
export declare class DesktopPropertyClassifier {
    private readonly symbol;
    private readonly object;
    private typeOf;
    constructor(context: DesktopPropertyContext);
    classify(target: unknown, key: PropertyKey): number;
    protected classifyProperty(target: unknown, key: PropertyKey, onReadError?: () => void): number;
    private fallbackType;
}
export interface DesktopDocumentContext extends DesktopPropertyContext {
    readonly document: {
        readonly all?: unknown;
        readonly characterSet?: unknown;
        readonly compatMode?: unknown;
        readonly documentMode?: unknown;
        readonly images?: unknown;
        readonly layers?: unknown;
    };
}
export declare class DesktopDocumentCollector extends DesktopPropertyClassifier {
    private readonly context;
    constructor(context: DesktopDocumentContext);
    collect(): object;
}
//# sourceMappingURL=desktop-device-properties.d.ts.map