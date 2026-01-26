/**
 * Structured Logger for LifeOS Backend
 * 
 * Provides consistent, structured logging with levels, timestamps,
 * and context for better debugging and monitoring.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Environment-based log level (default: info in production, debug in development)
const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
};

const formatEntry = (entry: LogEntry): string => {
  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
  const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
  const errorStr = entry.error ? `\n  Error: ${entry.error.name}: ${entry.error.message}` : '';
  const stackStr = entry.error?.stack && process.env.NODE_ENV !== 'production' 
    ? `\n  Stack: ${entry.error.stack}` 
    : '';
  
  return `${prefix} ${entry.message}${contextStr}${errorStr}${stackStr}`;
};

const createEntry = (
  level: LogLevel, 
  message: string, 
  context?: LogContext, 
  error?: Error
): LogEntry => ({
  timestamp: new Date().toISOString(),
  level,
  message,
  context,
  error: error ? {
    name: error.name,
    message: error.message,
    stack: error.stack,
  } : undefined,
});

export const logger = {
  /**
   * Debug-level logging for development
   * Includes detailed context for troubleshooting
   */
  debug(message: string, context?: LogContext): void {
    if (!shouldLog('debug')) return;
    const entry = createEntry('debug', message, context);
    console.log(formatEntry(entry));
  },

  /**
   * Info-level logging for normal operations
   * Server startup, successful operations, etc.
   */
  info(message: string, context?: LogContext): void {
    if (!shouldLog('info')) return;
    const entry = createEntry('info', message, context);
    console.log(formatEntry(entry));
  },

  /**
   * Warning-level logging for recoverable issues
   * Rate limits approached, deprecated usage, etc.
   */
  warn(message: string, context?: LogContext): void {
    if (!shouldLog('warn')) return;
    const entry = createEntry('warn', message, context);
    console.warn(formatEntry(entry));
  },

  /**
   * Error-level logging for failures
   * Unhandled exceptions, API failures, etc.
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (!shouldLog('error')) return;
    const err = error instanceof Error ? error : undefined;
    const entry = createEntry('error', message, context, err);
    console.error(formatEntry(entry));
  },

  /**
   * Request logging middleware context
   * Use for API request/response logging
   */
  request(method: string, path: string, context?: LogContext): void {
    this.info(`${method} ${path}`, context);
  },

  /**
   * Decision engine logging
   * Structured output for algorithm debugging
   */
  decision(message: string, inputs: LogContext, result?: LogContext): void {
    this.debug(`[Decision] ${message}`, { inputs, result });
  },
};

export default logger;
