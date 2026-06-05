import InferenceEngine from '../panels/InferenceEngine';
import ExplanationCard from '../panels/ExplanationCard';
import QuestionBank from '../panels/QuestionBank';
import RelationNetwork from '../panels/RelationNetwork';

export default function RightSidePanel() {
  return (
    <aside className="right-panel" id="right-panel">
      <div className="right-panel-body">
        <InferenceEngine />
        <ExplanationCard />
        <QuestionBank />
        <RelationNetwork />
      </div>
    </aside>
  );
}
