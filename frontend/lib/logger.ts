/**
 * Frontend Logger for LifeOS
 * 
 * Provides structured console logging that can be silenced in production
 * and includes context for debugging user flows.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

const isDev = process.env.NODE_ENV !== 'production';

// Only show debug/info logs in development
const shouldLog = (level: LogLevel): boolean => {
  if (level === 'error' || level === 'warn') return true;
  return isDev;
};

const formatMessage = (level: LogLevel, message: string, context?: LogContext): string => {
  const prefix = `[LifeOS:${level.toUpperCase()}]`;
  return context ? `${prefix} ${message} ${JSON.stringify(context)}` : `${prefix} ${message}`;
};

export const logger = {
  /**
   * Debug-level: development only, verbose details
   */
  debug(message: string, context?: LogContext): void {
    if (!shouldLog('debug')) return;
    console.log(formatMessage('debug', message, context));
  },

  /**
   * Info-level: general information, hidden in production
   */
  info(message: string, context?: LogContext): void {
    if (!shouldLog('info')) return;
    console.log(formatMessage('info', message, context));
  },

  /**
   * Warn-level: recoverable issues, always shown
   */
  warn(message: string, context?: LogContext): void {
    if (!shouldLog('warn')) return;
    console.warn(formatMessage('warn', message, context));
  },

  /**
   * Error-level: failures, always shown
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (!shouldLog('error')) return;
    const errorInfo = error instanceof Error 
      ? { name: error.name, message: error.message } 
      : error ? { value: String(error) } : undefined;
    console.error(formatMessage('error', message, { ...context, error: errorInfo }));
  },

  /**
   * API-specific logging for request/response debugging
   */
  api(method: string, endpoint: string, context?: LogContext): void {
    this.debug(`API ${method} ${endpoint}`, context);
  },

  /**
   * Auth flow logging
   */
  auth(action: string, context?: LogContext): void {
    this.debug(`Auth: ${action}`, context);
  },

  /**
   * Navigation logging
   */
  nav(from: string, to: string, context?: LogContext): void {
    this.debug(`Navigate: ${from} → ${to}`, context);
  },
};

export default logger;
