// 跨域归属审计：找出"混合知识点"——同一 nodeRef 被多个非投影真实条目持有，
// 或同一节点在 >1 个视图里出现却没标 dimensions（潜在跨域未标注）。
import { readFileSync } from 'node:fs';

const tree = JSON.parse(readFileSync('E:/project/Knowledge-OS/data/tree-data.json', 'utf8'));
const pool = JSON.parse(readFileSync('E:/project/Knowledge-OS/data/node-pool.json', 'utf8'));

// 递归收集所有 tree 条目
const entries = [];
function walk(nodes, path) {
  for (const n of nodes || []) {
    entries.push({ ...n, _path: path });
    if (n.children) walk(n.children, [...path, n.name ?? n.id]);
  }
}
walk([tree], []);

// 按 nodeRef 聚合
const byRef = new Map();
for (const e of entries) {
  if (!e.nodeRef) continue;
  if (!byRef.has(e.nodeRef)) byRef.set(e.nodeRef, []);
  byRef.get(e.nodeRef).push(e);
}

let realMulti = 0;     // 同一 nodeRef 被 >=2 个"真实(非投影)"条目持有
let projReal = 0;      // 同一 nodeRef 同时有真实条目和投影条目（潜在真节点+投影并存）
let crossViewNoDim = 0;// 出现在 >=2 个不同 view 但 dimensions 为空
const violations = [];

for (const [ref, list] of byRef) {
  const reals = list.filter((e) => !e.projection);
  const projs = list.filter((e) => e.projection);
  const views = new Set(list.map((e) => e.view).filter(Boolean));
  const node = pool[ref];
  const dims = node?.dimensions ?? [];

  if (reals.length >= 2) {
    realMulti++;
    violations.push({ ref, type: 'REAL_DUPLICATE', count: reals.length, paths: reals.map((r) => r._path.join(' / ')) });
  }
  if (reals.length >= 1 && projs.length >= 1) {
    projReal++;
    violations.push({ ref, type: 'REAL_AND_PROJECTION', realPaths: reals.map((r) => r._path.join(' / ')), projViews: [...projs.map((p) => p.view)] });
  }
  if (views.size >= 2 && dims.length === 0) {
    crossViewNoDim++;
    violations.push({ ref, type: 'CROSS_VIEW_NO_DIMENSION', label: node?.label, views: [...views] });
  }
}

console.log('=== 跨域归属审计 ===');
console.log('Tree 条目总数(含 nodeRef):', entries.filter((e) => e.nodeRef).length);
console.log('被多条目引用的 nodeRef 数:', byRef.size);
console.log('真实重复持有(REAL_DUPLICATE):', realMulti);
console.log('真实条目+投影并存(REAL_AND_PROJECTION):', projReal);
console.log('跨 >=2 视图但 dimensions 为空:', crossViewNoDim);
console.log('\n--- 违例明细(前 40 条) ---');
for (const v of violations.slice(0, 40)) console.log(JSON.stringify(v));
