// Debug utility for tracking routing and component loading issues
export const debugLog = (component: string, message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${component}] ${message}`, data || '');
  }
};

export const debugError = (component: string, error: Error | string, context?: any) => {
  console.error(`[${component}] Error:`, error, context || '');
  
  // In production, you might want to send this to an error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Example: Sentry.captureException(error);
  }
};

export const trackRouteChange = (from: string, to: string) => {
  debugLog('Router', `Route change: ${from} -> ${to}`);
};

export const trackComponentLoad = (componentName: string) => {
  debugLog('Component', `Loading: ${componentName}`);
};

export const trackComponentError = (componentName: string, error: Error) => {
  debugError('Component', error, { component: componentName });
};

