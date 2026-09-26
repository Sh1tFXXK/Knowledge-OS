import { memo, useMemo } from 'react';
import { tokenizeCode } from './codeHighlight';

const PRE_STYLE = {
  background: 'rgba(15,15,25,0.5)',
  border: '0',
  borderRadius: '6px',
  padding: '10px 12px',
  overflowX: 'auto',
  margin: 0,
  fontFamily: '"Fira Code", Consolas, "Courier New", Courier, monospace',
  fontSize: '12px',
  lineHeight: '1.6',
  color: '#e2e8f0',
} as const;

/**
 * 解释卡代码块：把 ```lang 围栏渲染成带 token 配色的 <pre><code>。
 * - tokenizeCode 返回 null（未知语言 / 分词异常）→ 纯文本，与旧行为一致；
 * - 语言角标、暗色容器样式沿用 MarkdownView 原视觉（样式由外层 container 提供）。
 */
function CodeBlockBase({ code, lang }: { code: string; lang?: string }) {
  const tokens = useMemo(() => {
    if (!lang) return null;
    try {
      return tokenizeCode(code, lang);
    } catch {
      return null;
    }
  }, [code, lang]);

  if (!tokens) {
    return (
      <pre style={PRE_STYLE}>
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <pre style={PRE_STYLE}>
      <code>
        {tokens.map((token, idx) =>
          token.cls ? (
            <span key={idx} className={token.cls}>{token.value}</span>
          ) : (
            token.value
          ),
        )}
      </code>
    </pre>
  );
}

export default memo(CodeBlockBase);
