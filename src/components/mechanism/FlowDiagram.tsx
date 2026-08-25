import type { ProcessDiagram } from '../../mechanism';
import { toneClassName } from './toneClassName';

interface FlowDiagramProps {
  diagram: ProcessDiagram;
  stepIndex: number;
  onSelectStep: (stepIndex: number) => void;
}

export default function FlowDiagram({ diagram, stepIndex, onSelectStep }: FlowDiagramProps) {
  const canvasWidth = Math.max(980, diagram.steps.length * 188 + 48);

  return (
    <div className="mechanism-diagram-scroll">
      <ol className="mechanism-flow-diagram" style={{ width: canvasWidth }}>
        {diagram.steps.map((step) => (
          <li key={step.stepId} className={step.index === stepIndex ? 'is-current' : ''}>
            <button
              type="button"
              className={`mechanism-flow-node ${toneClassName(step.tone)}`}
              onClick={() => onSelectStep(step.index)}
              aria-current={step.index === stepIndex ? 'step' : undefined}
            >
              <span className="mechanism-flow-index">{String(step.index + 1).padStart(2, '0')}</span>
              <strong>{step.label}</strong>
              <span className="mechanism-flow-route">
                {step.source.label}
                <em>{step.relation.label}</em>
                {step.target.label}
              </span>
            </button>
            {step.index < diagram.steps.length - 1 ? (
              <span className="mechanism-flow-connector" aria-hidden="true" />
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
