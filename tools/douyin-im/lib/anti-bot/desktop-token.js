export class DesktopTokenState {
    context;
    inner = '';
    constructor(context) {
        this.context = context;
        try {
            this.inner = context.localStorage.getItem('xmst') || '';
        }
        catch { }
    }
    get token() { return this.inner; }
    onReportLoad(xhr, deviceReport) {
        const alreadyHadToken = !!this.inner;
        const next = xhr.getResponseHeader('x-ms-token');
        if (!next)
            return;
        try {
            this.context.localStorage.setItem('xmst', next);
        }
        catch { }
        this.inner = next;
        if (!alreadyHadToken)
            Reflect.apply(this.context.requestAnimationFrame, null, [deviceReport]);
    }
}
export function signDesktopXhrUrl(context, input, body, state, signer) {
    const { url, isUrl } = prepareDesktopXhrUrl(context, input, body, state, signer);
    return isUrl ? url : url.href;
}
export function prepareDesktopXhrUrl(context, input, body, state, signer) {
    const isUrl = typeof context.URL !== 'undefined' && input instanceof context.URL;
    const url = isUrl ? input : new context.URL(input, context.location.href);
    if (!url.searchParams.has('msToken') && state.token)
        url.searchParams.append('msToken', state.token);
    if (!url.searchParams.has('a_bogus')) {
        const signature = signer.sign(url.searchParams.toString(), body);
        url.searchParams.append('a_bogus', signature);
    }
    return { url, isUrl };
}
//# sourceMappingURL=desktop-token.js.map