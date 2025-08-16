import React, { Component, ReactNode } from 'react';
import { debugError } from '../utils/debug';

interface DOMErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  componentName: string;
}

interface DOMErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  errorType: string;
}

export class DOMErrorBoundary extends Component<DOMErrorBoundaryProps, DOMErrorBoundaryState> {
  private maxRetries = 3;
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: DOMErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      retryCount: 0,
      errorType: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<DOMErrorBoundaryState> {
    // Enhanced DOM manipulation error detection
    const errorMessage = error.message.toLowerCase();
    const isDOMError = errorMessage.includes('removechild') ||
                      errorMessage.includes('appendchild') ||
                      errorMessage.includes('insertbefore') ||
                      errorMessage.includes('not a child') ||
                      errorMessage.includes('node is not a child') ||
                      errorMessage.includes('failed to execute') ||
                      errorMessage.includes('dom exception');

    if (isDOMError) {
      let errorType = 'DOM Manipulation';
      if (errorMessage.includes('removechild')) errorType = 'Element Removal';
      else if (errorMessage.includes('appendchild')) errorType = 'Element Addition';
      else if (errorMessage.includes('insertbefore')) errorType = 'Element Insertion';
      
      return { 
        hasError: true, 
        error, 
        errorType,
        retryCount: 0
      };
    }
    
    // Re-throw other errors
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    debugError(this.props.componentName, error, errorInfo);
    
    // Auto-retry for DOM manipulation errors with exponential backoff
    if (this.state.retryCount < this.maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 5000);
      
      this.retryTimeout = setTimeout(() => {
        this.setState(prev => ({
          hasError: false,
          error: null,
          retryCount: prev.retryCount + 1
        }));
      }, delay);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      retryCount: 0,
      errorType: ''
    });
  };

  handleReload = () => {
    // Try to navigate to a different route first to clear any stuck state
    if (window.location.pathname.includes('/image-tools')) {
      window.location.href = '/pdf-tools';
    } else if (window.location.pathname.includes('/pdf-tools')) {
      window.location.href = '/image-tools';
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-yellow-800 font-medium mb-2">
            {this.state.errorType} Issue
          </h3>
          <p className="text-yellow-700 text-sm mb-4">
            {this.state.retryCount < this.maxRetries 
              ? `Retrying... (${this.state.retryCount + 1}/${this.maxRetries})`
              : 'Failed to load component after multiple attempts.'
            }
          </p>
          <div className="space-y-2">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={this.handleReload}
              className="ml-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Switch Tool
            </button>
            <button
              onClick={() => window.location.reload()}
              className="ml-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
