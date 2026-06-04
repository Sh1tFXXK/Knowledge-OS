import { useState } from 'react';
import { useGraphStore } from '../store/useGraph';

export default function RuleComposer() {
  const rules = useGraphStore((s) => s.rules);
  const addRule = useGraphStore((s) => s.addRule);
  const addNotification = useGraphStore((s) => s.addNotification);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [premise, setPremise] = useState('');
  const [result, setResult] = useState('');

  const handleAdd = () => {
    const lines = premise.split('\n').map((l) => l.trim()).filter(Boolean);
    const res = result.trim();
    if (!lines.length || !res) {
      addNotification('请填写前提与结论', 'warning');
      return;
    }
    addRule({ premise: lines, result: res });
    setPremise('');
    setResult('');
    addNotification('规则已添加', 'success');
  };

  return (
    <div className={`rule-composer${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="rule-composer-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>可组合规则</span>
        <span className="title-en">Rule</span>
        <span className="rule-composer-count">{rules.length}</span>
        <span className="rule-composer-chevron">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
      <div className="rule-composer-body">
      <div className="rule-cards">
        {rules.length === 0 ? (
          <p className="text-muted" style={{ fontSize: 11, padding: 8 }}>
            暂无规则，在下方添加。
          </p>
        ) : (
          rules.map((rule, i) => (
            <div
              key={i}
              className="rule-card"
              onClick={() => {
                setSelected(i);
                addNotification(`已选中推理规则 #${i + 1}`, 'info');
              }}
              style={{
                borderColor: selected === i ? 'var(--accent-purple)' : undefined,
                background: selected === i ? 'var(--accent-purple-dim)' : undefined,
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
          ))
        )}
      </div>
      <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <textarea
          className="input"
          rows={2}
          placeholder="前提（每行一条）"
          value={premise}
          onChange={(e) => setPremise(e.target.value)}
          style={{ fontSize: 11 }}
        />
        <input
          className="input"
          placeholder="结论"
          value={result}
          onChange={(e) => setResult(e.target.value)}
          style={{ fontSize: 11 }}
        />
        <button type="button" className="btn btn-primary btn-sm" onClick={handleAdd}>
          添加规则
        </button>
      </div>
      </div>
      )}
    </div>
  );
}
