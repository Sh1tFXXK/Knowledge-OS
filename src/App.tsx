import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { useGraphStore } from './store/useGraph';
import './styles/main.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/database.css';

import TopBar from './layout/TopBar';
import UniverseTree from './layout/UniverseTree';
import ReasoningKernel from './core/ReasoningKernel';
import RightSidePanel from './layout/RightSidePanel';
import NodeDatabase from './components/NodeDatabase';
import QuestionDatabase from './components/QuestionDatabase';
import MechanismLensPanel from './components/MechanismLensPanel';
import SupertagLibrary from './components/SupertagLibrary';
import ExplanationIndexView from './core/ExplanationIndexView';

const LEFT_PANEL_MIN_WIDTH = 180;
const LEFT_PANEL_MAX_WIDTH = 560;
const LEFT_PANEL_COLLAPSED_WIDTH = 42;
const RIGHT_PANEL_MIN_WIDTH = 280;
const RIGHT_PANEL_MAX_WIDTH = 680;

function clampLeftPanelWidth(width: number): number {
  return Math.min(LEFT_PANEL_MAX_WIDTH, Math.max(LEFT_PANEL_MIN_WIDTH, width));
}

function clampRightPanelWidth(width: number): number {
  return Math.min(RIGHT_PANEL_MAX_WIDTH, Math.max(RIGHT_PANEL_MIN_WIDTH, width));
}

export default function App() {
  const notifications = useGraphStore((s) => s.notifications);
  const activeView = useGraphStore((s) => s.activeView);
  const setActiveView = useGraphStore((s) => s.setActiveView);
  const initialize = useGraphStore((s) => s.initialize);
  const [leftPanelWidth, setLeftPanelWidth] = useState(260);
  const [rightPanelWidth, setRightPanelWidth] = useState(360);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const startLeftPanelResize = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsLeftPanelCollapsed(false);

    const startX = event.clientX;
    const startWidth = leftPanelWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const nextWidth = startWidth + moveEvent.clientX - startX;
      setLeftPanelWidth(clampLeftPanelWidth(nextWidth));
    };

    const handleMouseUp = () => {
      document.body.classList.remove('is-resizing-left-panel');
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    document.body.classList.add('is-resizing-left-panel');
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [leftPanelWidth]);

  const startRightPanelResize = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();

    const startX = event.clientX;
    const startWidth = rightPanelWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const nextWidth = startWidth + startX - moveEvent.clientX;
      setRightPanelWidth(clampRightPanelWidth(nextWidth));
    };

    const handleMouseUp = () => {
      document.body.classList.remove('is-resizing-right-panel');
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    document.body.classList.add('is-resizing-right-panel');
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [rightPanelWidth]);

  const appStyle = {
    '--left-panel-width': `${isLeftPanelCollapsed ? LEFT_PANEL_COLLAPSED_WIDTH : leftPanelWidth}px`,
    '--right-panel-width': `${rightPanelWidth}px`,
  } as CSSProperties;

  return (
    <div id="app" style={appStyle}>
      {/* ── 顶栏 ── */}
      <header className="header" id="header">
        <TopBar />
      </header>

      {/* ── 左侧：目录树（永远显示） ── */}
      <aside className={`left-panel${isLeftPanelCollapsed ? ' left-panel--collapsed' : ''}`} id="left-panel">
        <UniverseTree
          isCollapsed={isLeftPanelCollapsed}
          onToggleCollapsed={() => setIsLeftPanelCollapsed((value) => !value)}
        />
        {!isLeftPanelCollapsed && (
          <div
            className="left-panel-resize-handle"
            onMouseDown={startLeftPanelResize}
            title="拖动调整目录宽度"
          />
        )}
      </aside>

      {/* ── 中间：主可视化区（永远是视图；问题也在此呈现） ── */}
      <main className="center-area" id="center-area">
        {activeView === 'index' ? (
          <section className="center-view" id="center-view">
            <ExplanationIndexView />
          </section>
        ) : activeView === 'database' ? (
          <section className="center-view" id="center-view" style={{ height: '100%', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 15 }}>🗄️ 节点库</h2>
              <button className="btn btn-sm" onClick={() => setActiveView('universe')}>← 返回视图</button>
            </div>
            <NodeDatabase />
          </section>
        ) : activeView === 'questions' ? (
          <section className="center-view" id="center-view" style={{ height: '100%', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 15 }}>❓ 问题库</h2>
              <button className="btn btn-sm" onClick={() => setActiveView('universe')}>← 返回视图</button>
            </div>
            <QuestionDatabase />
          </section>
        ) : activeView === 'supertags' ? (
          <section className="center-view" id="center-view" style={{ height: '100%', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 15 }}># Supertag 库</h2>
              <button className="btn btn-sm" onClick={() => setActiveView('universe')}>← 返回视图</button>
            </div>
            <SupertagLibrary />
          </section>
        ) : activeView === 'mechanism' ? (
          <section className="center-view" id="center-view">
            <MechanismLensPanel />
          </section>
        ) : (
          /* 默认：永远显示推理内核（核心视图） */
          <section className="center-view" id="center-view">
            <ReasoningKernel />
          </section>
        )}
      </main>

      {/* ── 右侧：详情解释卡 + 关系网 ── */}
      <RightSidePanel onResizeStart={startRightPanelResize} />

      {/* ── 通知 Toast ── */}
      <div
        id="notification-container"
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        {notifications.map((n) => {
          const colorMap: Record<string, string> = {
            info:    '#8b5cf6',
            success: '#10b981',
            warning: '#f59e0b',
            error:   '#ef4444',
          };
          const iconMap: Record<string, string> = {
            info:    'ℹ️',
            success: '✅',
            warning: '⚠️',
            error:   '❌',
          };
          const color = colorMap[n.type] || '#8b5cf6';
          return (
            <div
              key={n.id}
              style={{
                background:     'rgba(15,15,25,0.95)',
                border:         `1px solid ${color}40`,
                borderLeft:     `3px solid ${color}`,
                borderRadius:   8,
                padding:        '10px 14px',
                display:        'flex',
                alignItems:     'center',
                gap:            8,
                fontSize:       13,
                color:          '#e2e8f0',
                backdropFilter: 'blur(12px)',
                boxShadow:      `0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px ${color}20`,
                maxWidth:       320,
                pointerEvents:  'auto',
                animation:      'slideInRight 0.3s ease',
              }}
            >
              <span>{iconMap[n.type]}</span>
              <span>{n.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
