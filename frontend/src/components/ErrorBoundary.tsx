import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

/**
 * Prevents a single render crash from wiping the whole app to a blank page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-2 px-6 text-center">
          <h1 className="font-display text-xl font-bold text-fg">Something went wrong</h1>
          <p className="max-w-md text-sm text-fg-muted">
            {this.state.error.message || 'An unexpected error occurred.'}
          </p>
          <button
            type="button"
            className="rounded-xl bg-primary-700 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => {
              this.setState({ error: null })
              window.location.assign(window.location.pathname)
            }}
          >
            Reload page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
