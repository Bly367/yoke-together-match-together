/**
 * Centralized logging utility
 * 
 * Provides environment-aware logging:
 * - Development: Logs to console
 * - Production: Logs errors to error tracking service (when configured)
 * 
 * Usage:
 * ```typescript
 * import { logger } from '@/lib/logger';
 * 
 * logger.debug('Debug message');
 * logger.info('Info message');
 * logger.warn('Warning message');
 * logger.error('Error message', error);
 * ```
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private isProduction = import.meta.env.PROD;

  /**
   * Log debug messages (development only)
   */
  debug(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log info messages (development only)
   */
  info(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Log warning messages
   * In production, sends to error tracking service if configured
   */
  warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] ${message}`, ...args);
    
    // In production, send to error tracking service
    if (this.isProduction) {
      this.sendToErrorTracking('warn', message, args);
    }
  }

  /**
   * Log error messages
   * Always logs errors, sends to tracking service in production
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    console.error(`[ERROR] ${message}`, error, context);
    
    // In production, send to error tracking service
    if (this.isProduction) {
      this.sendToErrorTracking('error', message, { error, context });
    }
  }

  /**
   * Send error to tracking service (Sentry, LogRocket, etc.)
   * Override this method to integrate with your error tracking service
   */
  private sendToErrorTracking(
    level: LogLevel,
    message: string,
    data: any
  ): void {
    // TODO: Integrate with error tracking service
    // Example with Sentry:
    // if (window.Sentry) {
    //   if (level === 'error') {
    //     window.Sentry.captureException(data.error || new Error(message), {
    //       extra: data.context,
    //     });
    //   } else {
    //     window.Sentry.captureMessage(message, {
    //       level,
    //       extra: data,
    //     });
    //   }
    // }
  }

  /**
   * Log performance metrics
   */
  performance(metric: string, value: number, unit: string = 'ms'): void {
    if (this.isDevelopment) {
      console.log(`[PERF] ${metric}: ${value}${unit}`);
    }
    
    // In production, send to analytics
    if (this.isProduction) {
      // TODO: Send to analytics service
      // Example: analytics.track('performance', { metric, value, unit });
    }
  }
}

/**
 * Singleton logger instance
 */
export const logger = new Logger();

/**
 * Create a scoped logger for a specific module/feature
 */
export function createScopedLogger(scope: string) {
  return {
    debug: (message: string, ...args: any[]) => logger.debug(`[${scope}] ${message}`, ...args),
    info: (message: string, ...args: any[]) => logger.info(`[${scope}] ${message}`, ...args),
    warn: (message: string, ...args: any[]) => logger.warn(`[${scope}] ${message}`, ...args),
    error: (message: string, error?: Error | unknown, context?: LogContext) =>
      logger.error(`[${scope}] ${message}`, error, context),
    performance: (metric: string, value: number, unit?: string) =>
      logger.performance(`${scope}.${metric}`, value, unit),
  };
}

