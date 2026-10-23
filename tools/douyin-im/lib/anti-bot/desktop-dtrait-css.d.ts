export interface DesktopDTraitCssNode {
    setAttribute(name: string, value: string): void;
    readonly parentNode?: {
        removeChild(node: DesktopDTraitCssNode): unknown;
    } | null;
}
export interface DesktopDTraitCssContext {
    readonly document: {
        readonly body: {
            append(node: DesktopDTraitCssNode): void;
        };
        createElement(tag: string): DesktopDTraitCssNode;
    };
    getComputedStyle(node: unknown): Record<string, unknown>;
    hash(value: unknown): number;
    onDiagnostic(code: 'css'): void;
}
export declare function createDesktopDTraitCssCollector(context: DesktopDTraitCssContext): () => Record<"str_1" | "str_4" | "str_5" | "str_6", number | undefined>;
//# sourceMappingURL=desktop-dtrait-css.d.ts.map