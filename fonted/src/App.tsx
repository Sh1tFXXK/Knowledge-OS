import './styles/tokens.css';
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
  return (
    <div className="app">
      <TopBar />
      <div className="main">
        <aside className="col left"><UniverseTree /></aside>
        <section className="center">
          <ReasoningKernel />   {/* B 62% */}
          <RuleComposer />      {/* C 13% */}
          <SubsystemDeck />     {/* D 25% */}
        </section>
        <aside className="col right">
          <InferenceEngine />   {/* E1 */}
          <ExplanationCard />   {/* E2 */}
          <QuestionBank />      {/* E3 */}
          <RelationNetwork />   {/* E4 */}
        </aside>
      </div>
      <BottomBar />
    </div>
  );
}
