import { Component, type ReactNode } from "react";
import { IconAlertCircle } from "./Icon";

interface Props {
  children: ReactNode;
  /** Optional override - render anything you want when an error is caught. */
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Root-level error boundary so that a single rendering error in a tab does
 * not take down the entire app. Shows a recoverable error UI with a
 * "Try again" button that resets the boundary's state and reloads the tree.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    // Keep this minimal; we explicitly don't ship a 3rd-party telemetry SDK
    // because the app's whole point is end-to-end privacy.
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div role="alert" className="card w-full max-w-md p-6 text-sm shadow-glow-lg">
          <div className="mb-3 flex items-center gap-2 text-rose-600 dark:text-rose-300">
            <IconAlertCircle size={20} />
            <h1 className="text-base font-semibold">Something went wrong</h1>
          </div>
          <p className="mb-4 text-slate-600 dark:text-slate-300">
            The app hit an unexpected error. Your encrypted vault is unaffected - it lives only in
            Firestore and this browser&apos;s storage.
          </p>
          <pre className="mb-4 max-h-48 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-700 dark:border-slate-800/70 dark:bg-slate-900/60 dark:text-slate-300">
            {error.message || String(error)}
          </pre>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={this.reset}>
              Try again
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
