import React, { Component, ReactNode } from 'react';
import { debugError } from '../utils/debug';

interface SafeComponentProps {
  children: ReactNode;
  fallback?: ReactNode;
  componentName: string;
}

interface SafeComponentState {
  hasError: boolean;
  error: Error | null;
  errorType: string;
}

export class SafeComponent extends Component<SafeComponentProps, SafeComponentState> {
  constructor(props: SafeComponentProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorType: ''
    };
  }

  static getDerivedStateFromError(error: Error): SafeComponentState {
    let errorType = 'Component Error';
    
    // Detect specific error types
    if (error.message.includes('removeChild') || error.message.includes('appendChild')) {
      errorType = 'DOM Manipulation Error';
    } else if (error.message.includes('TypeError')) {
      errorType = 'Type Error';
    } else if (error.message.includes('ReferenceError')) {
      errorType = 'Reference Error';
    }
    
    return { 
      hasError: true, 
      error,
      errorType
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    debugError(this.props.componentName, error, errorInfo);
    
    // Log additional context for debugging
    console.warn(`SafeComponent caught error in ${this.props.componentName}:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      location: window.location.href
    });
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null,
      errorType: ''
    });
  };

  handleSwitchTool = () => {
    // Navigate to a different tool to clear any stuck state
    if (window.location.pathname.includes('/image-tools')) {
      window.location.href = '/pdf-tools';
    } else if (window.location.pathname.includes('/pdf-tools')) {
      window.location.href = '/image-tools';
    } else {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-red-800 font-medium">{this.state.errorType}</h3>
          <p className="text-red-600 text-sm mt-1 mb-3">
            {this.state.error?.message || 'An error occurred while loading this component.'}
          </p>
          <div className="space-x-2">
            <button
              onClick={this.handleRetry}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Try again
            </button>
            <button
              onClick={this.handleSwitchTool}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Switch Tool
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
