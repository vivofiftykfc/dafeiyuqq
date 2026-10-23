export interface DesktopDTraitFontNode {
    id: string;
    className: string;
    textContent: string | null;
    readonly firstChild: DesktopDTraitFontNode | null;
    readonly parentNode: DesktopDTraitFontNode | null;
    setAttribute(name: string, value: string): void;
    appendChild(node: DesktopDTraitFontNode): unknown;
    removeChild(node: DesktopDTraitFontNode): unknown;
    replaceChild(node: DesktopDTraitFontNode, old: DesktopDTraitFontNode): unknown;
}
export interface DesktopDTraitFontFace {
    readonly family: string;
    load(): Promise<DesktopDTraitFontFace>;
}
export interface DesktopDTraitFontsContext {
    readonly document: {
        readonly body: DesktopDTraitFontNode;
        readonly fonts: {
            check(font: string): boolean;
        };
        createElement(tag: string): DesktopDTraitFontNode;
        createDocumentFragment(): DesktopDTraitFontNode;
        getElementById(id: string): DesktopDTraitFontNode | null;
        querySelectorAll(selector: string): ArrayLike<DesktopDTraitFontNode> | Iterable<DesktopDTraitFontNode>;
    };
    readonly navigator: {
        readonly platform: unknown;
    };
    readonly window: {
        gc?: (() => void) | undefined;
    };
    readonly Math: Pick<Math, 'random'>;
    readonly FontFace: new (family: string, source: string) => DesktopDTraitFontFace;
    getComputedStyle(node: DesktopDTraitFontNode): {
        inlineSize: unknown;
        blockSize: unknown;
    };
    parseFloat(value: string): number;
    hash(value: unknown): number;
    onDiagnostic(code: 'ft' | 'font-detection'): void;
}
export declare function createDesktopDTraitFontsCollector(context: DesktopDTraitFontsContext): () => Promise<Record<"str_10" | "str_17" | "str_7" | "str_21", number>>;
//# sourceMappingURL=desktop-dtrait-fonts.d.ts.map