export class DesktopWindowCollector {
    context;
    properties;
    math;
    constructor(context, properties) {
        this.context = context;
        this.properties = properties;
        this.math = context.Math;
    }
    collect() {
        const classify = (key) => this.properties.classify(this.context.window, key);
        return {
            ActiveXObject: classify('ActiveXObject'),
            BluetoothUUID: classify('BluetoothUUID'),
            devicePixelRatio: this.context.window.devicePixelRatio ? this.math.floor(this.context.window.devicePixelRatio) : -1,
            external: classify('external'),
            Image: classify('Image'),
            indexDB: classify('indexDB'),
            isSecureContext: classify('isSecureContext'),
            localStorage: classify('localStorage'),
            location: this.context.window.location?.href || '',
            locationbar: classify('locationbar'),
            mozRTCPeerConnection: classify('mozRTCPeerConnection'),
            netscape: classify('netscape'),
            postMessage: classify('postMessage'),
            sessionStorage: classify('sessionStorage'),
            toolbar: classify('toolbar'),
            webkitRequestAnimationFrame: classify('webkitRequestAnimationFrame'),
        };
    }
}
//# sourceMappingURL=desktop-window.js.map