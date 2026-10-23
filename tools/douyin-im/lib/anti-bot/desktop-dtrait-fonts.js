import { APPLE_FONTS, CANDIDATE_FONTS, EMOJI, FONT_STYLE, WINDOWS_FONTS, } from './desktop-dtrait-font-data.js';
function systemVersion(fonts) {
    const windows = {
        '11': WINDOWS_FONTS['11'].find(font => fonts.includes(font)),
        '10': WINDOWS_FONTS['10'].find(font => fonts.includes(font)),
        '8.1': WINDOWS_FONTS['8.1'].find(font => fonts.includes(font)),
        '8': WINDOWS_FONTS['8'].find(font => fonts.includes(font)),
        '7': WINDOWS_FONTS['7'].every(font => fonts.includes(font)),
    };
    const signature = Object.keys(windows)
        .sort()
        .filter(key => Boolean(windows[key]))
        .join(',');
    const windowsVersions = {
        '10,11,7,8,8.1': '11',
        '10,7,8,8.1': '10',
        '7,8,8.1': '8.1',
    };
    if (windowsVersions[signature])
        return 'Windows '.concat(windowsVersions[signature]);
    const apple = {
        '13': APPLE_FONTS['13'].find(font => fonts.includes(font)),
        '12': APPLE_FONTS['12'].find(font => fonts.includes(font)),
        '10.15-11': APPLE_FONTS['10.15-11'].find(font => fonts.includes(font)),
    };
    const appleSignature = Object.keys(apple)
        .sort()
        .filter(key => Boolean(apple[key]))
        .join(',');
    const appleVersions = {
        '10.10,10.11,10.12,10.13-10.14,10.15-11,10.9,12,13': 'Ventura',
        '10.10,10.11,10.12,10.13-10.14,10.15-11,10.9,12': 'Monterey',
    };
    return appleVersions[appleSignature]
        ? 'macOS '.concat(appleVersions[appleSignature])
        : undefined;
}
export function createDesktopDTraitFontsCollector(context) {
    const detect = async () => {
        try {
            const random = String.fromCharCode(context.Math.random() * 26 + 97) +
                context.Math.random().toString(36).slice(-7);
            if (!context.document.fonts.check('0px "'.concat(random, '"')))
                return CANDIDATE_FONTS.filter(font => context.document.fonts.check('0px "'.concat(font, '"')));
            const faces = CANDIDATE_FONTS.map(font => new context.FontFace(font, 'local("'.concat(font, '")')));
            const loaded = await Promise.all(faces.map(face => face.load().catch(() => null)));
            return loaded?.filter(face => face !== null).map(face => face?.family);
        }
        catch {
            context.onDiagnostic('font-detection');
            return [];
        }
    };
    return async () => {
        let root = null;
        let container = null;
        try {
            const document = context.document;
            root = document.createElement('div');
            root.setAttribute('id', 'font-fingerprint');
            document.body.appendChild(root);
            const emojiFragment = context.document.createDocumentFragment();
            EMOJI.forEach(text => {
                const node = context.document.createElement('div');
                node.className = 'pixel-emoji';
                node.textContent = text;
                emojiFragment.appendChild(node);
            });
            const style = context.document.createElement('style');
            style.textContent =
                '\n      .pixel-emoji {\n        font-family: '.concat(FONT_STYLE, ';\n        font-size: 200px !important;\n        height: auto;\n        position: absolute !important;\n        transform: scale(1.000999);\n      }\n    ');
            const fragment = context.document.createDocumentFragment();
            fragment.appendChild(style);
            container = context.document.createElement('div');
            container.id = 'pixel-emoji-container';
            container.appendChild(emojiFragment);
            fragment.appendChild(container);
            const found = document.getElementById('font-fingerprint');
            if (found)
                found.parentNode?.replaceChild(fragment, found);
            const nodes = Array.from(document.querySelectorAll('.pixel-emoji'));
            const sizes = new Set(), emojiSet = new Set();
            nodes.forEach((node, index) => {
                const measured = context.getComputedStyle(node);
                const emoji = EMOJI[index];
                const size = ''
                    .concat(measured.inlineSize, ',')
                    .concat(measured.blockSize);
                if (!sizes.has(size)) {
                    sizes.add(size);
                    emojiSet.add(emoji);
                }
            });
            const sum = [...sizes]
                .map(size => size
                .split(',')
                .map(value => context.parseFloat(value))
                .reduce((a, b) => a + b, 0))
                .reduce((a, b) => a + b, 0) * 0.00001;
            const foundFonts = await detect();
            const system = systemVersion(foundFonts);
            return {
                str_10: context.hash((foundFonts || []).join(',')),
                str_17: context.hash(''
                    .concat(context.navigator.platform, ',')
                    .concat(system)),
                str_7: context.hash([...emojiSet].join(',')),
                str_21: context.hash(''.concat(sum)),
            };
        }
        catch {
            context.onDiagnostic('ft');
            return {
                str_10: context.hash(''),
                str_17: context.hash(''),
                str_7: context.hash(''),
                str_21: context.hash(''),
            };
        }
        finally {
            if (container) {
                while (container.firstChild)
                    container.removeChild(container.firstChild);
                container = null;
            }
            if (root && root.parentNode) {
                root.parentNode.removeChild(root);
                root = null;
            }
            if (typeof context.window.gc === 'function')
                context.window.gc();
        }
    };
}
//# sourceMappingURL=desktop-dtrait-fonts.js.map