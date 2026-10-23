export function createDesktopDTraitMathCollector(context) {
    const math = context.Math;
    const zero = () => 0;
    return () => {
        const acos = math.acos || zero, atanh = math.atanh || zero;
        const sin = math.sin || zero, cos = math.cos || zero;
        const tan = math.tan || zero, expm1 = math.expm1 || zero;
        const powPI = (x) => math.pow(math.PI, x);
        const atanhPf = (x) => math.log((1 + x) / (1 - x)) / 2;
        const values = {
            math_acos: acos(0.12312423423423424),
            math_atanh: atanh(0.5),
            math_atanhPf: atanhPf(0.5),
            math_sin: sin(-1e300),
            math_cos: cos(10.000000000123),
            math_tan: tan(-1e300),
            math_expm1: expm1(1),
            math_powPI: powPI(-100),
        };
        const ignored = {};
        for (const key in values)
            ignored['hash_'.concat(key)] = context.hash(''.concat(values[key]));
        const combine = (a, b, c, d) => ''
            .concat(a, ',')
            .concat(b, ',')
            .concat(c, ',')
            .concat(d);
        return {
            str_11: context.hash(combine(values['math_tan'], values['math_atanh'], values['math_atanhPf'], values['math_cos'])),
            str_12: context.hash(combine(values['math_expm1'], values['math_powPI'], values['math_sin'], values['math_tan'])),
        };
    };
}
//# sourceMappingURL=desktop-dtrait-math.js.map