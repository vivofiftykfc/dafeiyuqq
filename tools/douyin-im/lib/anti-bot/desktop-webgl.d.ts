type Parameter = 'BLUE_BITS' | 'DEPTH_BITS' | 'GREEN_BITS' | 'MAX_COMBINED_TEXTURE_IMAGE_UNITS' | 'MAX_CUBE_MAP_TEXTURE_SIZE' | 'MAX_FRAGMENT_UNIFORM_VECTORS' | 'MAX_RENDERBUFFER_SIZE' | 'MAX_TEXTURE_IMAGE_UNITS' | 'MAX_TEXTURE_SIZE' | 'MAX_VARYING_VECTORS' | 'MAX_VERTEX_ATTRIBS' | 'MAX_VERTEX_TEXTURE_IMAGE_UNITS' | 'MAX_VERTEX_UNIFORM_VECTORS' | 'SHADING_LANGUAGE_VERSION' | 'STENCIL_BITS' | 'VERSION';
export type DesktopWebGl = Partial<Record<Parameter, number>> & {
    getContextAttributes(): {
        readonly antialias?: unknown;
    } | null | undefined;
    getParameter(parameter: number): unknown;
    getExtension(name: string): {
        readonly MAX_TEXTURE_MAX_ANISOTROPY_EXT?: number;
        readonly UNMASKED_RENDERER_WEBGL?: number;
        readonly UNMASKED_VENDOR_WEBGL?: number;
    } | null | undefined;
};
export interface DesktopWebGlContext {
    readonly document: {
        createElement(name: 'canvas'): {
            getContext(name: 'webgl'): DesktopWebGl | null | undefined;
        };
    };
}
export declare function collectDesktopWebGl(context: DesktopWebGlContext): Record<string, unknown>;
export {};
//# sourceMappingURL=desktop-webgl.d.ts.map