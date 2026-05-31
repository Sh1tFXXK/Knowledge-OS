import { useGraphStore } from './store/useGraph';
import './styles/main.css';
import './styles/layout.css';
import './styles/components.css';

import TopBar from './layout/TopBar';
import BottomBar from './layout/BottomBar';
import UniverseTree from './layout/UniverseTree';
import ReasoningKernel from './core/ReasoningKernel';
import RuleComposer from './core/RuleComposer';
import SubsystemDeck from './core/SubsystemDeck';
import InferenceEngine from './panels/InferenceEngine';
import ExplanationCard from './panels/ExplanationCard';
import QuestionBank from './panels/QuestionBank';
import RelationNetwork from './panels/RelationNetwork';

export default function App() {
  const notifications = useGraphStore((s) => s.notifications);

  return (
    <div id="app">
      {/* Header */}
      <header className="header" id="header">
        <TopBar />
      </header>

      {/* Left Panel */}
      <aside className="left-panel" id="left-panel">
        <UniverseTree />
      </aside>

      {/* Center Area — B: ReasoningKernel + C: RuleComposer */}
      <main className="center-area" id="center-area">
        <ReasoningKernel />
        <RuleComposer />
      </main>

      {/* Right Panel */}
      <aside className="right-panel" id="right-panel">
        <div className="right-section" id="inference-section">
          <InferenceEngine />
        </div>
        <div className="right-section" id="explanation-section">
          <ExplanationCard />
        </div>
        <div className="right-section" id="question-section">
          <QuestionBank />
        </div>
        <div className="right-section" id="relation-section">
          <RelationNetwork />
        </div>
      </aside>

      {/* Bottom Panel — D: Subsystem Deck */}
      <section className="bottom-panel" id="bottom-panel">
        <SubsystemDeck />
      </section>

      {/* Toolbar */}
      <footer className="toolbar" id="toolbar">
        <BottomBar />
      </footer>

      {/* Notification Toast List */}
      <div id="notification-container" style={{
        position: 'fixed',
        top: 52,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}>
        {notifications.map((n) => {
          const colorMap: Record<string, string> = {
            info: '#8b5cf6',
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444',
          };
          const iconMap: Record<string, string> = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌',
          };
          const color = colorMap[n.type] || '#8b5cf6';
          return (
            <div
              key={n.id}
              style={{
                padding: '8px 16px',
                background: 'var(--bg-card)',
                border: `1px solid ${color}40`,
                borderLeft: `3px solid ${color}`,
                borderRadius: 8,
                fontSize: 12,
                color: 'var(--text-primary)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                minWidth: 200,
                backdropFilter: 'blur(12px)',
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
