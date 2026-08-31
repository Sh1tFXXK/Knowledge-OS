import { memo, useState, type ReactNode } from 'react';
import type { KnowledgeReference } from '../../knowledge/nodeReferences';
import KnowledgeReferenceText from './KnowledgeReferenceText';
import MermaidDiagram from './MermaidDiagram';

// 稳定的空引用：让 memo 对未传 references 的调用方也能生效
const EMPTY_REFERENCES: readonly KnowledgeReference[] = [];

function renderReferenceText(
  text: string,
  references: readonly KnowledgeReference[],
  onOpenReference?: (nodeId: string) => void,
  key?: string,
): ReactNode {
  return (
    <KnowledgeReferenceText
      key={key}
      text={text}
      references={references}
      onOpenReference={onOpenReference}
    />
  );
}

// 行内 token：**粗体**、`行内代码`、[链接](url)、$^{上标脚注}$
const INLINE_TOKEN_REGEX = /(\*\*[^*]+\*\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\n]+\)|\$\^\{[^}\n]*\}\$)/g;

function renderInlineFormatting(
  text: string,
  references: readonly KnowledgeReference[],
  onOpenReference?: (nodeId: string) => void,
): ReactNode {
  const parts: ReactNode[] = [];
  let currentIndex = 0;
  INLINE_TOKEN_REGEX.lastIndex = 0;
  let match;

  while ((match = INLINE_TOKEN_REGEX.exec(text)) !== null) {
    const textBefore = text.substring(currentIndex, match.index);
    if (textBefore) {
      parts.push(renderReferenceText(
        textBefore,
        references,
        onOpenReference,
        `text-${currentIndex}`,
      ));
    }

    const token = match[0];

    if (token.startsWith('**')) {
      const innerText = token.slice(2, -2);
      parts.push(
        <strong key={match.index} style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
          {renderReferenceText(innerText, references, onOpenReference)}
        </strong>,
      );
    } else if (token.startsWith('`')) {
      const innerText = token.slice(1, -1);
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
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      const linkText = linkMatch?.[1] ?? token;
      const linkUrl = linkMatch?.[2] ?? '';
      if (/^https?:\/\//.test(linkUrl)) {
        parts.push(
          <a
            key={match.index}
            href={linkUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              color: 'var(--accent-blue, #6ea8fe)',
              textDecoration: 'underline',
              textDecorationColor: 'rgba(110,168,254,0.35)',
              textUnderlineOffset: '2px',
            }}
          >
            {linkText}
          </a>,
        );
      } else {
        parts.push(renderReferenceText(token, references, onOpenReference, `link-${match.index}`));
      }
    } else if (token.startsWith('$^{')) {
      const innerText = token.slice(3, -2);
      parts.push(
        <sup key={match.index} style={{ color: 'var(--accent-purple)', fontSize: '10px' }}>
          {innerText}
        </sup>,
      );
    } else {
      parts.push(renderReferenceText(token, references, onOpenReference, `token-${match.index}`));
    }

    currentIndex = INLINE_TOKEN_REGEX.lastIndex;
  }

  const textAfter = text.substring(currentIndex);
  if (textAfter) {
    parts.push(renderReferenceText(
      textAfter,
      references,
      onOpenReference,
      `text-${currentIndex}`,
    ));
  }

  return parts.length > 0
    ? <>{parts}</>
    : renderReferenceText(text, references, onOpenReference);
}

function SmartImage({ src, alt }: { src: string; alt?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        style={{
          margin: '8px 0',
          padding: '4px 10px',
          fontSize: '12px',
          color: 'var(--text-muted, rgba(255,255,255,0.4))',
          borderLeft: '2px solid rgba(255,255,255,0.15)',
          wordBreak: 'break-all',
        }}
      >
        [图片不可用] {alt || src}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt || ''}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{
        display: 'block',
        maxWidth: '100%',
        maxHeight: '360px',
        objectFit: 'contain',
        margin: '10px 0',
        borderRadius: '6px',
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.02)',
      }}
    />
  );
}

function parseHtmlTable(html: string): string[][] {
  const rows: string[][] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const cells: string[] = [];
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      cells.push(cellMatch[1].replace(/<[^>]+>/g, '').trim());
    }
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

// 解析 markdown 管道表格：跳过分隔行（|----|）和全空行（|  |  |  |），首个有效行作表头
function parsePipeTable(lines: string[]): string[][] {
  const rows: string[][] = [];
  for (const line of lines) {
    const cells = line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim());
    if (cells.every((cell) => cell === '' || /^:?-{2,}:?$/.test(cell))) continue;
    rows.push(cells);
  }
  return rows;
}

type ContentUnit =
  | { type: 'image'; src: string; alt: string }
  | { type: 'table'; rows: string[][] }
  | { type: 'heading'; level: number; text: string }
  | { type: 'text'; text: string };

