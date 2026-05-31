import { useState, useCallback, useRef, useEffect } from 'react';
import { useGraphStore } from '../store/useGraph';

export default function InferenceEngine() {
  const inferenceResponses = useGraphStore((s) => s.inferenceResponses);
  const [inputValue, setInputValue] = useState('');
  const [steps, setSteps] = useState<{ label: string; sublabel: string; color: string }[]>([]);
  const [status, setStatus] = useState('等待输入问题');
  const [progressDone, setProgressDone] = useState(0);
  const [answer, setAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAll = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (typingRef.current) { clearInterval(typingRef.current); typingRef.current = null; }
  }, []);

  const runInference = useCallback((question: string) => {
    if (!question.trim()) return;
    stopAll();
    setIsRunning(true);
    setSteps([]);
    setShowAnswer(false);
    setAnswer('');
    setStatus('⚡ 正在分析问题语义...');
    setProgressDone(0);

    let responseAnswer = '';
    for (const key of Object.keys(inferenceResponses)) {
      if (key !== 'default' && question.includes(key)) {
        responseAnswer = inferenceResponses[key];
        break;
      }
    }
    if (!responseAnswer) responseAnswer = inferenceResponses.default || '';

    if (!responseAnswer) {
      setIsRunning(false);
      setStatus('暂无可用推理材料');
      return;
    }

    const stepsData = [
      { label: '语义检索', sublabel: '查找相关知识', color: '#8b5cf6' },
      { label: '关系遍历', sublabel: '组织上下文', color: '#a855f7' },
      { label: '答案生成', sublabel: '汇总结果', color: '#06b6d4' },
    ];

    const totalSteps = stepsData.length;
    let stepIndex = 0;

    timerRef.current = setInterval(() => {
      if (stepIndex < totalSteps) {
        const s = stepsData[stepIndex];
        setSteps(prev => [...prev, { label: s.label, sublabel: s.sublabel, color: s.color }]);
        setProgressDone(Math.floor(((stepIndex + 1) / totalSteps) * 8));
        const msgs = ['正在语义搜索相关节点...', '正在遍历关系图谱...', '正在组织推理路径...', '推理完成 ✓'];
        setStatus(`⚡ ${msgs[Math.min(stepIndex, msgs.length - 1)]}`);
        stepIndex++;
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setIsRunning(false);
        setStatus('✅ 推理完成');
        setProgressDone(8);
        setShowAnswer(true);
        // Typewriter effect
        let i = 0;
        setAnswer('');
        typingRef.current = setInterval(() => {
          i++;
          setAnswer(responseAnswer.slice(0, i));
          if (i >= responseAnswer.length) {
            if (typingRef.current) clearInterval(typingRef.current);
            typingRef.current = null;
          }
        }, 15);
      }
    }, 800);
  }, [inferenceResponses, stopAll]);

  const stopInference = () => {
    stopAll();
    setIsRunning(false);
    setStatus('⏸ 推理已停止');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') runInference(inputValue);
  };

  useEffect(() => {
    return () => stopAll();
  }, [stopAll]);

  return (
    <>
      <div className="right-section-header">
        <div className="right-section-title">
          <span>🧠</span><span>解答引擎</span>
          <span className="title-en">(Inference Engine)</span>
        </div>
        <div className="right-section-actions">
          <button className="btn btn-sm" id="btn-followup" onClick={() => {
            setInputValue('');
            const input = document.getElementById('inference-input') as HTMLInputElement;
            if (input) { input.focus(); input.placeholder = '继续追问...'; }
          }}>追问</button>
          <button className="btn btn-icon btn-sm" id="btn-close-inference" title="Close" onClick={() => {
            setShowAnswer(false);
            stopInference();
          }}>✕</button>
        </div>
      </div>
      <div className="inference-engine">
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 10, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>输入问题</label>
          <div className="input-group">
            <input
              className="input"
              id="inference-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入你的问题..."
            />
            <button className="btn btn-stop" id="btn-stop-inference" onClick={stopInference} disabled={!isRunning}>⏹ 停止推理</button>
          </div>
        </div>
        <div className="inference-path">
          <div className="inference-path-label">推理路径 (实时生成)</div>
          <div className="inference-steps" id="inference-steps">
            {steps.map((s, i) => (
              <span key={i}>
                {i > 0 && <span className="inference-arrow">→</span>}
                <span className="inference-step" style={{ borderLeft: `2px solid ${s.color}` }}>
                  {s.label}<span className="step-sub">{s.sublabel}</span>
                </span>
              </span>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 6 }}>推理状态:</div>
        <div id="inference-status" style={{ fontSize: 10, color: 'var(--text-secondary)', padding: '6px 8px', background: 'var(--bg-card)', borderRadius: 4, marginBottom: 8 }}>
          {status}
        </div>
        <div className="inference-progress" id="inference-progress">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i}>
              <span className={`dot ${i < progressDone ? 'filled' : ''}`}></span>
              {i < 7 && <span className={`dot-line ${i < progressDone - 1 ? 'active' : ''}`}></span>}
            </span>
          ))}
        </div>
        <div
          id="inference-answer"
          style={{
            display: showAnswer ? 'block' : 'none',
            marginTop: 10,
            padding: 10,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-active)',
            borderRadius: 8,
            fontSize: 11,
            lineHeight: 1.7,
            color: 'var(--text-primary)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {answer}
        </div>
      </div>
    </>
  );
}
