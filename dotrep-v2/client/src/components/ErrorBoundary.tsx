import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw, Home, Bug } from "lucide-react";
import { Component, ReactNode } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Link } from "wouter";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // In production, you might want to send this to an error reporting service
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });

    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <div 
          className="flex items-center justify-center min-h-screen p-4 sm:p-8 bg-background"
          role="alert"
          aria-live="assertive"
        >
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-destructive/10 p-3">
                  <AlertTriangle
                    size={48}
                    className="text-destructive"
                    aria-hidden="true"
                  />
                </div>
              </div>
              <CardTitle className="text-2xl mb-2">
                Something went wrong
              </CardTitle>
              <CardDescription>
                An unexpected error occurred. Please try refreshing the page or return to the home page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isDevelopment && this.state.error && (
                <div className="p-4 rounded-lg bg-muted overflow-auto max-h-64">
                  <div className="flex items-center gap-2 mb-2">
                    <Bug className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-muted-foreground">
                      Error Details (Development Only)
                    </span>
                  </div>
                  <pre className="text-xs text-muted-foreground whitespace-break-spaces font-mono">
                    {this.state.error.toString()}
                    {this.state.error.stack && `\n\n${this.state.error.stack}`}
                  </pre>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  className="flex items-center gap-2"
                  aria-label="Try again"
                >
                  <RotateCcw size={16} aria-hidden="true" />
                  Try Again
                </Button>
                <Button
                  onClick={this.handleReload}
                  className="flex items-center gap-2"
                  aria-label="Reload page"
                >
                  <RotateCcw size={16} aria-hidden="true" />
                  Reload Page
                </Button>
                <Link href="/">
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2"
                    aria-label="Go to home page"
                  >
                    <Home size={16} aria-hidden="true" />
                    Go Home
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
