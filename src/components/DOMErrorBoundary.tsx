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
}

export class DOMErrorBoundary extends Component<DOMErrorBoundaryProps, DOMErrorBoundaryState> {
  private maxRetries = 3;
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: DOMErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      retryCount: 0 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<DOMErrorBoundaryState> {
    // Only catch DOM manipulation errors
    if (error.message && (
      error.message.includes('removeChild') ||
      error.message.includes('appendChild') ||
      error.message.includes('insertBefore') ||
      error.message.includes('not a child')
    )) {
      return { hasError: true, error };
    }
    
    // Re-throw other errors
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    debugError(this.props.componentName, error, errorInfo);
    
    // Auto-retry for DOM manipulation errors
    if (this.state.retryCount < this.maxRetries) {
      this.retryTimeout = setTimeout(() => {
        this.setState(prev => ({
          hasError: false,
          error: null,
          retryCount: prev.retryCount + 1
        }));
      }, 1000 * (this.state.retryCount + 1)); // Exponential backoff
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
      retryCount: 0
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-yellow-800 font-medium mb-2">
            Component Loading Issue
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
