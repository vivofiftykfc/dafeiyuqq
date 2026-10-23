import { ConsoleTransport, DefaultFormatter, LogLevel, Logger, } from '@zhin.js/logger';
const DEFAULT_LEVEL = LogLevel.SILENT;
const knownLoggers = new Set();
let configuration = {
    level: DEFAULT_LEVEL,
    maskSensitive: true,
    color: true,
};
const registryRoot = new Logger(null, '', buildOptions(configuration));
const rootLogger = registryRoot.getLogger('DouyinIM', buildOptions(configuration));
knownLoggers.add(rootLogger);
function buildOptions(options) {
    return {
        level: options.level ?? DEFAULT_LEVEL,
        formatter: options.formatter ?? new DefaultFormatter(options.colors),
        transports: options.transports ?? [
            new ConsoleTransport({
                maskSensitive: options.maskSensitive ?? true,
                removeAnsi: options.color === false,
            }),
        ],
    };
}
export function configureLogger(options = {}) {
    configuration = {
        ...configuration,
        ...options,
    };
    const loggerOptions = buildOptions(configuration);
    for (const logger of knownLoggers)
        logger.setOptions(loggerOptions);
    rootLogger.setLevel(loggerOptions.level, true);
    return rootLogger;
}
export function getLogger(scope) {
    if (!scope)
        return rootLogger;
    const logger = rootLogger.getLogger(scope);
    logger.setOptions(buildOptions(configuration));
    knownLoggers.add(logger);
    return logger;
}
export function getAccountLogger(accountId) {
    const identity = accountId?.trim() || 'pending';
    const name = `Douyin:${identity}`;
    const logger = registryRoot.getLogger(name);
    logger.setOptions(buildOptions(configuration));
    knownLoggers.add(logger);
    return logger;
}
export function setLogLevel(level) {
    configuration = { ...configuration, level };
    rootLogger.setLevel(level, true);
}
export { LogLevel, Logger } from '@zhin.js/logger';
//# sourceMappingURL=logger.js.map