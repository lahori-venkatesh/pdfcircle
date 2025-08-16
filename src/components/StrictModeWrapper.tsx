import React, { StrictMode, ReactNode, useEffect } from 'react';

interface StrictModeWrapperProps {
  children: ReactNode;
}

export function StrictModeWrapper({ children }: StrictModeWrapperProps) {
  useEffect(() => {
    // Global error handler for DOM manipulation errors
    const handleDOMError = (event: ErrorEvent) => {
      if (event.error && event.error.message && 
          (event.error.message.includes('removeChild') || 
           event.error.message.includes('appendChild') ||
           event.error.message.includes('insertBefore'))) {
        console.warn('DOM manipulation error caught:', event.error.message);
        event.preventDefault();
        return false;
      }
    };

    // Global unhandled rejection handler
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && event.reason.message && 
          event.reason.message.includes('removeChild')) {
        console.warn('Unhandled DOM manipulation rejection:', event.reason.message);
        event.preventDefault();
      }
    };

    window.addEventListener('error', handleDOMError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleDOMError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <StrictMode>
      {children}
    </StrictMode>
  );
}
