/**
 * Monitoring and Observability Utilities
 * 
 * Provides error tracking, performance monitoring, and analytics integration.
 * Currently supports basic logging; ready for integration with services like Sentry, LogRocket, etc.
 * 
 * @example
 * ```typescript
 * import { initErrorTracking, trackWebVitals } from '@/lib/monitoring';
 * 
 * // Initialize on app startup
 * initErrorTracking();
 * trackWebVitals();
 * ```
 */

import { logger } from './logger';

/**
 * Initialize error tracking service
 * 
 * In production, this would initialize services like:
 * - Sentry
 * - LogRocket
 * - Bugsnag
 * 
 * Currently logs to console in development, ready for production integration.
 */
export function initErrorTracking() {
  if (import.meta.env.PROD) {
    // Production error tracking initialization
    // Example with Sentry:
    // import * as Sentry from '@sentry/react';
    // Sentry.init({
    //   dsn: import.meta.env.VITE_SENTRY_DSN,
    //   environment: import.meta.env.MODE,
    //   integrations: [
    //     new Sentry.BrowserTracing(),
    //     new Sentry.Replay(),
    //   ],
    //   tracesSampleRate: 1.0,
    //   replaysSessionSampleRate: 0.1,
    //   replaysOnErrorSampleRate: 1.0,
    // });
    
    logger.info('Error tracking initialized for production');
  } else {
    logger.debug('Error tracking initialized for development');
  }
}

/**
 * Track Web Vitals for performance monitoring
 * 
 * Measures Core Web Vitals:
 * - CLS (Cumulative Layout Shift)
 * - FID (First Input Delay)
 * - FCP (First Contentful Paint)
 * - LCP (Largest Contentful Paint)
 * - TTFB (Time to First Byte)
 * 
 * In production, send to analytics service (e.g., Google Analytics, PostHog)
 */
export function trackWebVitals() {
  if (typeof window === 'undefined') return;

  // Check if web-vitals library is available
  // Install with: npm install web-vitals
  if (import.meta.env.PROD) {
    // In production, use web-vitals library
    // import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';
    // 
    // onCLS((metric) => {
    //   // Send to analytics
    //   logger.info('CLS', metric);
    // });
    // 
    // onFID((metric) => {
    //   logger.info('FID', metric);
    // });
    // 
    // onFCP((metric) => {
    //   logger.info('FCP', metric);
    // });
    // 
    // onLCP((metric) => {
    //   logger.info('LCP', metric);
    // });
    // 
    // onTTFB((metric) => {
    //   logger.info('TTFB', metric);
    // });
    
    logger.debug('Web Vitals tracking ready (install web-vitals for full support)');
  } else {
    logger.debug('Web Vitals tracking disabled in development');
  }
}

/**
 * Track custom events for analytics
 * 
 * @param eventName - Name of the event
 * @param properties - Event properties/metadata
 * 
 * @example
 * ```typescript
 * trackEvent('user_signup', { method: 'email' });
 * trackEvent('duo_created', { duoId: '123' });
 * ```
 */
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (import.meta.env.PROD) {
    // In production, send to analytics service
    // Example with PostHog:
    // posthog.capture(eventName, properties);
    
    // Example with Google Analytics:
    // gtag('event', eventName, properties);
    
    logger.debug('Event tracked', { eventName, properties });
  } else {
    logger.debug('Event tracked (dev)', { eventName, properties });
  }
}

/**
 * Track page views
 * 
 * @param pathname - Current page path
 * @param title - Page title
 */
export function trackPageView(pathname: string, title?: string) {
  if (import.meta.env.PROD) {
    // In production, send to analytics
    // Example:
    // posthog.capture('$pageview', { pathname, title });
    // gtag('config', 'GA_MEASUREMENT_ID', { page_path: pathname, page_title: title });
    
    logger.debug('Page view tracked', { pathname, title });
  } else {
    logger.debug('Page view tracked (dev)', { pathname, title });
  }
}

/**
 * Track errors with context
 * 
 * @param error - Error object
 * @param context - Additional context about the error
 */
export function trackError(error: Error, context?: Record<string, any>) {
  if (import.meta.env.PROD) {
    // In production, send to error tracking service
    // Example with Sentry:
    // Sentry.captureException(error, { extra: context });
    
    logger.error('Error tracked', error, context);
  } else {
    logger.error('Error tracked (dev)', error, context);
  }
}

/**
 * Track performance metrics
 * 
 * @param metricName - Name of the metric
 * @param value - Metric value
 * @param unit - Unit of measurement (ms, bytes, etc.)
 */
export function trackPerformance(metricName: string, value: number, unit: string = 'ms') {
  if (import.meta.env.PROD) {
    // In production, send to performance monitoring service
    // Example:
    // Sentry.metrics.distribution(metricName, value, { unit });
    
    logger.debug('Performance metric tracked', { metricName, value, unit });
  } else {
    logger.debug('Performance metric tracked (dev)', { metricName, value, unit });
  }
}

