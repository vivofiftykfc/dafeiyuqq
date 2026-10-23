export function collectDesktopPlugins(context) {
    const values = [];
    try {
        if (context.navigator.plugins && context.navigator.plugins.length) {
            for (let i = 0; i < context.navigator.plugins.length; i++) {
                const plugin = context.navigator.plugins.item(i);
                if (plugin && plugin.length) {
                    for (let j = 0; j < plugin.length; j++) {
                        const mime = plugin.item(j);
                        if (mime) {
                            values.push(''.concat(plugin.filename, '|')
                                .concat(mime.type, '|').concat(mime.suffixes));
                        }
                    }
                }
            }
        }
    }
    catch { }
    return { plugin: values, pv: '0' };
}
//# sourceMappingURL=desktop-plugins.js.map