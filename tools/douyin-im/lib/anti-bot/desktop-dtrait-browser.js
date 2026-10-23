import { DesktopDTraitCollector, } from './desktop-dtrait-collector.js';
import { createDesktopDTraitHash } from './desktop-dtrait-features.js';
import { createDesktopDTraitCore, } from './desktop-dtrait-request-core.js';
import { createDesktopDTraitBoolCollector, } from './desktop-dtrait-bool.js';
import { createDesktopDTraitEnvironmentCollector, } from './desktop-dtrait-environment.js';
import { createDesktopDTraitCanvasCollector, createDesktopDTraitDomCollector, } from './desktop-dtrait-rendering.js';
import { createDesktopDTraitCssCollector, } from './desktop-dtrait-css.js';
import { createDesktopDTraitMediaCollector, } from './desktop-dtrait-media.js';
import { createDesktopDTraitSpeechCollector, } from './desktop-dtrait-speech.js';
import { createDesktopDTraitSvgCollector, } from './desktop-dtrait-svg.js';
import { createDesktopDTraitMathCollector } from './desktop-dtrait-math.js';
import { createDesktopDTraitWebGLCollector, } from './desktop-dtrait-webgl.js';
import { createDesktopDTraitFontsCollector, } from './desktop-dtrait-fonts.js';
import { createDesktopDTraitAudioCollector, } from './desktop-dtrait-audio.js';
import { createDesktopDTraitTransportInstaller, } from './desktop-dtrait-transport.js';
export function createDesktopDTraitBrowserCollector(realm) {
    const realmState = {
        hookLogCount: 0,
        collectionCount: 0,
        collectionErrors: [],
    };
    const diagnostic = (name) => {
        realmState.collectionErrors.push({ name });
    };
    const hash = createDesktopDTraitHash({
        encoder: new realm.TextEncoder(),
        onDiagnostic: diagnostic,
    });
    const common = {
        get navigator() {
            return realm.navigator;
        },
        get window() {
            return realm.window;
        },
        get screen() {
            return realm.screen;
        },
        get Math() {
            return realm.Math;
        },
        get Date() {
            return realm.Date;
        },
        setTimeout: (callback, delay) => realm.setTimeout(callback, delay),
        clearTimeout: (timer) => realm.clearTimeout(timer),
        parseInt: (value, radix) => realm.parseInt(value, radix),
        parseFloat: (value) => realm.parseFloat(value),
        hash,
        onDiagnostic: diagnostic,
    };
    const bind = (own) => Object.defineProperties(own, Object.getOwnPropertyDescriptors(common));
    const plugins = {
        boolFeature: createDesktopDTraitBoolCollector(bind({
            get document() {
                return realm.document;
            },
            get RTCPeerConnection() {
                return realm.RTCPeerConnection;
            },
        })),
        strFeature: createDesktopDTraitEnvironmentCollector(common),
        canvas: createDesktopDTraitCanvasCollector(bind({
            get document() {
                return realm.document;
            },
        })),
        audio: createDesktopDTraitAudioCollector(bind({
            get OfflineAudioContext() {
                return realm.OfflineAudioContext;
            },
        })),
        css: createDesktopDTraitCssCollector(bind({
            get document() {
                return realm.document;
            },
            getComputedStyle: (node) => realm.getComputedStyle(node),
        })),
        domRect: createDesktopDTraitDomCollector(bind({
            get document() {
                return realm.document;
            },
        })),
        mediaTypes: createDesktopDTraitMediaCollector(bind({
            get document() {
                return realm.document;
            },
            get Audio() {
                return realm.Audio;
            },
            get MediaSource() {
                return realm.MediaSource;
            },
            get MediaRecorder() {
                return realm.MediaRecorder;
            },
        })),
        speech: createDesktopDTraitSpeechCollector(bind({
            get speechSynthesis() {
                return realm.speechSynthesis;
            },
        })),
        svgRect: createDesktopDTraitSvgCollector(bind({
            get document() {
                return realm.document;
            },
        })),
        math: createDesktopDTraitMathCollector(common),
        webGL: createDesktopDTraitWebGLCollector(bind({
            get document() {
                return realm.document;
            },
        })),
        fonts: createDesktopDTraitFontsCollector(bind({
            get document() {
                return realm.document;
            },
            get FontFace() {
                return realm.FontFace;
            },
            getComputedStyle: (node) => realm.getComputedStyle(node),
        })),
    };
    return {
        collector: new DesktopDTraitCollector(common, plugins),
        hash,
        realmState,
    };
}
export function createDesktopDTraitBrowserCore(realm, options) {
    const { collector, hash, realmState } = createDesktopDTraitBrowserCollector(realm);
    const installHooks = options.installHooks ??
        createDesktopDTraitTransportInstaller(realm, { onBackgroundError: error => options.onBackgroundError?.(error) });
    return createDesktopDTraitCore({
        get Date() {
            return realm.Date;
        },
        get performance() {
            return realm.performance;
        },
        atob: value => realm.atob(value),
        setTimeout: (callback, delay) => realm.setTimeout(callback, delay),
        crypto: options.crypto,
        featureContext: {
            hash,
            btoa: value => realm.btoa(value),
            getCryptoUtil: options.getCryptoUtil,
        },
        collect: () => collector.collect(),
        realmState,
        installHooks,
        onBackgroundError: error => options.onBackgroundError?.(error),
    });
}
//# sourceMappingURL=desktop-dtrait-browser.js.map