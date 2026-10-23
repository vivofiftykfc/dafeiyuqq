import { setDesktopProperty } from './desktop-property-write.js';
export class DesktopPropertyClassifier {
    symbol;
    object;
    typeOf;
    constructor(context) {
        this.symbol = context.Symbol;
        this.object = context.Object;
    }
    classify(target, key) {
        return this.classifyProperty(target, key);
    }
    classifyProperty(target, key, onReadError) {
        let value;
        try {
            value = target[key];
        }
        catch {
            onReadError?.();
            return 404;
        }
        const tag = this.object.prototype.toString.call(value);
        switch (tag) {
            case '[object Boolean]': return value === true ? 1 : 2;
            case '[object Function]': return 3;
            case '[object Undefined]': return 4;
            case '[object Number]': return 5;
            case '[object String]': return value === '' ? 7 : 8;
            case '[object Array]': return value.length === 0 ? 9 : 10;
            case '[object Object]': return 11;
            case '[object HTMLAllCollection]': return 12;
            case '[object Storage]': return 13;
            default: return this.fallbackType(value) === 'object' ? 99 : -1;
        }
    }
    fallbackType(value) {
        if (!this.typeOf) {
            this.typeOf = typeof this.symbol === 'function' && typeof this.symbol.iterator === 'symbol'
                ? input => typeof input
                : input => input && typeof this.symbol === 'function' &&
                    input.constructor === this.symbol && input !== this.symbol.prototype
                    ? 'symbol' : typeof input;
        }
        return this.typeOf(value);
    }
}
export class DesktopDocumentCollector extends DesktopPropertyClassifier {
    context;
    constructor(context) {
        super(context);
        this.context = context;
    }
    collect() {
        let result = {};
        const classify = (key) => {
            const document = this.context.document;
            return this.classifyProperty(document, key, () => {
                result = document;
            });
        };
        const put = (key, value) => { setDesktopProperty(result, key, value); };
        put('all', classify('all'));
        put('characterSet', this.context.document.characterSet + '');
        put('compatMode', this.context.document.compatMode + '');
        put('documentMode', this.context.document.documentMode + '');
        put('images', classify('images'));
        put('layers', classify('layers'));
        return result;
    }
}
//# sourceMappingURL=desktop-device-properties.js.map