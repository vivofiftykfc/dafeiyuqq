import { Logger, type LogFormatter, type LoggerColorOptions, type LogLevelInput, type LogTransport } from '@zhin.js/logger';
export interface LoggerConfiguration {
    level?: LogLevelInput;
    maskSensitive?: boolean;
    color?: boolean;
    formatter?: LogFormatter;
    transports?: LogTransport[];
    colors?: LoggerColorOptions;
}
export declare function configureLogger(options?: LoggerConfiguration): Logger;
export declare function getLogger(scope?: string): Logger;
export declare function getAccountLogger(accountId?: string): Logger;
export declare function setLogLevel(level: LogLevelInput): void;
export { LogLevel, Logger } from '@zhin.js/logger';
export type { LogFormatter, LoggerColorOptions, LogLevelInput, LogTransport } from '@zhin.js/logger';
//# sourceMappingURL=logger.d.ts.map