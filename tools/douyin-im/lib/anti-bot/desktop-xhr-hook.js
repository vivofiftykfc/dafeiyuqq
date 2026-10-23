import { setDesktopProperty, deleteDesktopProperty } from './desktop-property-write.js';
import { prepareDesktopXhrUrl } from './desktop-token.js';
export function installDesktopXhrHook(context, tokens, callbacks) {
    const prototype = context.XMLHttpRequest.prototype;
    const open = prototype.open;
    const send = prototype.send;
    const header = prototype.setRequestHeader;
    function copy(args) {
        const length = args.length;
        const result = new context.Array(length);
        for (let i = 0; i < length; i++)
            setDesktopProperty(result, i, args[i]);
        return result;
    }
    setDesktopProperty(prototype, 'open', function () {
        deleteDesktopProperty(this, 'bdmsInvokeList');
        const args = copy(arguments);
        const input = args[1];
        const isUrl = typeof context.URL !== 'undefined' && input instanceof context.URL;
        const pathname = isUrl ? input.pathname : new context.URL(input, context.location.href).pathname;
        if (!Reflect.apply(callbacks.matchesSigning, null, [pathname])) {
            open.apply(this, args);
            return;
        }
        setDesktopProperty(this, 'bdmsInvokeList', []);
        this.bdmsInvokeList.push({ func: open, args });
    });
    setDesktopProperty(prototype, 'setRequestHeader', function () {
        const args = copy(arguments);
        if (this.bdmsInvokeList) {
            this.bdmsInvokeList.push({ func: header, args });
            return;
        }
        header.apply(this, args);
    });
    setDesktopProperty(prototype, 'send', function (body) {
        if (this.bdmsInvokeList) {
            const args = this.bdmsInvokeList[0].args;
            const { url, isUrl } = prepareDesktopXhrUrl(context, args[1], body, tokens, {
                sign: (query, value) => Reflect.apply(callbacks.sign, null, [query, value]),
            });
            if (!isUrl)
                setDesktopProperty(args, 1, url.href);
            this.bdmsInvokeList.forEach(entry => { entry.func.apply(this, entry.args); });
            if (Reflect.apply(callbacks.matchesBehavior, null, [url.pathname])) {
                Reflect.apply(callbacks.reportBehavior, null, []);
            }
            deleteDesktopProperty(this, 'bdmsInvokeList');
        }
        send.apply(this, [body]);
    });
}
//# sourceMappingURL=desktop-xhr-hook.js.map