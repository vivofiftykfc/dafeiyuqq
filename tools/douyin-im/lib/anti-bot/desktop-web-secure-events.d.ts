export declare class DesktopWebSecureEvents<Events extends Record<string, unknown> = Record<string, unknown>> {
    private readonly events;
    on<K extends keyof Events & string>(name: K, listener: (event: Events[K]) => void): void;
    off<K extends keyof Events & string>(name: K, listener?: (event: Events[K]) => void): void;
    emit<K extends keyof Events & string>(name: K, event: Events[K]): void;
    has<K extends keyof Events & string>(name: K, listener?: (event: Events[K]) => void): boolean;
}
//# sourceMappingURL=desktop-web-secure-events.d.ts.map