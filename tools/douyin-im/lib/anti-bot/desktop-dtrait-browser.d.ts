import { DesktopDTraitCollector } from './desktop-dtrait-collector.js';
import { createDesktopDTraitCore, type DesktopDTraitCoreContext, type DesktopDTraitCoreRealmState } from './desktop-dtrait-request-core.js';
import { type DesktopDTraitBoolContext } from './desktop-dtrait-bool.js';
import { type DesktopDTraitEnvironmentContext } from './desktop-dtrait-environment.js';
import { type DesktopDTraitMediaContext } from './desktop-dtrait-media.js';
import { type DesktopDTraitSpeechContext } from './desktop-dtrait-speech.js';
import { type DesktopDTraitFontsContext } from './desktop-dtrait-fonts.js';
import { type DesktopDTraitTransportRealm } from './desktop-dtrait-transport.js';
export interface DesktopDTraitBrowserRealm {
    readonly document: {
        readonly body: unknown;
        createElement(tag: string): unknown;
        createElementNS(namespace: string, tag: string): unknown;
        createDocumentFragment(): unknown;
        getElementById(id: string): unknown;
        querySelector(selector: string): unknown;
        querySelectorAll(selector: string): unknown;
        getElementsByClassName(name: string): unknown;
        createEvent(name: string): unknown;
        readonly fonts: unknown;
    };
    readonly navigator: DesktopDTraitBoolContext['navigator'] & DesktopDTraitEnvironmentContext['navigator'] & {
        readonly platform: unknown;
    };
    readonly window: DesktopDTraitEnvironmentContext['window'] & {
        gc?: (() => void) | undefined;
    };
    readonly screen: DesktopDTraitEnvironmentContext['screen'];
    readonly Math: Math;
    readonly Date: {
        now(): number;
    };
    readonly performance: {
        now(): number;
    };
    readonly TextEncoder: new () => {
        encode(value?: string): Uint8Array;
    };
    readonly Audio: DesktopDTraitMediaContext['Audio'];
    readonly FontFace: DesktopDTraitFontsContext['FontFace'];
    readonly OfflineAudioContext?: (new (channels: number, length: number, sampleRate: number) => unknown) | undefined;
    readonly RTCPeerConnection?: DesktopDTraitBoolContext['RTCPeerConnection'];
    readonly speechSynthesis?: DesktopDTraitSpeechContext['speechSynthesis'];
    readonly MediaSource?: DesktopDTraitMediaContext['MediaSource'];
    readonly MediaRecorder?: DesktopDTraitMediaContext['MediaRecorder'];
    getComputedStyle(node: unknown): unknown;
    setTimeout(callback: () => void, delay: number): unknown;
    clearTimeout(timer: unknown): void;
    parseInt(value: string, radix: number): number;
    parseFloat(value: string): number;
    atob(value: string): string;
    btoa(value: string): string;
}
export declare function createDesktopDTraitBrowserCollector(realm: DesktopDTraitBrowserRealm): {
    collector: DesktopDTraitCollector;
    hash: (value: unknown, seed?: number) => number;
    realmState: DesktopDTraitCoreRealmState;
};
export interface DesktopDTraitBrowserCoreOptions {
    readonly crypto: DesktopDTraitCoreContext['crypto'];
    readonly getCryptoUtil: DesktopDTraitCoreContext['featureContext']['getCryptoUtil'];
    installHooks?: DesktopDTraitCoreContext['installHooks'];
    onBackgroundError?: DesktopDTraitCoreContext['onBackgroundError'];
}
export declare function createDesktopDTraitBrowserCore(realm: DesktopDTraitBrowserRealm & DesktopDTraitTransportRealm, options: DesktopDTraitBrowserCoreOptions): ReturnType<typeof createDesktopDTraitCore>;
export declare function createDesktopDTraitBrowserCore(realm: DesktopDTraitBrowserRealm, options: DesktopDTraitBrowserCoreOptions & {
    installHooks: DesktopDTraitCoreContext['installHooks'];
}): ReturnType<typeof createDesktopDTraitCore>;
//# sourceMappingURL=desktop-dtrait-browser.d.ts.map