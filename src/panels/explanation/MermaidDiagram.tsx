import { useEffect, useRef, useState, type CSSProperties } from 'react';

// mermaid 连带 cytoscape/katex 等依赖体积巨大，静态引入会拖慢首屏；
// 改为首个图表出现时才按需加载，模块只加载并初始化一次。
type MermaidModule = typeof import('mermaid');
type MermaidAPI = MermaidModule['default'];

let mermaidModulePromise: Promise<MermaidAPI> | null = null;
let renderSeq = 0;

function loadMermaid(): Promise<MermaidAPI> {
  if (!mermaidModulePromise) {
    mermaidModulePromise = import('mermaid').then((mod) => {
      // 深色卡片背景，节点用暗色系
      mod.default.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'dark',
        fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
        flowchart: { useMaxWidth: true },
        mindmap: { useMaxWidth: true },
      });
      return mod.default;
    });
  }
  return mermaidModulePromise;
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
    renderSeq += 1;
    const renderId = `mmd-svg-${renderSeq}`;
    // ponytail: mermaid 11 在浏览器首帧测量偶发失败（SVG append 时序），失败后静默重试一次即可覆盖
    const attempt = (retriesLeft: number): Promise<void> =>
      loadMermaid()
        .then((mermaid) => mermaid.render(`${renderId}-${retriesLeft}`, code))
        .then(({ svg: rendered }) => {
          if (!cancelled) setSvg(rendered);
        })
        .catch((err: unknown) => {
          document.getElementById(`${renderId}-${retriesLeft}`)?.remove();
          document.getElementById(`d${renderId}-${retriesLeft}`)?.remove();
          if (retriesLeft > 0 && !cancelled) return attempt(retriesLeft - 1);
          if (!cancelled) setError(err instanceof Error ? err.message : String(err));
        });
    void attempt(1);
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
