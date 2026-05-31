import { useState } from 'react';
import { rules } from '../data';
import { useGraphStore } from '../store/useGraph';

export default function RuleComposer() {
  const addNotification = useGraphStore((s) => s.addNotification);
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="rule-composer">
      <div className="rule-composer-title">
        可组合规则
        <span className="title-en">Rule Composer</span>
      </div>
      <div className="rule-cards">
        {rules.map((rule, i) => (
          <div
            key={i}
            className="rule-card"
            onClick={() => {
              setSelected(i);
              addNotification(`已选中推理规则 #${i + 1}`, 'info');
            }}
            style={{
              borderColor:
                selected === i ? 'var(--accent-purple)' : undefined,
              background:
                selected === i
                  ? 'var(--accent-purple-dim)'
                  : undefined,
            }}
          >
            {rule.premise.map((p, j) => (
              <div key={j} className="text-muted" style={{ fontSize: 9, lineHeight: 1.4 }}>
                {p}
              </div>
            ))}
            <div
              className="text-accent"
              style={{ color: 'var(--accent-purple)', marginTop: 4, fontWeight: 500 }}
            >
              {rule.result}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