// 把一段文本拆成渲染单元：图片行、标题行、HTML 表格块各自独立，其余归并为文本段落
function splitContentUnits(content: string): ContentUnit[] {
  const units: ContentUnit[] = [];
  const blocks = content.split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.split('\n');
    let buffer: string[] = [];
    const flush = () => {
      const text = buffer.join('\n').trim();
      buffer = [];
      if (text) units.push({ type: 'text', text });
    };

    let i = 0;
    while (i < lines.length) {
      const trimmed = lines[i].trim();
      const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);

      if (imageMatch) {
        flush();
        units.push({ type: 'image', alt: imageMatch[1], src: imageMatch[2] });
      } else if (headingMatch) {
        flush();
        units.push({ type: 'heading', level: headingMatch[1].length, text: headingMatch[2].trim() });
      } else if (trimmed.startsWith('<table')) {
        flush();
        let html = trimmed;
        while (!html.includes('</table>') && i + 1 < lines.length) {
          i += 1;
          html += lines[i].trim();
        }
        const rows = parseHtmlTable(html);
        if (rows.length > 0) {
          units.push({ type: 'table', rows });
        } else {
          const fallback = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          if (fallback) units.push({ type: 'text', text: fallback });
        }
      } else if (trimmed.startsWith('|')) {
        flush();
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          tableLines.push(lines[i].trim());
          i += 1;
        }
        i -= 1;
        const rows = parsePipeTable(tableLines);
        if (rows.length > 0) {
          units.push({ type: 'table', rows });
        } else {
          units.push({ type: 'text', text: tableLines.join('\n') });
        }
      } else {
        buffer.push(lines[i]);
      }
      i += 1;
    }
    flush();
  }

  return units;
}

const tableHeaderCellStyle = {
  textAlign: 'left' as const,
  padding: '4px 8px',
  borderBottom: '1px solid rgba(255,255,255,0.18)',
  color: 'var(--text-primary)',
  fontWeight: 600,
  whiteSpace: 'nowrap' as const,
};

const tableBodyCellStyle = {
  padding: '4px 8px',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  color: 'var(--text-secondary)',
  verticalAlign: 'top' as const,
};

// 纯展示组件：内容不变时不随父组件重渲染（Markdown 解析是每次渲染的主要开销）
function MarkdownViewBase({
  content,
  references = EMPTY_REFERENCES,
  onOpenReference,
}: {
  content: string;
  references?: readonly KnowledgeReference[];
  onOpenReference?: (nodeId: string) => void;
}) {
  if (!content) {
    return (
      <p className="text-muted" style={{ fontStyle: 'italic', opacity: 0.7 }}>
        无内容
      </p>
    );
  }

  const parts: Array<{ type: 'text' | 'code'; content: string; lang?: string }> = [];
  let currentIndex = 0;
  // 容忍围栏后缀后的空白与 CRLF 换行
  const codeBlockRegex = /```(\w*)[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*```/g;
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
          if (part.lang?.toLowerCase() === 'mermaid') {
            return <MermaidDiagram key={partIdx} code={part.content} />;
          }
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

        const units = splitContentUnits(part.content);
        return units.map((unit, unitIdx) => {
          const key = `${partIdx}-${unitIdx}`;

          if (unit.type === 'image') {
            return <SmartImage key={key} src={unit.src} alt={unit.alt} />;
          }

          if (unit.type === 'heading') {
            const fontSize =
              unit.level <= 1 ? '16px'
                : unit.level === 2 ? '15px'
                  : unit.level === 3 ? '14px'
                    : '13px';
            return (
              <div
                key={key}
                style={{
                  margin: unit.level <= 2 ? '16px 0 6px' : '12px 0 4px',
                  fontSize,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  lineHeight: 1.4,
                }}
              >
                {renderInlineFormatting(unit.text, references, onOpenReference)}
              </div>
            );
          }

          if (unit.type === 'table') {
            const [headRow, ...bodyRows] = unit.rows;
            return (
              <div key={key} style={{ overflowX: 'auto', margin: '10px 0' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '12px', lineHeight: 1.5 }}>
                  {headRow && (
                    <thead>
                      <tr>
                        {headRow.map((cell, cellIdx) => (
                          <th key={cellIdx} style={tableHeaderCellStyle}>
                            {renderInlineFormatting(cell, references, onOpenReference)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {bodyRows.map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        {row.map((cell, cellIdx) => (
                          <td key={cellIdx} style={tableBodyCellStyle}>
                            {renderInlineFormatting(cell, references, onOpenReference)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          const trimmedBlock = unit.text;

          if (trimmedBlock.startsWith('* ') || trimmedBlock.startsWith('- ') || trimmedBlock.match(/^\d+\.\s/)) {
            const lines = trimmedBlock.split('\n');
            return (
              <ul key={key} style={{ paddingLeft: '18px', margin: '8px 0', listStyleType: 'disc' }}>
                {lines.map((line, lineIdx) => {
                  const contentOnly = line.replace(/^([\*\-\s]|\d+\.\s)+/, '');
                  return (
                    <li key={lineIdx} style={{ margin: '3px 0', fontSize: '13px', lineHeight: '1.6' }}>
                      {renderInlineFormatting(contentOnly, references, onOpenReference)}
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
                  key={key}
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
                      {renderInlineFormatting(remainingBody, references, onOpenReference)}
                    </div>
                  )}
                </div>
              );
            }
          }

          return (
            <p
              key={key}
              style={{
                margin: '8px 0',
                fontSize: '13px',
                lineHeight: '1.65',
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-line',
              }}
            >
              {renderInlineFormatting(trimmedBlock, references, onOpenReference)}
            </p>
          );
        });
      })}
    </div>
  );
}

export default memo(MarkdownViewBase);
