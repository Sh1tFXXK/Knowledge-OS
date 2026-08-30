import { useEffect, useRef, useState, type CSSProperties } from 'react';
import mermaid from 'mermaid';

// mermaid 全局只初始化一次；深色卡片背景，节点用暗色系
let mermaidInitialized = false;
let renderSeq = 0;

function ensureMermaidInitialized() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'dark',
    fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
    flowchart: { useMaxWidth: true },
    mindmap: { useMaxWidth: true },
  });
  mermaidInitialized = true;
}

/**
 * 把 ```mermaid 代码块渲染成 SVG 图。
 * 渲染失败（语法错误等）时回退为源码展示，不阻塞整张卡片。
 */
export default function MermaidDiagram({ code }: { code: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSvg(null);
    setError(null);
    ensureMermaidInitialized();
    renderSeq += 1;
    const renderId = `mmd-svg-${renderSeq}`;
    mermaid.render(renderId, code)
      .then(({ svg: rendered }) => {
        if (!cancelled) setSvg(rendered);
      })
      .catch((err: unknown) => {
        // mermaid 解析失败时会把错误 SVG 残留在 document.body，需要清掉
        document.getElementById(renderId)?.remove();
        document.getElementById(`d${renderId}`)?.remove();
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => { cancelled = true; };
  }, [code]);

  if (error) {
    return (
      <div style={{ margin: '10px 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            color: '#f59e0b',
            margin: '0 0 4px',
          }}
        >
          <span>⚠️</span>
          <span>mermaid 图渲染失败，已回退为源码</span>
        </div>
        <pre
          style={{
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
          }}
        >
          <code>{code}</code>
        </pre>
        {error && (
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', margin: '2px 0 0', fontFamily: 'monospace' }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  const containerStyle: CSSProperties = {
    margin: '10px 0',
    padding: '8px',
    background: 'rgba(15,15,25,0.35)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '6px',
    overflowX: 'auto',
    textAlign: 'center',
  };

  if (!svg) {
    return (
      <div ref={containerRef} className="mermaid-diagram" style={{ ...containerStyle, minHeight: '48px' }}>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', padding: '8px' }}>
          正在渲染 mermaid 图…
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-diagram"
      style={containerStyle}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
