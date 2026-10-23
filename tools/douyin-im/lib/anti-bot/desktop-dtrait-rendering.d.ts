export interface DesktopDTraitCanvas2D {
    fillStyle: unknown;
    shadowColor: string;
    shadowBlur: number;
    shadowOffsetX: number;
    shadowOffsetY: number;
    font: string;
    strokeStyle: unknown;
    lineWidth: number;
    createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): {
        addColorStop(offset: number, color: string): void;
    };
    fillRect(x: number, y: number, width: number, height: number): void;
    beginPath(): void;
    arc(x: number, y: number, radius: number, start: number, end: number): void;
    fill(): void;
    fillText(text: string, x: number, y: number): void;
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    stroke(): void;
}
export interface DesktopDTraitCanvasContext {
    readonly document: {
        createElement(tag: string): {
            width: number;
            height: number;
            getContext(type: string): DesktopDTraitCanvas2D | null;
            toDataURL(): string;
        };
    };
    readonly Math: {
        PI: number;
    };
    hash(value: unknown): number;
}
export declare function createDesktopDTraitCanvasCollector(context: DesktopDTraitCanvasContext): () => {
    str_3: number | string;
};
export interface DesktopDTraitDomParent {
    removeChild(node: DesktopDTraitDomElement): unknown;
}
export interface DesktopDTraitDomElement {
    id: string;
    style: {
        cssText: string;
    };
    readonly parentNode: DesktopDTraitDomParent | null;
    getBoundingClientRect(): {
        width: unknown;
        height: unknown;
        x: unknown;
        y: unknown;
    };
}
export interface DesktopDTraitDomContext {
    readonly document: {
        createElement(tag: string): DesktopDTraitDomElement;
        readonly body: DesktopDTraitDomParent & {
            appendChild(node: DesktopDTraitDomElement): unknown;
        };
        querySelector(selector: string): DesktopDTraitDomElement | null;
    };
    hash(value: unknown): number;
}
export declare function createDesktopDTraitDomCollector(context: DesktopDTraitDomContext): () => {
    str_2: number;
};
//# sourceMappingURL=desktop-dtrait-rendering.d.ts.map