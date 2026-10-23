const DEFAULT_CONFIG = {
    enable: true, ree_enable_symmetric: true,
    ree_path: ['/passport/account/info/v2/', '/aweme/v1/web/commit/follow/user/',
        '/passport/token/beat/web/', '/passport/token/beat/v2/', '/webcast/room/create/'],
};
const PATH_FIELDS = ['ree_path', 'ree_path_prefix', 'ree_exclude_path', 'ree_exclude_path_prefix'];
function record(value) {
    return value !== null && (typeof value === 'object' || typeof value === 'function')
        ? value : undefined;
}
export function filterTicketSessionConfig(value) {
    const source = record(value);
    const result = {};
    if (!source)
        return result;
    for (const key of ['enable', 'ree_enable_symmetric']) {
        if (typeof source[key] === 'boolean')
            result[key] = source[key];
    }
    for (const key of PATH_FIELDS) {
        const paths = source[key];
        if (Array.isArray(paths))
            result[key] = paths.filter((path) => typeof path === 'string');
    }
    if (typeof source['config_version'] === 'string')
        result.config_version = source['config_version'];
    return result;
}
export function desktopTicketPolicy(settings, cached) {
    const previous = filterTicketSessionConfig(cached);
    if (settings?.['bdticket_switch'] === false)
        return { enabled: false, session: previous };
    const selected = settings?.['bdticket_config'] || { session_guard_config: DEFAULT_CONFIG };
    if (typeof selected !== 'object' || selected === null)
        return { enabled: false, session: previous };
    const update = filterTicketSessionConfig(record(selected)?.['session_guard_config']);
    return { enabled: true, session: Object.keys(update).length ? update : previous };
}
export function ticketSessionPathMatches(config, pathname) {
    if (!config.enable)
        return false;
    const path = pathname && !pathname.endsWith('/') ? `${pathname}/` : pathname;
    const prefixed = (values) => values?.some(prefix => !!prefix && path.startsWith(prefix)) ?? false;
    if (config.ree_exclude_path?.includes(path) || prefixed(config.ree_exclude_path_prefix))
        return false;
    return !!config.ree_path?.includes(path) || prefixed(config.ree_path_prefix);
}
//# sourceMappingURL=ticket-guard-config.js.map