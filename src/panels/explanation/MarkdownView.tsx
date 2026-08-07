import type { ReactNode } from 'react';

function renderInlineFormatting(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let currentIndex = 0;
  const inlineRegex = /(\*\*|`)(.*?)\1/g;
  let match;

  while ((match = inlineRegex.exec(text)) !== null) {
    const textBefore = text.substring(currentIndex, match.index);
    if (textBefore) parts.push(textBefore);

    const type = match[1];
    const innerText = match[2];

    if (type === '**') {
      parts.push(
        <strong key={match.index} style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
          {innerText}
        </strong>,
      );
    } else {
      parts.push(
        <code
          key={match.index}
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '0',
            borderRadius: '3px',
            padding: '1px 4px',
            fontSize: '11px',
            fontFamily: 'monospace',
            color: '#e2e8f0',
            margin: '0 2px',
          }}
        >
          {innerText}
        </code>,
      );
    }
    currentIndex = inlineRegex.lastIndex;
  }

  const textAfter = text.substring(currentIndex);
  if (textAfter) parts.push(textAfter);

  return parts.length > 0 ? <>{parts}</> : text;
}

export default function MarkdownView({ content }: { content: string }) {
  if (!content) {
    return (
      <p className="text-muted" style={{ fontStyle: 'italic', opacity: 0.7 }}>
        无内容
      </p>
    );
  }

  const parts: Array<{ type: 'text' | 'code'; content: string; lang?: string }> = [];
  let currentIndex = 0;
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)\n```/g;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const textBefore = content.substring(currentIndex, match.index);
    if (textBefore) parts.push({ type: 'text', content: textBefore });
    parts.push({ type: 'code', lang: match[1], content: match[2] });
    currentIndex = codeBlockRegex.lastIndex;
  }

  const textAfter = content.substring(currentIndex);
  if (textAfter) parts.push({ type: 'text', content: textAfter });

  return (
    <div className="markdown-view" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text-secondary)' }}>
      {parts.map((part, partIdx) => {
        if (part.type === 'code') {
          return (
            <div key={partIdx} className="code-block-container" style={{ margin: '10px 0', position: 'relative' }}>
              {part.lang && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 12,
                    fontSize: '9px',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.4)',
                    padding: '2px 6px',
                    background: 'rgba(0,0,0,0.3)',
                    borderBottomLeftRadius: '4px',
                    fontFamily: 'monospace',
                    letterSpacing: '0.05em',
                  }}
                >
                  {part.lang}
                </div>
              )}
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
                <code style={{ fontFamily: 'inherit', color: 'inherit' }}>{part.content}</code>
              </pre>
            </div>
          );
        }

        const blocks = part.content.split(/\n\s*\n/);
        return blocks.map((block, blockIdx) => {
          const trimmedBlock = block.trim();
          if (!trimmedBlock) return null;

          if (trimmedBlock.startsWith('* ') || trimmedBlock.startsWith('- ') || trimmedBlock.match(/^\d+\.\s/)) {
            const lines = trimmedBlock.split('\n');
            return (
              <ul key={blockIdx} style={{ paddingLeft: '18px', margin: '8px 0', listStyleType: 'disc' }}>
                {lines.map((line, lineIdx) => {
                  const contentOnly = line.replace(/^([\*\-\s]|\d+\.\s)+/, '');
                  return (
                    <li key={lineIdx} style={{ margin: '3px 0', fontSize: '13px', lineHeight: '1.6' }}>
                      {renderInlineFormatting(contentOnly)}
                    </li>
                  );
                })}
              </ul>
            );
          }

          if (trimmedBlock.startsWith('【') && trimmedBlock.includes('】')) {
            const headingMatch = trimmedBlock.match(/^【(.*?)】([\s\S]*)$/);
            if (headingMatch) {
              const headingTitle = headingMatch[1];
              const remainingBody = headingMatch[2].trim();
              const isWarning =
                headingTitle.includes('警告') ||
                headingTitle.includes('危险') ||
                headingTitle.includes('⚠️') ||
                headingTitle.includes('陷阱');

              return (
                <div
                  key={blockIdx}
                  style={{
                    margin: '12px 0',
                    padding: '6px 10px',
                    background: isWarning ? 'rgba(239, 68, 68, 0.04)' : 'rgba(139, 92, 246, 0.03)',
                    borderLeft: isWarning ? '2px solid #ef4444' : '2px solid var(--accent-purple)',
                    borderRadius: '0 4px 4px 0',
                  }}
                >
                  <h4
                    style={{
                      margin: '0 0 4px 0',
                      fontSize: '13.5px',
                      fontWeight: '600',
                      color: isWarning ? '#ef4444' : 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>{isWarning ? '⚠️' : '⚡'}</span>
                    <span>{headingTitle}</span>
                  </h4>
                  {remainingBody && (
                    <div style={{ margin: 0, fontSize: '13px', lineHeight: '1.65', color: 'var(--text-secondary)' }}>
                      {renderInlineFormatting(remainingBody)}
                    </div>
                  )}
                </div>
              );
            }
          }

          return (
            <p
              key={blockIdx}
              style={{
                margin: '8px 0',
                fontSize: '13px',
                lineHeight: '1.65',
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-line',
              }}
            >
              {renderInlineFormatting(trimmedBlock)}
            </p>
          );
        });
      })}
    </div>
  );
}
