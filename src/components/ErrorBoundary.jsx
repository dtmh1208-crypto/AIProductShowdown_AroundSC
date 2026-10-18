import React from 'react';
import { AlertTriangle, RefreshCw, ListFilter } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="w-full p-8 rounded-2xl border border-usc-gold/50 bg-zinc-900/90 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 mx-auto rounded-full bg-usc-gold/10 border border-usc-gold/30 flex items-center justify-center text-usc-gold">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-zinc-100">
              Display Mode Fallback
            </h3>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">
              {this.props.customMessage ||
                'A component encountered a rendering issue. You can reload or switch views.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold uppercase tracking-wider flex items-center gap-2 border border-zinc-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
            {this.props.onSwitchToList && (
              <button
                onClick={this.props.onSwitchToList}
                className="px-4 py-2 rounded-lg bg-usc-cardinal hover:bg-usc-cardinal-light text-zinc-100 text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-colors shadow-sm"
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Switch to List View</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
