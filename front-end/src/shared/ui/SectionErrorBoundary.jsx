import React from 'react';

/**
 * Error boundary around the active Student Portal section. If a section throws
 * while rendering, only that section shows an error; the sidebar keeps working
 * so the student can move to another section. Error boundaries must be class
 * components — there is no hook equivalent of componentDidCatch.
 */
export default class SectionErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Student Portal section crashed:', error, info.componentStack);
  }

  componentDidUpdate(prevProps) {
    // Navigating to another section clears the error.
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="sp-card sp-state" role="alert">
          <p className="sp-state-title" style={{ color: 'var(--sp-danger)' }}>This section failed to display</p>
          <p>{this.state.error.message}</p>
          <button type="button" className="sp-btn is-secondary is-small" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
