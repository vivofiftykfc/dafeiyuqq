export interface DesktopPluginMime {
    readonly type?: unknown;
    readonly suffixes?: unknown;
}
export interface DesktopPlugin {
    readonly filename?: unknown;
    readonly length: number;
    item(index: number): DesktopPluginMime | null | undefined;
}
export interface DesktopPluginsContext {
    readonly navigator: {
        readonly plugins?: {
            readonly length: number;
            item(index: number): DesktopPlugin | null | undefined;
        } | null;
    };
}
export declare function collectDesktopPlugins(context: DesktopPluginsContext): {
    plugin: string[];
    pv: '0';
};
//# sourceMappingURL=desktop-plugins.d.ts.map