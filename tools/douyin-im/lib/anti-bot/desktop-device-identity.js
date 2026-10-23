import { setDesktopProperty } from './desktop-property-write.js';
const fonts = [
    'Trebuchet MS', 'Wingdings', 'Sylfaen', 'Segoe UI', 'Constantia', 'SimSun-ExtB', 'MT Extra',
    'Gulim', 'Leelawadee', 'Tunga', 'Meiryo', 'Vrinda', 'CordiaUPC', 'Aparajita', 'IrisUPC',
    'Palatino', 'Colonna MT', 'Playbill', 'Jokerman', 'Parchment', 'MS Outlook', 'Tw Cen MT',
    'OPTIMA', 'Futura', 'AVENIR', 'Arial Hebrew', 'Savoye LET', 'Castellar', 'MYRIAD PRO',
].map(name => `72px ${name}`);
const permissions = [
    'geolocation', 'notifications', 'push', 'midi', 'camera', 'microphone', 'speaker', 'device-info',
    'background-sync', 'bluetooth', 'persistent-storage', 'ambient-light-sensor', 'accelerometer',
    'gyroscope', 'magnetometer', 'clipboard', 'accessibility-events', 'clipboard-read',
    'clipboard-write', 'payment-handler',
];
export class DesktopDeviceIdentityCollector {
    context;
    date;
    math;
    constructor(context) {
        this.context = context;
        this.date = context.Date;
        this.math = context.Math;
    }
    async collect() {
        const browserType = this.browserType();
        const jsFontsList = this.fonts();
        const jsv = '1.5';
        const load = await this.imageLoad();
        const magic = this.storage();
        const nap = await this.permissions();
        const nativeLength = this.context.window.eval.toString().length;
        const timestamp = this.date.now() + '';
        const timezone = -this.math.floor(new this.date().getTimezoneOffset() / 60);
        return { browserType, jsFontsList, jsv, load, magic, msgType: 1, nap, nativeLength, privacyMode: 0, timestamp, timezone };
    }
    browserType() {
        const opera = !!this.context.window.opr;
        const firefox = typeof this.context.window.InstallTrigger !== 'undefined';
        const edge = !!this.context.window.chrome?.edgeNurturingPrivate;
        const ie = !!this.context.document.documentMode;
        const chrome = !!this.context.window.chrome && !opera && !edge;
        const safari = !!this.context.window.ApplePaySession;
        return [opera, firefox, edge, ie, chrome, false, safari].reduce((mask, value, index) => value ? mask | (1 << index) : mask, 0);
    }
    fonts() {
        if (!this.context.document)
            return '0';
        if (!this.context.document.fonts || !this.context.document.fonts.check)
            return '1';
        let mask = 0;
        for (let index = 0; index < fonts.length; index++) {
            if (this.context.document.fonts.check(fonts[index]))
                mask |= 1 << index;
        }
        return mask.toString(16);
    }
    async imageLoad() {
        return new Promise(resolve => {
            const image = new this.context.Image();
            setDesktopProperty(image, 'onload', () => {
                try {
                    const canvas = this.context.document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    if (!context) {
                        resolve(1);
                        return;
                    }
                    context.drawImage(image, 0, 0);
                    resolve(context.getImageData(0, 0, 1, 1).data[3] === 0 ? 3 : 2);
                }
                catch {
                    resolve(1);
                }
            });
            setDesktopProperty(image, 'onerror', () => { resolve(1); });
            setDesktopProperty(image, 'src', 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
        });
    }
    storage() {
        let mask = 0;
        try {
            this.context.localStorage.setItem('bdms', '');
            this.context.localStorage.removeItem('bdms');
            mask |= 1;
        }
        catch { }
        try {
            this.context.sessionStorage.setItem('bdms', '');
            this.context.sessionStorage.removeItem('bdms');
            mask |= 2;
        }
        catch { }
        return mask;
    }
    async permissions() {
        if (!this.context.navigator.permissions)
            return '6';
        try {
            const queries = permissions.map(name => this.context.navigator.permissions.query({ name })
                .then(result => {
                switch (result.state) {
                    case 'granted': return '2';
                    case 'denied': return '0';
                    case 'prompt': return '1';
                    default: return '5';
                }
            }).catch((error) => error.message.indexOf('is not a valid enum value of type PermissionName') > 0 ? '4' : '3'));
            return (await Promise.all(queries)).join('');
        }
        catch {
            return '7';
        }
    }
}
//# sourceMappingURL=desktop-device-identity.js.map