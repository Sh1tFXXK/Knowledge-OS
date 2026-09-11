import { useGraphStore } from '../store/useGraph';

/**
 * 数据加载诊断横幅。
 *
 * 通知 toast 3 秒就消失了，而"某个数据文件加载失败、已禁止回写"必须一直看得见——
 * 否则用户会在不知情的情况下继续编辑，而编辑结果根本不会落盘。
 */
export default function DataLoadBanner() {
  const report = useGraphStore((s) => s.dataLoadReport);
  const reloadFromFiles = useGraphStore((s) => s.reloadFromFiles);

  if (!report) return null;
  const { failures, warnings, missing } = report;
  if (failures.length === 0 && warnings.length === 0 && missing.length === 0) return null;

  const hasFailure = failures.length > 0;

  return (
    <div className={`data-load-banner${hasFailure ? ' is-error' : ' is-warning'}`} role="status">
      <div className="data-load-banner-head">
        <strong>
          {hasFailure
            ? `数据加载失败：${failures.map((f) => f.label).join('、')} —— 已保留原状态，并禁止自动保存这些文件`
            : '数据加载提示'}
        </strong>
        <button className="btn btn-sm" onClick={() => { void reloadFromFiles(); }}>重新装载</button>
      </div>

      {failures.map((failure) => (
        <div key={failure.key} className="data-load-banner-row">
          ❌ <code>{failure.file}</code>（{failure.label}）：{failure.reason}
        </div>
      ))}

      {missing.map((item) => (
        <div key={item.key} className="data-load-banner-row">
          ⚠️ <code>{item.file}</code>（{item.label}）不存在，将按新文件处理
        </div>
      ))}

      {warnings.map((warning) => (
        <div key={warning} className="data-load-banner-row">
          ⚠️ {warning}
        </div>
      ))}
    </div>
  );
}
