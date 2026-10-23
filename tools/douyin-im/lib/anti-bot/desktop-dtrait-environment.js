export function createDesktopDTraitEnvironmentCollector(context) {
    const touchPoints = () => {
        const navigator = context.navigator;
        let value = 0;
        if (navigator.maxTouchPoints !== undefined)
            value = context.parseInt(''.concat(navigator.maxTouchPoints), 10);
        else if (navigator.msMaxTouchPoints !== undefined)
            value = navigator.msMaxTouchPoints;
        return value;
    };
    const arrayValues = (items, key) => {
        if (!items || !Array.isArray(items) || !items?.length)
            return [];
        const values = [];
        for (let index = 0; index < items.length; index++) {
            const item = items[index];
            if (!item)
                continue;
            values.push(item[key]);
        }
        return values;
    };
    return () => {
        try {
            return {
                str_14: context.hash(''
                    .concat(context.navigator.connection?.downlink, ',')
                    .concat(context.navigator.connection?.effectiveType)),
                str_15: context.hash(''
                    .concat(context.navigator?.language, ',')
                    .concat(context.navigator?.languages?.join(','))),
                str_16: context.hash(''
                    .concat(arrayValues(context.navigator.mimeTypes, 'type')?.join(','), ',')
                    .concat(context.navigator?.vendor)),
                str_18: context.hash(arrayValues(context.navigator.plugins, 'name')?.join(',')),
                str_19: context.hash(''.concat(context.navigator?.userAgent)),
                str_29: context.hash(''
                    .concat(touchPoints(), ',')
                    .concat(context.navigator?.deviceMemory, ',')
                    .concat(context.navigator?.hardwareConcurrency, ',')
                    .concat(context.navigator?.maxTouchPoints)),
                str_27: context.hash(''
                    .concat(context.window?.Intl?.DateTimeFormat()?.resolvedOptions()
                    ?.locale, '+')
                    .concat(context.window?.Intl?.DateTimeFormat()?.resolvedOptions()
                    ?.timeZone)),
                str_28: context.hash(context.window?.Notification?.permission),
                str_30: context.hash(''
                    .concat(context.screen.availHeight, ',')
                    .concat(context.screen.availLeft, ',')
                    .concat(context.screen.availTop, ',')
                    .concat(context.screen.availWidth)),
                str_31: context.hash(''
                    .concat(context.screen.height, ',')
                    .concat(context.screen.width)),
                str_32: context.hash(''
                    .concat(context.screen.colorDepth, ',')
                    .concat(context.screen.pixelDepth, ',')
                    .concat(context.window.devicePixelRatio)),
            };
        }
        catch {
            context.onDiagnostic('str');
            return {
                str_14: context.hash(''),
                str_15: context.hash(''),
                str_16: context.hash(''),
                str_18: context.hash(''),
                str_19: context.hash(''),
                str_29: context.hash(''),
                str_27: context.hash(''),
                str_28: context.hash(''),
                str_30: context.hash(''),
                str_31: context.hash(''),
                str_32: context.hash(''),
            };
        }
    };
}
//# sourceMappingURL=desktop-dtrait-environment.js.map