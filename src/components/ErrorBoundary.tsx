import { Component, type ErrorInfo, type ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface Props {
  /** Called after the boundary clears itself, so the app can return to a
   * known-good screen (App.tsx passes goToMenu). */
  onReset: () => void;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * The one class component in this codebase: React only exposes error
 * boundaries through the class lifecycle (getDerivedStateFromError), there
 * is no hook equivalent.
 *
 * Every generator in src/lib/ throws loudly on a data bug (a word bank
 * running short, an unfillable round) rather than rendering something
 * broken -- the right call in development, but without a boundary that
 * throw inside a screen's useState initializer unmounts the entire tree and
 * leaves a child staring at a blank white page. This catches it, shows the
 * actual error text (it's actionable by design -- see the error messages'
 * "Add more words to..." suffixes) and offers a way back to the menu.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Keep the stack in the console -- the on-screen copy is for the
    // player, this is for whoever's debugging.
    console.error('Screen crashed:', error, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ error: null });
    this.props.onReset();
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <main className={styles.screen} role="alert">
        <h1 className={styles.title}>Oops! Something went wrong.</h1>
        <p className={styles.message}>{error.message}</p>
        <button type="button" className={styles.button} onClick={this.handleReset}>
          Back to Menu
        </button>
      </main>
    );
  }
}
