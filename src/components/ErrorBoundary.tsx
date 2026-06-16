import { Component, type ErrorInfo, type ReactNode } from 'react';
import { clearAssumptions } from '../lib/storage';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * 描画中の例外で画面が真っ白になるのを防ぐ。
 * エラー内容と復旧導線（再読込／保存データを消去して再読込）を表示する。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('描画中にエラーが発生しました', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="error-screen" role="alert">
        <h1>表示中にエラーが発生しました</h1>
        <p>
          お手数ですが再読み込みしてください。保存した入力が原因の場合は、
          データを消去して再読み込みすると回復することがあります。
        </p>
        <pre className="error-detail">{this.state.error.message}</pre>
        <div className="error-actions">
          <button onClick={() => window.location.reload()}>再読み込み</button>
          <button
            className="btn-danger"
            onClick={() => {
              clearAssumptions();
              window.location.reload();
            }}
          >
            保存データを消去して再読み込み
          </button>
        </div>
      </div>
    );
  }
}
