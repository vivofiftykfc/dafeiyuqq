export interface DesktopDTraitWebGL {
    __canvas?: DesktopDTraitWebGLCanvas;
    readonly VERTEX_SHADER: number;
    readonly FRAGMENT_SHADER: number;
    readonly COMPILE_STATUS: number;
    readonly LINK_STATUS: number;
    readonly ARRAY_BUFFER: number;
    readonly FLOAT: number;
    readonly STATIC_DRAW: number;
    readonly COLOR_BUFFER_BIT: number;
    readonly TRIANGLES: number;
    readonly TRIANGLE_FAN: number;
    readonly TRIANGLE_STRIP: number;
    readonly RGBA: number;
    readonly UNSIGNED_BYTE: number;
    createShader(type: number): unknown;
    shaderSource(shader: unknown, source: string): void;
    compileShader(shader: unknown): void;
    getShaderParameter(shader: unknown, parameter: number): unknown;
    getShaderInfoLog(shader: unknown): unknown;
    deleteShader(shader: unknown): void;
    createProgram(): unknown;
    attachShader(program: unknown, shader: unknown): void;
    linkProgram(program: unknown): void;
    getProgramParameter(program: unknown, parameter: number): unknown;
    getProgramInfoLog(program: unknown): unknown;
    deleteProgram(program: unknown): void;
    useProgram(program: unknown): void;
    getAttribLocation(program: unknown, name: string): number;
    getUniformLocation(program: unknown, name: string): unknown;
    createBuffer(): unknown;
    bindBuffer(target: number, buffer: unknown): void;
    vertexAttribPointer(index: number, size: number, type: number, normalized: boolean, stride: number, offset: number): void;
    enableVertexAttribArray(index: number): void;
    uniformMatrix3fv(location: unknown, transpose: boolean, value: Float32Array): void;
    clearColor(red: number, green: number, blue: number, alpha: number): void;
    clear(mask: number): void;
    bufferData(target: number, values: Float32Array, usage: number): void;
    drawArrays(mode: number, first: number, count: number): void;
    readPixels(x: number, y: number, width: number, height: number, format: number, type: number, data: Uint8Array): void;
    getExtension?(name: string): {
        UNMASKED_RENDERER_WEBGL: number;
        UNMASKED_VENDOR_WEBGL: number;
    } | null;
    getParameter(parameter: number): unknown;
}
export interface DesktopDTraitWebGLCanvas {
    width: number;
    height: number;
    getContext(name: string, options?: {
        preserveDrawingBuffer: boolean;
    }): DesktopDTraitWebGL | null;
}
export interface DesktopDTraitWebGLContext {
    readonly document?: {
        createElement(tag: string): DesktopDTraitWebGLCanvas;
    } | undefined;
    readonly Math: Pick<Math, 'PI' | 'sin' | 'cos' | 'abs'>;
    hash(value: unknown): number;
    onDiagnostic(code: 'webgl', reason: 'document' | 'context' | 'shader' | 'program'): void;
}
export declare function createDesktopDTraitWebGLCollector(context: DesktopDTraitWebGLContext): () => {
    str_26: number;
    str_33: number;
};
//# sourceMappingURL=desktop-dtrait-webgl.d.ts.map