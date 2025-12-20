import { Component, type ReactNode } from 'react';

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  message?: string;
  stack?: string;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    return { hasError: true, message, stack };
  }

  componentDidCatch(error: unknown, info: { componentStack: string }) {
    // Log to console for now; could integrate with a logging service.
    console.error('ErrorBoundary caught an error:', error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const isDev = !!import.meta.env.DEV;
      return (
        <div style={{
          padding: '1.5rem',
          margin: '1rem',
          border: '2px solid #dc2626',
          borderRadius: '8px',
          background: '#fee2e2',
          color: '#991b1b'
        }}>
          <h2 style={{ marginTop: 0 }}>Something went wrong.</h2>
          {isDev && (
            <div>
              <p style={{ margin: '0.5rem 0' }}>{this.state.message}</p>
              {this.state.stack && (
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>{this.state.stack}</pre>
              )}
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
