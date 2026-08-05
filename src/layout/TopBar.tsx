import { useState } from 'react';
import { Clock3, FileUp, Link2, Settings } from 'lucide-react';
import { useGraphStore } from '../store/useGraph';
import { getTreePathNames } from '../knowledge/treeUtils';
import LinkImportDialog from '../components/LinkImportDialog';
import DocumentImportDialog from '../components/DocumentImportDialog';

const VIEWS = [
  { icon: '🌐', label: '视图', labelEn: 'Universe View', id: 'universe' },
  { icon: 'IX', label: '索引', labelEn: 'Explanation Index', id: 'index' },
  { icon: 'M', label: '机制', labelEn: 'Mechanism Lens', id: 'mechanism' },
  { icon: 'DB', label: '节点库', labelEn: 'Node Database', id: 'database' },
  { icon: '?', label: '问题库', labelEn: 'Question Database', id: 'questions' },
  { icon: 'ST', label: 'Supertag库', labelEn: 'Supertag Library', id: 'supertags' },
  { icon: <Clock3 size={14} />, label: '知识点时间线', labelEn: 'Knowledge Point Timeline', id: 'timeline' },
] as const;

export default function TopBar() {
  const [isLinkImportOpen, setIsLinkImportOpen] = useState(false);
  const [isDocumentImportOpen, setIsDocumentImportOpen] = useState(false);
  const activeView = useGraphStore((s) => s.activeView);
  const setActiveView = useGraphStore((s) => s.setActiveView);
  const treeData = useGraphStore((s) => s.treeData);
  const selectedTreeNodeId = useGraphStore((s) => s.selectedTreeNodeId);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const nodePool = useGraphStore((s) => s.nodePool);

  const breadcrumb = selectedTreeNodeId
    ? getTreePathNames(treeData, selectedTreeNodeId)
    : selectedNodeId && nodePool[selectedNodeId]
      ? [nodePool[selectedNodeId].label]
      : [treeData.name];

  return (
    <>
      <div className="header-logo">
        <div className="header-logo-icon">K</div>
        <div>
          <div className="header-logo-text">Knowledge OS</div>
          <div className="header-logo-version">v3.0 Ultimate</div>
        </div>
      </div>

      <nav className="header-nav">
        {VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            className={`header-nav-item${activeView === view.id ? ' active' : ''}`}
            title={view.labelEn}
            onClick={() => setActiveView(view.id)}
          >
            <span className="nav-icon">{view.icon}</span>
            <span className="nav-label">{view.label}</span>
          </button>
        ))}
      </nav>

      <div className="header-breadcrumb" id="header-breadcrumb">
        {breadcrumb.map((item, index) => (
          <span key={`${item}:${index}`}>
            <span className={index === breadcrumb.length - 1 ? 'active' : ''}>{item}</span>
            {index < breadcrumb.length - 1 && <span className="sep">/</span>}
          </span>
        ))}
      </div>

      <div className="header-actions">
        <button
          type="button"
          className="header-import-action"
          title="导入任意文件"
          onClick={() => setIsDocumentImportOpen(true)}
        >
          <FileUp size={14} />
          <span>文档导入</span>
        </button>
        <button
          type="button"
          className="header-import-action"
          title="从网页链接导入"
          onClick={() => setIsLinkImportOpen(true)}
        >
          <Link2 size={14} />
          <span>链接导入</span>
        </button>
        <button type="button" className="btn-icon" title="设置" onClick={() => {}}>
          <Settings size={15} />
        </button>
        <div className="header-user" title="Visionary">
          V
        </div>
      </div>

      <LinkImportDialog isOpen={isLinkImportOpen} onClose={() => setIsLinkImportOpen(false)} />
      <DocumentImportDialog
        isOpen={isDocumentImportOpen}
        onClose={() => setIsDocumentImportOpen(false)}
      />
    </>
  );
}
