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
import { useGraphStore } from './store/useGraph';
import './styles/tokens.css';

export default function App() {
  const theme = useGraphStore(s => s.theme);
  const notifications = useGraphStore(s => s.notifications);

  return (
    <div className="app-container" data-theme={theme}>
      <header className="topbar-mock" style={{ padding: 0 }}>
        <TopBar />
      </header>

      <main className="main-layout">
        <aside className="column left-border" style={{ padding: 0 }}>
          <UniverseTree />
        </aside>

        <section className="center-content">
          <ReasoningKernel />
          <RuleComposer />
          <SubsystemDeck />
        </section>

        <aside className="column right-border" style={{ padding: '6px', gap: '6px' }}>
          <InferenceEngine />
          <ExplanationCard />
          <QuestionBank />
          <RelationNetwork />
        </aside>
      </main>

      <footer className="bottombar-mock" style={{ padding: 0 }}>
        <BottomBar />
      </footer>

      {/* Notification toasts */}
      <div style={{
        position: 'fixed', top: 60, right: 16, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 6, pointerEvents: 'none'
      }}>
        {notifications.slice(-5).map(n => (
          <div key={n.id} style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 12,
            background: n.type === 'error' ? 'rgba(239,68,68,0.2)' :
                        n.type === 'warning' ? 'rgba(245,158,11,0.2)' :
                        n.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(139,92,246,0.2)',
            border: `1px solid ${n.type === 'error' ? '#ef4444' : n.type === 'warning' ? '#f59e0b' : n.type === 'success' ? '#10b981' : '#8b5cf6'}40`,
            color: '#dfe7f5', backdropFilter: 'blur(8px)', animation: 'notifSlide 0.3s ease'
          }}>
            {n.type === 'error' ? '❌' : n.type === 'warning' ? '⚠️' : n.type === 'success' ? '✅' : 'ℹ️'} {n.message}
          </div>
        ))}
      </div>
    </div>
  );
}