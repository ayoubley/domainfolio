import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorState } from "@/components/shared/ErrorState";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Catches render errors so a broken page shows a friendly, recoverable surface
 * instead of a blank screen. Resets whenever the user navigates.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("Route error:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return <ErrorState description={this.state.error.message} onRetry={this.handleReset} />;
    }
    return this.props.children;
  }
}
