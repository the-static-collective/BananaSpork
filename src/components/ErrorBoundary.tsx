import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React application error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-amber-50 text-amber-950 flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full bg-white border border-amber-200 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="text-4xl">🍌</div>
            <h1 className="text-xl font-black text-amber-900 tracking-tight">
              BananaGram Diagnostic Recovery
            </h1>
            <p className="text-sm text-amber-800/90 leading-relaxed">
              The application encountered an unexpected runtime exception on startup or render.
            </p>
            {this.state.error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-left font-mono text-xs text-red-900 overflow-x-auto max-h-40">
                <p className="font-bold">{this.state.error.name}: {this.state.error.message}</p>
                {this.state.error.stack && (
                  <pre className="text-[10px] opacity-80 mt-1 whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition-all text-sm"
              >
                Reload BananaGram 🍌
              </button>
              <button
                onClick={() => {
                  try {
                    localStorage.clear();
                    window.location.reload();
                  } catch (e) {
                    window.location.reload();
                  }
                }}
                className="w-full bg-amber-100 hover:bg-amber-200 text-amber-900 font-medium py-2 px-4 rounded-xl transition-all text-xs"
              >
                Reset Local Storage & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
