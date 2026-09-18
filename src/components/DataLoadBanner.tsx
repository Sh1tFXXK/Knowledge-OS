import { useGraphStore } from '../store/useGraph';
import { READ_ONLY_DEPLOYMENT } from '../knowledge/deploymentMode';

/**
 * 数据加载诊断横幅。
 *
 * 通知 toast 3 秒就消失了，而"某个数据文件加载失败、已禁止回写"必须一直看得见——
 * 否则用户会在不知情的情况下继续编辑，而编辑结果根本不会落盘。
 *
 * 同时承载外部修改冲突的裁决入口：data/*.json 在磁盘上被外部改动、而本地
 * 还有未保存编辑时，用户在这里选择保留哪一边，任何一边都不会被静默覆盖。
 *
 * 以及只读部署（静态托管）的常驻提示：线上 /api/data 只有 GET，编辑不落盘。
 */
export default function DataLoadBanner() {
  const report = useGraphStore((s) => s.dataLoadReport);
  const externalConflicts = useGraphStore((s) => s.externalConflicts);
  const reloadFromFiles = useGraphStore((s) => s.reloadFromFiles);
  const keepLocalChange = useGraphStore((s) => s.keepLocalChange);
  const loadExternalChange = useGraphStore((s) => s.loadExternalChange);

  const hasConflicts = externalConflicts.length > 0;
  if (!report && !hasConflicts && !READ_ONLY_DEPLOYMENT) return null;

  const { failures, warnings, missing } = report ?? { failures: [], warnings: [], missing: [] };
  const hasFailure = failures.length > 0;

  return (
    <div
      className={`data-load-banner${hasFailure ? ' is-error' : ' is-warning'}`}
      role="status"
    >
      {READ_ONLY_DEPLOYMENT && (
        <div className="data-load-banner-row">
          🔒 只读部署：这里的编辑不会落盘（线上 <code>/api/data</code> 只提供 GET）。
          数据改动请提交到仓库，由部署自动更新。
        </div>
      )}

      {hasConflicts && (
        <div className="data-load-banner-conflicts">
          {externalConflicts.map((conflict) => (
            <div key={conflict.key} className="data-load-banner-conflict">
              <span>
                ⚔️ <code>{conflict.file}</code>（{conflict.label}）在外部被修改，本地有未保存的编辑
              </span>
              <span className="data-load-banner-conflict-actions">
                <button
                  className="btn btn-sm"
                  onClick={() => keepLocalChange(conflict.key)}
                >
                  保留本地
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => loadExternalChange(conflict.key)}
                >
                  装载外部
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {report && (
        <>
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
        </>
      )}
    </div>
  );
}
