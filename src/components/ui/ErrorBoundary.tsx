import { Component, type ReactNode } from 'react';
import { EmptyState } from './EmptyState';

interface Props {
  children: ReactNode;
  /** A new value (for example edited data) clears the error and tries again. */
  resetKey: unknown;
}

interface State {
  failed: boolean;
  resetKey: unknown;
}

/** Shows an explanation instead of a blank page when rendering or loading a part fails. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, resetKey: this.props.resetKey };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  static getDerivedStateFromProps({ resetKey }: Props, state: State): State | null {
    return Object.is(resetKey, state.resetKey) ? null : { failed: false, resetKey };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="p-4">
        <EmptyState
          tone="error"
          title="Bu bölüm görüntülenemedi"
          action={
            <button type="button" className="btn-secondary" onClick={() => location.reload()}>
              Sayfayı yenile
            </button>
          }
        >
          Beklenmeyen bir hata oluştu veya sayfanın bir parçası yüklenemedi. Veriyi ya da ayarları
          değiştirmek yeniden dener. Sayfayı yenilerseniz girdiğiniz veriler silinir.
        </EmptyState>
      </div>
    );
  }
}
