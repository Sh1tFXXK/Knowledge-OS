import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Check,
  Braces,
  FileText,
  FileUp,
  FolderTree,
  Languages,
  LoaderCircle,
  Sparkles,
  X,
} from 'lucide-react';
import {
  DocumentKind,
  DocumentImportSourceKind,
  DocumentProfile,
  getDocumentImportCapabilities,
  importDocumentFile,
  validateDocumentFile,
  type DocumentImportCapabilities,
  type DocumentImportResult,
} from '../knowledge/documentImport';
import { useGraphStore } from '../store/useGraph';
import JavaSourceImportPanel from './JavaSourceImportPanel';
import TreeDestinationPicker, {
  collectTreeDestinations,
  type TreeDestination,
} from './TreeDestinationPicker';

enum DocumentImportPhase {
  Editing = 'editing',
  Importing = 'importing',
  Succeeded = 'succeeded',
  Failed = 'failed',
}

interface DocumentImportDialogProps {
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function documentKindLabel(kind: DocumentKind): string {
  if (kind === DocumentKind.Pdf) return 'PDF';
  if (kind === DocumentKind.Html) return 'HTML';
  if (kind === DocumentKind.Docx) return 'DOCX';
  if (kind === DocumentKind.Markdown) return 'Markdown';
  return '文本';
}

function documentProfileLabel(profile: DocumentProfile): string {
  return profile === DocumentProfile.QuestionBank ? '题库结构' : '章节结构';
}

export default function DocumentImportDialog({ isOpen, onClose }: DocumentImportDialogProps) {
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
  const fileInputRef = useRef(null) as { current: HTMLInputElement | null };
  const wasOpenRef = useRef(false) as { current: boolean };
  const [file, setFile] = useState(null as File | null);
  const [parentTreeNodeId, setParentTreeNodeId] = useState(treeData.id);
  const [translate, setTranslate] = useState(true);
  const [useAi, setUseAi] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [capabilities, setCapabilities] = useState(null as DocumentImportCapabilities | null);
  const [phase, setPhase] = useState(DocumentImportPhase.Editing);
  const [error, setError] = useState(null as string | null);
  const [result, setResult] = useState(null as DocumentImportResult | null);
  const [sourceKind, setSourceKind] = useState(DocumentImportSourceKind.File);
  const [isJavaSourceImporting, setIsJavaSourceImporting] = useState(false);
  const isImporting = phase === DocumentImportPhase.Importing;
  const isBusy = isImporting || isJavaSourceImporting;
  const handleJavaSourceImportingChange = useCallback((importing: boolean) => {
    setIsJavaSourceImporting(importing);
  }, []);

  const chooseFile = (nextFile: File | null) => {
    if (!nextFile) return;
    const validationError = validateDocumentFile(nextFile);
    if (validationError) {
      setFile(null);
      setError(validationError);
      setPhase(DocumentImportPhase.Failed);
      return;
    }
    setFile(nextFile);
    setError(null);
    setPhase(DocumentImportPhase.Editing);
  };

  const choosePastedText = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (/^(?:[a-zA-Z]:[\\/]|\\\\|file:\/\/)/i.test(trimmed)) {
      setFile(null);
      setError('检测到的是文件路径而不是内容。请复制文件内容后粘贴，或直接拖放文件。');
      setPhase(DocumentImportPhase.Failed);
      return;
    }
    chooseFile(new File([text], '粘贴内容.txt', { type: 'text/plain' }));
  };

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
    setFile(null);
    setTranslate(true);
    setUseAi(false);
    setIsDragging(false);
    setPhase(DocumentImportPhase.Editing);
    setError(null);
    setResult(null);
    setSourceKind(DocumentImportSourceKind.File);
    setIsJavaSourceImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [destinations, isOpen, selectedTreeNodeId, treeData.id]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    void getDocumentImportCapabilities()
      .then((nextCapabilities) => {
        if (active) {
          setCapabilities(nextCapabilities);
          setUseAi(nextCapabilities.ai.configured);
        }
      })
      .catch(() => {
        if (active) {
          setCapabilities({
            ai: { configured: false, model: '' },
            maxBytes: 20 * 1024 * 1024,
            extensions: ['.pdf', '.md', '.markdown', '.txt', '.html', '.htm', '.docx'],
            javaSource: {
              available: true,
              defaultSource: '',
              supportedSources: ['.java', 'directory', '.zip', '.jar', 'JDK src.zip'],
            },
          });
        }
      });
    return () => { active = false; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isBusy) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBusy, isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || sourceKind !== DocumentImportSourceKind.File) return;
    const handlePaste = (event: ClipboardEvent) => {
      if (isImporting) return;
      const pastedFile = event.clipboardData?.files.item(0) ?? null;
      if (pastedFile) {
        event.preventDefault();
        chooseFile(pastedFile);
        return;
      }
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, [contenteditable="true"]')) {
        return;
      }
      const pastedText = event.clipboardData?.getData('text/plain')
        || event.clipboardData?.getData('text')
        || '';
      if (pastedText.trim()) {
        event.preventDefault();
        choosePastedText(pastedText);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isImporting, isOpen, sourceKind]);

  if (!isOpen) return null;

  const closeFromOverlay = (event: OverlayMouseEvent) => {
    if (event.target === event.currentTarget && !isBusy) onClose();
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    if (!isBusy && sourceKind === DocumentImportSourceKind.File) {
      chooseFile(event.dataTransfer?.files.item(0) ?? null);
    }
  };

  const handleSubmit = async (event: FormSubmitEvent) => {
    event.preventDefault();
    if (!file) {
      setError('请选择要导入的文档');
      setPhase(DocumentImportPhase.Failed);
      return;
    }

    setPhase(DocumentImportPhase.Importing);
    setError(null);
    setResult(null);
    try {
      const imported = await importDocumentFile({ file, parentTreeNodeId, translate, useAi });
      await initialize();
      selectTreeEntry(imported.treeNodeId);
      setActiveView('index');
      setResult(imported);
      setPhase(DocumentImportPhase.Succeeded);
      addNotification(`已导入「${imported.title}」`, 'success');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '文档导入失败');
      setPhase(DocumentImportPhase.Failed);
    }
  };

  return (
    <div className="link-import-overlay" role="presentation" onMouseDown={closeFromOverlay}>
      <div
        ref={dialogRef}
        className="link-import-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-import-title"
      >
        <header className="link-import-header">
          <div className="link-import-heading">
            <div className="link-import-heading-icon" aria-hidden="true"><FileUp size={18} /></div>
            <div>
              <h2 id="document-import-title">导入内容</h2>
              <p>
                {sourceKind === DocumentImportSourceKind.JavaSource
                  ? '从本机 Java 源码建立类型、成员、注释和继承关系。'
                  : '选择、拖放或粘贴文档，整理为知识节点。'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="link-import-close"
            title="关闭"
            aria-label="关闭文档导入"
            disabled={isBusy}
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </header>

        <div className="document-import-modes" role="tablist" aria-label="导入类型">
          <button
            type="button"
            role="tab"
            aria-selected={sourceKind === DocumentImportSourceKind.File}
            className={sourceKind === DocumentImportSourceKind.File ? 'is-active' : ''}
            disabled={isBusy}
            onClick={() => setSourceKind(DocumentImportSourceKind.File)}
          >
            <FileText size={14} />
            普通文档
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={sourceKind === DocumentImportSourceKind.JavaSource}
            className={sourceKind === DocumentImportSourceKind.JavaSource ? 'is-active' : ''}
            disabled={isBusy || capabilities?.javaSource?.available === false}
            onClick={() => setSourceKind(DocumentImportSourceKind.JavaSource)}
          >
            <Braces size={14} />
            Java 源码
          </button>
        </div>

        {sourceKind === DocumentImportSourceKind.JavaSource ? (
          <JavaSourceImportPanel
            defaultSource={capabilities?.javaSource?.defaultSource ?? ''}
            defaultTargetTreeNodeId={parentTreeNodeId}
            destinations={destinations}
            onClose={onClose}
            onImportingChange={handleJavaSourceImportingChange}
          />
        ) : phase === DocumentImportPhase.Succeeded && result ? (
          <section className="link-import-result" aria-live="polite">
            <div className="link-import-result-mark"><Check size={21} /></div>
            <div className="link-import-result-copy">
              <span>导入完成</span>
              <strong>{result.title}</strong>
              <small>
                {documentKindLabel(result.documentKind)} · {documentProfileLabel(result.profile)} · {result.fileName}
              </small>
            </div>
            <dl className="link-import-result-grid">
              <div><dt>知识节点</dt><dd>{result.nodeCount}</dd></div>
              <div><dt>章节</dt><dd>{result.sectionCount}</dd></div>
              <div><dt>问题</dt><dd>{result.questionCount}</dd></div>
              <div><dt>语言</dt><dd>{result.translated ? `${result.language} → 中文` : result.language}</dd></div>
              <div><dt>页数</dt><dd>{result.pageCount ?? '-'}</dd></div>
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
                setFile(null);
                setResult(null);
                setPhase(DocumentImportPhase.Editing);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}>
                继续导入
              </button>
              <button type="button" className="btn btn-primary" onClick={onClose}>查看内容</button>
            </div>
          </section>
        ) : (
          <form className="link-import-form" noValidate onSubmit={handleSubmit}>
            <div className="link-import-field">
              <span><FileText size={14} aria-hidden="true" />文档</span>
              <input
                ref={fileInputRef}
                id="document-import-file"
                className="document-import-input"
                type="file"
                disabled={isImporting}
                onChange={(event: { target: { files: FileList | null } }) => {
                  chooseFile(event.target.files?.item(0) ?? null);
                }}
              />
              <button
                type="button"
                className={`document-import-dropzone${file ? ' has-file' : ''}${isDragging ? ' is-dragging' : ''}`}
                disabled={isImporting}
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={(event: DragEvent) => {
                  event.preventDefault();
                  if (!isImporting) setIsDragging(true);
                }}
                onDragOver={(event: DragEvent) => event.preventDefault()}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                {file ? <FileText size={24} aria-hidden="true" /> : <FileUp size={24} aria-hidden="true" />}
                <span>
                  <strong>{file?.name ?? '选择、拖放或粘贴文件'}</strong>
                  <small>{file ? formatBytes(file.size) : 'PDF · Markdown · TXT · HTML · DOCX · 也支持粘贴文件内容'}</small>
                </span>
              </button>
            </div>

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
                <small>中文文件会直接保留原文</small>
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
                <strong>AI 整理与归类</strong>
                <small>{capabilities?.ai.configured ? capabilities.ai.model : '未配置模型'}</small>
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
              <button type="submit" className="btn btn-primary link-import-submit" disabled={isImporting || !file}>
                {isImporting ? <LoaderCircle className="link-import-spinner" size={15} /> : <FileUp size={15} />}
                {isImporting ? '正在解析并导入' : '导入文档'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
