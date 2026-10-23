import { setDesktopProperty } from './desktop-property-write.js';
export class DesktopBdmsConfiguration {
    context;
    start;
    config = {
        aid: 0, pageId: 0, boe: false, ddrt: 3, paths: { include: [], exclude: [] },
        track: { mode: 0, delay: 300, paths: [] }, dump: true, rpU: '',
    };
    array;
    object;
    regexp;
    symbol;
    typeError;
    constructor(context, start) {
        this.context = context;
        this.start = start;
        this.array = context.Array;
        this.object = context.Object;
        this.regexp = context.RegExp;
        this.symbol = context.Symbol;
        this.typeError = context.TypeError;
    }
    init(options) {
        setDesktopProperty(this.context.window, 'onwheelx', { _Ax: '0X21' });
        if (!this.config.aid)
            setDesktopProperty(this.config, 'aid', options.aid || 0);
        if (!this.config.pageId)
            setDesktopProperty(this.config, 'pageId', options.pageId || 0);
        setDesktopProperty(this.config, 'boe', options.boe || false);
        setDesktopProperty(this.config, 'ddrt', options.ddrt || 3);
        setDesktopProperty(this.config, 'dump', options.dump ?? true);
        setDesktopProperty(this.config, 'rpU', options.rpU || '');
        const paths = options.paths || [];
        let include;
        let exclude = [];
        if (this.array.isArray(paths))
            include = this.compile(paths);
        else {
            const lists = paths;
            include = this.compile(lists.include || []);
            exclude = this.compile(lists.exclude || []);
        }
        const included = this.config.paths.include;
        included.push.apply(included, this.spread(include));
        const excluded = this.config.paths.exclude;
        excluded.push.apply(excluded, this.spread(exclude));
        if (options.track) {
            setDesktopProperty(this.config.track, 'mode', options.track.mode || 0);
            setDesktopProperty(this.config.track, 'delay', options.track.delay || 300);
            if (this.config.track.mode === 0 && options.track.paths) {
                const target = this.config.track.paths;
                target.push.apply(target, this.spread(this.compile(options.track.paths)));
            }
        }
        this.object.defineProperty(this.context.window.onwheelx, '_Ax', { writable: false });
        Reflect.apply(this.start, null, []);
    }
    matchesSigning(pathname) {
        const paths = this.config.paths;
        const include = paths.include;
        const exclude = paths.exclude;
        return !exclude.some(pattern => pattern.test(pathname)) && include.some(pattern => pattern.test(pathname));
    }
    matchesBehavior(pathname) {
        return this.config.track.paths.some(pattern => pattern.test(pathname));
    }
    compile(paths) {
        return paths.map(pattern => new this.regexp(pattern));
    }
    spread(input) {
        if (this.array.isArray(input))
            return this.copy(input);
        const value = input;
        if ((typeof this.symbol !== 'undefined' && value[this.symbol.iterator] != null) || value['@@iterator'] != null) {
            return this.array.from(input);
        }
        if (input) {
            if (typeof input === 'string')
                return this.copy(input);
            let tag = this.object.prototype.toString.call(input).slice(8, -1);
            if (tag === 'Object' && value['constructor'])
                tag = value['constructor'].name;
            if (tag === 'Map' || tag === 'Set')
                return this.array.from(input);
            if (tag === 'Arguments' || new this.regexp('^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$').test(tag)) {
                return this.copy(input);
            }
        }
        throw new this.typeError('Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.');
    }
    copy(input) {
        const length = input.length;
        const result = new this.array(length);
        for (let i = 0; i < length; i++)
            setDesktopProperty(result, i, input[i]);
        return result;
    }
}
//# sourceMappingURL=desktop-config.js.map