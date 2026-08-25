import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ExternalLink,
  FileText,
  FolderTree,
  Languages,
  Link2,
  LoaderCircle,
  Sparkles,
  X,
} from 'lucide-react';
import { useGraphStore } from '../store/useGraph';
import {
  getLinkImportCapabilities,
  importLink,
  type LinkImportCapabilities,
  type LinkImportResult,
} from '../knowledge/linkImport';
import TreeDestinationPicker, {
  collectTreeDestinations,
  type TreeDestination,
} from './TreeDestinationPicker';

enum LinkImportPhase {
  Editing = 'editing',
  Importing = 'importing',
  Succeeded = 'succeeded',
  Failed = 'failed',
}

interface LinkImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormSubmitEvent {
  preventDefault: () => void;
}

interface OverlayMouseEvent {
  target: EventTarget;
  currentTarget: EventTarget;
}

function validateUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol) ? null : '只支持 http 或 https 网页链接';
  } catch {
    return '请输入完整的网页链接';
  }
}

export default function LinkImportDialog({ isOpen, onClose }: LinkImportDialogProps) {
  const treeData = useGraphStore((state) => state.treeData);
  const selectedTreeNodeId = useGraphStore((state) => state.selectedTreeNodeId);
  const initialize = useGraphStore((state) => state.initialize);
  const selectTreeEntry = useGraphStore((state) => state.selectTreeEntry);
  const setActiveView = useGraphStore((state) => state.setActiveView);
  const addNotification = useGraphStore((state) => state.addNotification);
  const destinations: TreeDestination[] = useMemo(
    () => collectTreeDestinations(treeData),
    [treeData],
  );
  const dialogRef = useRef(null) as { current: HTMLDivElement | null };
  const wasOpenRef = useRef(false) as { current: boolean };
  const [url, setUrl] = useState('');
  const [parentTreeNodeId, setParentTreeNodeId] = useState(treeData.id);
  const [translate, setTranslate] = useState(true);
  const [useAi, setUseAi] = useState(false);
  const [capabilities, setCapabilities] = useState(null as LinkImportCapabilities | null);
  const [phase, setPhase] = useState(LinkImportPhase.Editing);
  const [error, setError] = useState(null as string | null);
  const [result, setResult] = useState(null as LinkImportResult | null);

  const isImporting = phase === LinkImportPhase.Importing;

  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;
    const preferredId = selectedTreeNodeId && destinations.some((item) => item.id === selectedTreeNodeId)
      ? selectedTreeNodeId
      : treeData.id;
    setParentTreeNodeId(preferredId);
    setPhase(LinkImportPhase.Editing);
    setError(null);
    setResult(null);
    window.setTimeout(() => {
      const input = dialogRef.current?.querySelector('#link-import-url') as HTMLInputElement | null;
      input?.focus();
    }, 0);
  }, [destinations, isOpen, selectedTreeNodeId, treeData.id]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    void getLinkImportCapabilities()
      .then((nextCapabilities) => {
        if (!active) return;
        setCapabilities(nextCapabilities);
        setUseAi(nextCapabilities.ai.configured);
      })
      .catch(() => {
        if (!active) return;
        setCapabilities({ ai: { configured: false, model: '' } });
        setUseAi(false);
      });
    return () => { active = false; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isImporting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImporting, isOpen, onClose]);

  if (!isOpen) return null;

  const closeFromOverlay = (event: OverlayMouseEvent) => {
    if (event.target === event.currentTarget && !isImporting) onClose();
  };

  const handleSubmit = async (event: FormSubmitEvent) => {
    event.preventDefault();
    const validationError = validateUrl(url);
    if (validationError) {
      setError(validationError);
      setPhase(LinkImportPhase.Failed);
      return;
    }

    setPhase(LinkImportPhase.Importing);
    setError(null);
    setResult(null);
    try {
      const imported = await importLink({ url: url.trim(), parentTreeNodeId, translate, useAi });
      await initialize();
      selectTreeEntry(imported.treeNodeId);
      setActiveView('index');
      setResult(imported);
      setPhase(LinkImportPhase.Succeeded);
      addNotification(`已导入「${imported.title}」`, 'success');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '链接导入失败');
      setPhase(LinkImportPhase.Failed);
    }
  };

  return (
    <div className="link-import-overlay" role="presentation" onMouseDown={closeFromOverlay}>
      <div
        ref={dialogRef}
        className="link-import-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="link-import-title"
      >
        <header className="link-import-header">
          <div className="link-import-heading">
            <div className="link-import-heading-icon" aria-hidden="true"><Link2 size={18} /></div>
            <div>
              <h2 id="link-import-title">从链接导入</h2>
              <p>网页正文将按当前项目结构生成知识节点和 Markdown 文档。</p>
            </div>
          </div>
          <button
            type="button"
            className="link-import-close"
            title="关闭"
            aria-label="关闭链接导入"
            disabled={isImporting}
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </header>

        {phase === LinkImportPhase.Succeeded && result ? (
          <section className="link-import-result" aria-live="polite">
            <div className="link-import-result-mark"><Check size={21} /></div>
            <div className="link-import-result-copy">
              <span>导入完成</span>
              <strong>{result.title}</strong>
              <a href={result.sourceUrl} target="_blank" rel="noreferrer">
                {result.sourceHost}<ExternalLink size={12} />
              </a>
            </div>
            <dl className="link-import-result-grid">
              <div><dt>知识节点</dt><dd>{result.nodeCount}</dd></div>
              <div><dt>语义根</dt><dd>{result.rootCount}</dd></div>
              <div><dt>关系</dt><dd>{result.relationCount}</dd></div>
              <div><dt>问题</dt><dd>{result.questionCount}</dd></div>
              <div><dt>语言</dt><dd>{result.translated ? `${result.language} → 中文` : result.language}</dd></div>
            </dl>
            {result.categories.length > 0 && (
              <div className="link-import-categories">
                <span>分类</span>
                <strong>{result.categories.join(' / ')}</strong>
              </div>
            )}
            <div className="link-import-file">
              <FileText size={15} aria-hidden="true" />
              <span>{result.markdownPath}</span>
            </div>
            <div className="link-import-actions">
              <button type="button" className="btn btn-ghost" onClick={() => {
                setUrl('');
                setResult(null);
                setPhase(LinkImportPhase.Editing);
              }}>
                继续导入
              </button>
              <button type="button" className="btn btn-primary" onClick={onClose}>查看内容</button>
            </div>
          </section>
        ) : (
          <form className="link-import-form" noValidate onSubmit={handleSubmit}>
            <label className="link-import-field" htmlFor="link-import-url">
              <span><Link2 size={14} aria-hidden="true" />网页链接</span>
              <input
                id="link-import-url"
                className="input"
                type="url"
                inputMode="url"
                autoComplete="url"
                placeholder="https://example.com/article"
                value={url}
                disabled={isImporting}
                onChange={(event: { target: { value: string } }) => setUrl(event.target.value)}
              />
            </label>

            <div className="link-import-field">
              <span><FolderTree size={14} aria-hidden="true" />导入到</span>
              <TreeDestinationPicker
                destinations={destinations}
                value={parentTreeNodeId}
                disabled={isImporting}
                onChange={setParentTreeNodeId}
              />
            </div>

            <label className="link-import-translation">
              <span className="link-import-translation-icon" aria-hidden="true"><Languages size={16} /></span>
              <span className="link-import-translation-copy">
                <strong>翻译为中文</strong>
                <small>中文网页会直接保留原文</small>
              </span>
              <input
                type="checkbox"
                checked={translate}
                disabled={isImporting}
                onChange={(event: { target: { checked: boolean } }) => setTranslate(event.target.checked)}
              />
              <span className="link-import-switch" aria-hidden="true" />
            </label>

            <label className="link-import-translation">
              <span className="link-import-translation-icon" aria-hidden="true"><Sparkles size={16} /></span>
              <span className="link-import-translation-copy">
                <strong>语义编译</strong>
                <small>{capabilities?.ai.configured ? `${capabilities.ai.model} · 从内容关系生成知识图` : '未配置模型'}</small>
              </span>
              <input
                type="checkbox"
                checked={useAi}
                disabled={isImporting || !capabilities?.ai.configured}
                onChange={(event: { target: { checked: boolean } }) => setUseAi(event.target.checked)}
              />
              <span className="link-import-switch" aria-hidden="true" />
            </label>

            {error && <div className="link-import-error" role="alert">{error}</div>}

            <div className="link-import-actions">
              <button type="button" className="btn btn-ghost" disabled={isImporting} onClick={onClose}>取消</button>
              <button type="submit" className="btn btn-primary link-import-submit" disabled={isImporting || !url.trim()}>
                {isImporting ? <LoaderCircle className="link-import-spinner" size={15} /> : <Link2 size={15} />}
                {isImporting ? '正在提取并导入' : '导入链接'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
