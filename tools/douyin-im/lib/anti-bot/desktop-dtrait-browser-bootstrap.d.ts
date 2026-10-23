import { DesktopDTraitBootstrap, type DesktopDTraitBootstrapContext, type DesktopDTraitMonitor } from './desktop-dtrait-bootstrap.js';
import type { DesktopDTraitParametersContext } from './desktop-dtrait-parameters.js';
import { type DesktopDTraitBrowserDependencies, type DesktopDTraitBrowserInstallRealm } from './desktop-dtrait-browser-install.js';
export declare const DESKTOP_DTRAIT_LOCAL_CORE_VERSION = "1.0.31";
export type DesktopDTraitBrowserBootstrapRealm = DesktopDTraitBrowserInstallRealm & Pick<DesktopDTraitParametersContext, 'document' | 'window' | 'localStorage'> & {
    readonly XMLHttpRequest: new () => unknown;
};
export interface DesktopDTraitBrowserBootstrapOptions extends DesktopDTraitBrowserDependencies {
    monitor: DesktopDTraitMonitor;
    monitorInstances?: DesktopDTraitBootstrapContext['monitorInstances'];
}
export declare function createDesktopDTraitBrowserBootstrap(realm: DesktopDTraitBrowserBootstrapRealm, options: DesktopDTraitBrowserBootstrapOptions): DesktopDTraitBootstrap;
//# sourceMappingURL=desktop-dtrait-browser-bootstrap.d.ts.map