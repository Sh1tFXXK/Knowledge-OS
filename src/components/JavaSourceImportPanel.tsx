import { useEffect, useState } from 'react';
import {
  Braces,
  Check,
  FolderTree,
  Languages,
  LoaderCircle,
  RotateCcw,
} from 'lucide-react';
import {
  importJavaSource,
  type JavaSourceImportResult,
} from '../knowledge/documentImport';
import { useGraphStore } from '../store/useGraph';
import TreeDestinationPicker, { type TreeDestination } from './TreeDestinationPicker';

enum JavaSourceImportPhase {
  Editing = 'editing',
  Importing = 'importing',
  Succeeded = 'succeeded',
  Failed = 'failed',
}

interface Props {
  defaultSource: string;
  defaultTargetTreeNodeId: string;
  destinations: TreeDestination[];
  onClose: () => void;
  onImportingChange: (importing: boolean) => void;
}

export default function JavaSourceImportPanel({
  defaultSource,
  defaultTargetTreeNodeId,
  destinations,
  onClose,
  onImportingChange,
}: Props) {
  const initialize = useGraphStore((state) => state.initialize);
  const selectTreeEntry = useGraphStore((state) => state.selectTreeEntry);
  const setActiveView = useGraphStore((state) => state.setActiveView);
  const addNotification = useGraphStore((state) => state.addNotification);
  const [source, setSource] = useState(defaultSource);
  const [parentTreeNodeId, setParentTreeNodeId] = useState(defaultTargetTreeNodeId);
  const [translate, setTranslate] = useState(true);
  const [phase, setPhase] = useState(JavaSourceImportPhase.Editing);
  const [error, setError] = useState(null as string | null);
  const [result, setResult] = useState(null as JavaSourceImportResult | null);
  const isImporting = phase === JavaSourceImportPhase.Importing;

  useEffect(() => {
    if (defaultSource && !source) setSource(defaultSource);
  }, [defaultSource]);

  useEffect(() => {
    if (defaultTargetTreeNodeId) {
      if (!parentTreeNodeId) setParentTreeNodeId(defaultTargetTreeNodeId);
    }
  }, [defaultTargetTreeNodeId]);

  useEffect(() => {
    onImportingChange(isImporting);
    return () => onImportingChange(false);
  }, [isImporting, onImportingChange]);

  const submit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (!source.trim()) {
      setError('请输入 Java 源码路径');
      setPhase(JavaSourceImportPhase.Failed);
      return;
    }
    if (!parentTreeNodeId) {
      setError('请选择要挂载的项目目录');
      setPhase(JavaSourceImportPhase.Failed);
      return;
    }

    setPhase(JavaSourceImportPhase.Importing);
    setError(null);
    setResult(null);
    try {
      const imported = await importJavaSource({ source, parentTreeNodeId, translate });
      await initialize();
      selectTreeEntry(imported.treeNodeId);
      setActiveView('index');
      setResult(imported);
      setPhase(JavaSourceImportPhase.Succeeded);
      addNotification(`已导入 ${imported.title}`, 'success');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Java 源码导入失败');
      setPhase(JavaSourceImportPhase.Failed);
    }
  };

  if (phase === JavaSourceImportPhase.Succeeded && result) {
    return (
      <section className="link-import-result" aria-live="polite">
        <div className="link-import-result-mark"><Check size={21} /></div>
        <div className="link-import-result-copy">
          <span>导入完成</span>
          <strong>{result.title}</strong>
          <small>Java {result.runtimeVersion}</small>
        </div>
        <dl className="link-import-result-grid java-source-import-result-grid">
          <div><dt>源码文件</dt><dd>{result.sourceFiles}</dd></div>
          <div><dt>包</dt><dd>{result.importedPackages}</dd></div>
          <div><dt>类型</dt><dd>{result.importedTypes}</dd></div>
          <div><dt>成员</dt><dd>{result.importedMembers}</dd></div>
          <div><dt>Javadoc</dt><dd>{result.documentedTypes + result.documentedMembers}</dd></div>
          <div><dt>类型关系</dt><dd>{result.directTypeRelations}</dd></div>
        </dl>
        <div className="link-import-file">
          <Braces size={15} aria-hidden="true" />
          <span>{result.source}</span>
        </div>
        <div className="link-import-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setResult(null);
              setPhase(JavaSourceImportPhase.Editing);
            }}
          >
            <RotateCcw size={14} />
            重新导入
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>查看内容</button>
        </div>
      </section>
    );
  }

  return (
    <form className="link-import-form" noValidate onSubmit={submit}>
      <label className="link-import-field" htmlFor="java-source-import-path">
        <span><Braces size={14} aria-hidden="true" />Java 源码路径</span>
        <input
          id="java-source-import-path"
          className="input java-source-import-path"
          value={source}
          disabled={isImporting}
          spellCheck={false}
          placeholder=".java / 源码目录 / src.zip / JDK!内部路径"
          onChange={(event: { target: { value: string } }) => {
            setSource(event.target.value);
            if (phase === JavaSourceImportPhase.Failed) setPhase(JavaSourceImportPhase.Editing);
            setError(null);
          }}
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
          <strong>翻译 Javadoc</strong>
          <small>{translate ? '中文' : '保留原文'}</small>
        </span>
        <input
          type="checkbox"
          checked={translate}
          disabled={isImporting}
          onChange={(event: { target: { checked: boolean } }) => setTranslate(event.target.checked)}
        />
        <span className="link-import-switch" aria-hidden="true" />
      </label>

      {error && <div className="link-import-error" role="alert">{error}</div>}

      <div className="link-import-actions">
        <button type="button" className="btn btn-ghost" disabled={isImporting} onClick={onClose}>取消</button>
        <button
          type="submit"
          className="btn btn-primary link-import-submit"
          disabled={isImporting || !source.trim() || !parentTreeNodeId}
        >
          {isImporting
            ? <LoaderCircle className="link-import-spinner" size={15} />
            : <Braces size={15} />}
          {isImporting ? '正在解析并导入' : '导入 Java 源码'}
        </button>
      </div>
    </form>
  );
}
