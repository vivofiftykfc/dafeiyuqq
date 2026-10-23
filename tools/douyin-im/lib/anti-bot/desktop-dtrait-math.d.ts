export interface DesktopDTraitMathContext {
    readonly Math: Pick<Math, 'log' | 'pow' | 'PI'> & Partial<Pick<Math, 'acos' | 'atanh' | 'sin' | 'cos' | 'tan' | 'expm1'>>;
    hash(value: unknown): number;
}
export declare function createDesktopDTraitMathCollector(context: DesktopDTraitMathContext): () => Record<string, number>;
//# sourceMappingURL=desktop-dtrait-math.d.ts.map