
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full bg-card border border-destructive/20 rounded-lg shadow-lg p-6 space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-10 w-10" />
              <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
            </div>
            
            <div className="bg-destructive/10 p-4 rounded-md text-sm font-mono overflow-auto max-h-[200px] border border-destructive/20">
              <p className="font-bold mb-2">{this.state.error?.message}</p>
              {this.state.errorInfo && (
                <pre className="text-xs opacity-80 whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>

            <div className="flex gap-4 pt-2">
              <Button 
                onClick={() => window.location.reload()} 
                variant="default"
                className="flex-1"
              >
                Recharger la page
              </Button>
              <Button 
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })} 
                variant="outline"
                className="flex-1"
              >
                Réessayer
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
