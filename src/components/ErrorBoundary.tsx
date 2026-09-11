import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  /** 出错区域的名称，用于日志与提示文案 */
  scope: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
  componentStack: string;
}

/**
 * 区域级错误边界。
 *
 * 目的：一个面板里的渲染异常（例如某个节点数据缺字段）不应卸载整个应用。
 * 中区与右栏各自包一层，并把视图 id 作为 key，切换视图即自动复位。
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.scope}]`, error, info.componentStack);
    this.setState({ componentStack: info.componentStack ?? '' });
  }

  private reset = () => {
    this.setState({ error: null, componentStack: '' });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="error-boundary" role="alert">
        <div className="error-boundary-title">
          {this.props.scope} 渲染出错，已隔离该区域（应用其余部分可继续使用）
        </div>
        <div className="error-boundary-message">{error.message || String(error)}</div>
        {this.state.componentStack && (
          <details className="error-boundary-details">
            <summary>组件栈</summary>
            <pre>{this.state.componentStack.trim().split('\n').slice(0, 12).join('\n')}</pre>
          </details>
        )}
        <div className="error-boundary-actions">
          <button className="btn btn-sm" onClick={this.reset}>重试渲染</button>
          <button className="btn btn-sm" onClick={() => window.location.reload()}>重新加载页面</button>
        </div>
      </div>
    );
  }
}
