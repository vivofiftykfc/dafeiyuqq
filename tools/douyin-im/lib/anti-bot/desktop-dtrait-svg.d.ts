export interface DesktopDTraitSvgParent {
    removeChild(node: DesktopDTraitSvgElement): unknown;
}
export interface DesktopDTraitSvgElement {
    id: string;
    readonly parentNode: DesktopDTraitSvgParent | null;
    setAttribute(name: string, value: string): void;
    appendChild(node: DesktopDTraitSvgElement): unknown;
    getBBox(): {
        x: unknown;
        y: unknown;
        width: unknown;
        height: unknown;
    };
}
export interface DesktopDTraitSvgContext {
    readonly document: {
        createElementNS(namespace: string, tag: string): DesktopDTraitSvgElement;
        readonly body: DesktopDTraitSvgParent & {
            appendChild(node: DesktopDTraitSvgElement): unknown;
        };
        querySelector(selector: string): DesktopDTraitSvgElement | null;
    };
    hash(value: unknown): number;
}
export declare function createDesktopDTraitSvgCollector(context: DesktopDTraitSvgContext): () => Record<string, number>;
//# sourceMappingURL=desktop-dtrait-svg.d.ts.map