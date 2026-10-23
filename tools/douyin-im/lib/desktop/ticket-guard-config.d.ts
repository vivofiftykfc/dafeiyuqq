import type { DesktopApplicationSettings } from './settings.js';
export interface TicketGuardSessionConfig {
    enable?: boolean;
    ree_enable_symmetric?: boolean;
    ree_path?: string[];
    ree_path_prefix?: string[];
    ree_exclude_path?: string[];
    ree_exclude_path_prefix?: string[];
    config_version?: string;
}
export declare function filterTicketSessionConfig(value: unknown): TicketGuardSessionConfig;
export declare function desktopTicketPolicy(settings?: DesktopApplicationSettings, cached?: TicketGuardSessionConfig): {
    enabled: boolean;
    session: TicketGuardSessionConfig;
};
export declare function ticketSessionPathMatches(config: TicketGuardSessionConfig, pathname: string): boolean;
//# sourceMappingURL=ticket-guard-config.d.ts.map