export function collectDesktopScreenGeometry(context) {
    const int32 = (value) => value >> 0;
    return {
        innerWidth: int32(context.window.innerWidth), innerHeight: int32(context.window.innerHeight),
        outerWidth: int32(context.window.outerWidth), outerHeight: int32(context.window.outerHeight),
        screenX: int32(context.window.screenX), screenY: int32(context.window.screenY),
        pageXOffset: int32(context.window.pageYOffset), pageYOffset: int32(context.window.pageYOffset),
        availWidth: int32(context.window.screen.availWidth), availHeight: int32(context.window.screen.availHeight),
        sizeWidth: int32(context.window.screen.width), sizeHeight: int32(context.window.screen.height),
        clientWidth: context.document.body ? int32(context.document.body.clientWidth) : -1,
        clientHeight: context.document.body ? int32(context.document.body.clientHeight) : -1,
        colorDepth: int32(context.window.screen.colorDepth), pixelDepth: int32(context.window.screen.pixelDepth),
    };
}
export function collectDesktopReportScreen(context) {
    return {
        ...collectDesktopScreenGeometry(context),
        orientaionType: context.window.screen?.orientation?.type || '',
        orientaionAngle: context.window.screen?.orientation?.angle >> 0,
    };
}
export function buildDesktopFingerprint(context) {
    return [...Object.values(collectDesktopScreenGeometry(context)), context.navigator.platform].map(value => String(value)).join('|');
}
//# sourceMappingURL=desktop-fingerprint.js.map