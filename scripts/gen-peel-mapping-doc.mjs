// 生成 MySQL 剥离「每个概念具体去向」完整清单
// 输出：docs/mysql-peel-per-concept-mapping.md
// 数据源：data/knowledge-edges.json (instance-of) + tree-data.json (树路径) + node-pool.json (labels)
import { readFileSync, writeFileSync } from 'fs';

const pool = JSON.parse(readFileSync('data/node-pool.json', 'utf8'));
const tree = JSON.parse(readFileSync('data/tree-data.json', 'utf8'));
const edges = JSON.parse(readFileSync('data/knowledge-edges.json', 'utf8'));

function walk(n, fn, parent) { fn(n, parent); for (const c of (n.children || [])) walk(c, fn, n); }
function parentOf(id) {
  let p = null;
  walk(tree, (n, parent) => { if (!p && parent && parent.children && parent.children.some(c => c.id === id)) p = parent; });
  return p;
}
function treePathOf(id) {
  const path = [];
  let cur = parentOf(id);
  while (cur) { path.unshift(cur.name || cur.id); cur = parentOf(cur.id); }
  return path;
}
// label of a tree node
function treeNameOf(id) {
  let name = null;
  walk(tree, n => { if (!name && n.id === id) name = n.name || n.id; });
  return name;
}

// 所有 instance-of 边按 target 分组
const groups = new Map();
for (const e of edges) {
  if (e.type !== 'instance-of') continue;
  if (!groups.has(e.target)) groups.set(e.target, []);
  groups.get(e.target).push(e.source);
}

// 概念树条目路径（tree_concept_* 或已有 tree_* 形式）
function conceptEntryPath(conceptId) {
  // 尝试 tree_<conceptId>，否则找 nodeRef===conceptId 的树节点
  let entryId = `tree_${conceptId}`;
  let found = null;
  walk(tree, n => { if (!found && n.id === entryId) found = n; });
  if (!found) walk(tree, n => { if (!found && n.nodeRef === conceptId) found = n; });
  if (!found) return null;
  return { entryName: found.name || found.id, path: treePathOf(found.id), entryId: found.id };
}
function entryIdOf(conceptId) {
  const e = conceptEntryPath(conceptId);
  return e ? e.entryId : null;
}

// 识别关键域：从路径中找 database_principles / school_security 等域节点，取其名称
// 传入概念条目所在完整路径的 node id 链，返回"域"名。
function domainOf(entryId) {
  // 收集从概念条目向上到根的节点 id 链
  const ids = [];
  let cur = entryId;
  while (cur) { ids.unshift(cur); cur = (() => { let p = null; walk(tree, (n, parent) => { if (!p && parent && parent.children && parent.children.some(c => c.id === cur)) p = parent; }); return p ? p.id : null; })(); }
  // 关键域 id → 显示名
  const KEY = {
    'database_principles': '数据库原理 database_principles',
    'school_security': '安全 school_security',
    'tree_acm2012_systems_organization': '系统组织（ACM）',
    'tree_acm2012_networks': '网络（ACM）',
    'school_mathematics': '数学',
    'school_logic': '逻辑',
    'tree_1783873300414_0y8oon': '软件开发（实践总览）',
    'tree_1783260209337_u6gsoz': '软件符号与工具',
    'tree_acm2012_algorithms': '算法（ACM）',
    'school_computation_theory': '计算理论',
    'tree_acm2012_hardware': '硬件（ACM）',
  };
  for (const id of ids) if (KEY[id]) return KEY[id];
  return '(未识别域)';
}

const lines = [];
lines.push('# MySQL 剥离 · 每个概念的具体去向（instance-of 完整映射）');
lines.push('');
lines.push('> 数据源：`data/knowledge-edges.json`（type=instance-of，共 ' + groups.size + ' 个概念目标 / ' + edges.filter(e => e.type === 'instance-of').length + ' 条边）');
lines.push('> 每个「概念」= instance-of 的 target（本体节点）；「实例」= 从 MySQL 域剥离、改写后挂到该概念下的 MySQL 节点。');
lines.push('');

// 分域汇总
const byDomain = new Map();
for (const [target, sources] of groups) {
  const entry = conceptEntryPath(target);
  const dom = entry ? domainOf(entry.entryId) : '(无树条目)';
  if (!byDomain.has(dom)) byDomain.set(dom, { concepts: 0, instances: 0 });
  byDomain.get(dom).concepts++;
  byDomain.get(dom).instances += sources.length;
}
lines.push('## 分域汇总');
lines.push('');
lines.push('| 所属域 | 概念数 | 实例数 |');
lines.push('| --- | ---: | ---: |');
for (const [dom, st] of [...byDomain.entries()].sort((a, b) => b[1].instances - a[1].instances)) {
  lines.push(`| ${dom} | ${st.concepts} | ${st.instances} |`);
}
lines.push('');
lines.push('---');
lines.push('');

// 按目标概念字母序
const sortedTargets = [...groups.keys()].sort();
for (const target of sortedTargets) {
  const c = pool[target];
  const label = c ? (c.label || target) : target;
  const entry = conceptEntryPath(target);
  const pathStr = entry ? entry.path.join(' > ') + ' > ' + entry.entryName : '(无树条目)';
  const domain = entry ? domainOf(entryIdOf(target)) : '(未挂载)';
  lines.push(`## ${label} \`[${target}]\``);
  lines.push('');
  lines.push(`- **挂载位置**：${pathStr}`);
  lines.push(`- **所属域**：${domain}`);
  lines.push('');
  lines.push('| MySQL 实例（改写后 label） | 实例 ref |');
  lines.push('| --- | --- |');
  const sources = [...groups.get(target)].sort();
  for (const s of sources) {
    const o = pool[s];
    const instLabel = o ? (o.label || s) : s;
    lines.push(`| ${instLabel} | \`${s}\` |`);
  }
  lines.push('');
}

writeFileSync('docs/mysql-peel-per-concept-mapping.md', lines.join('\n'), 'utf8');
console.log('written docs/mysql-peel-per-concept-mapping.md lines:', lines.length);
console.log('concept targets:', groups.size);
