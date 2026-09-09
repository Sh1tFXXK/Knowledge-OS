/**
 * Read-only data archaeology for node-pool / edges / tree.
 * Outputs facts only — does not mutate data.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const data = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', name), 'utf8'));

const pool = data('node-pool.json');
const edges = data('knowledge-edges.json');
const tree = data('tree-data.json');

const nodes = Object.values(pool);
const ids = Object.keys(pool);
const edgeList = Array.isArray(edges) ? edges : (edges.edges ?? Object.values(edges));

function hasHandContent(n) {
  const rc = n.card?.rootContent;
  if (typeof rc === 'string' && rc.trim().length >= 50) return true;
  const tabs = n.card?.tabs;
  if (Array.isArray(tabs)) {
    return tabs.some((t) => typeof t?.content === 'string' && t.content.trim().length >= 50);
  }
  return false;
}

function tabCount(n) {
  const tabs = n.card?.tabs;
  return Array.isArray(tabs) ? tabs.length : 0;
}

function hasDefinitionPages(n) {
  const dp = n.card?.definitionPages;
  if (!dp) return false;
  if (Array.isArray(dp)) return dp.length > 0;
  if (typeof dp === 'object') return Object.keys(dp).length > 0;
  return true;
}

function hasMeaningfulTags(n) {
  return Array.isArray(n.tags) && n.tags.length > 0;
}

/** Coarse method cluster from id prefix + tag fingerprints */
function clusterOf(n) {
  const id = n.id;
  const tags = new Set(n.tags ?? []);

  if (id.startsWith('demo_')) return 'C0_demo_seed';
  if (id.startsWith('n_')) return 'C1_short_hash_n';
  if (id.startsWith('k_java_type_') || id.startsWith('k_java_source_')) return 'C2_java_type_import';
  if (id.startsWith('k_java_')) return 'C2b_java_other';
  if (id.startsWith('k_wiki_')) {
    if (/_(?:s|b)\d+(?:_|$)/.test(id)) return 'C3_wiki_sections';
    return 'C3_wiki_pages';
  }
  if (id.startsWith('k_web_')) return 'C4_web_link';
  if (id.startsWith('k_vault_')) return 'C5_vault_import';
  if (id.startsWith('k_acm2012_') || tags.has('ACM CCS 2012')) return 'C6_acm_ccs2012';
  if (id.startsWith('k_class_')) return 'C7_class_taxonomy';
  if (tags.has('mysql-glossary') || tags.has('glossary')) return 'C8_mysql_glossary';
  if (id.startsWith('mysql_') || id.startsWith('mysql:')) return 'C9_mysql_manual_slug';
  if (id.startsWith('concept_') || id.startsWith('theory_')) return 'C10_concept_theory_slug';
  if (tags.has('wikipedia') || tags.has('wikipedia-import')) return 'C3_wiki_tagged';
  if (tags.has('源码类型') || tags.has('JDK 26')) return 'C2_java_tagged';
  if (tags.has('directory-taxonomy')) return 'C11_directory_taxonomy';
  if (/^k_\d{13}_/.test(id)) return 'C12_timestamp_k';
  if (id.startsWith('k_')) return 'C13_k_other';
  // topic prefixes: explain_, innodb_, etc.
  if (/^[a-z]+_/.test(id)) return 'C14_topic_slug';
  return 'C15_unknown';
}

// ─── Q1: ID identity ───────────────────────────────────────────
function classifyId(id) {
  if (/^demo_/.test(id)) return 'demo_* (seed)';
  if (/^n_[a-z0-9]{8}$/i.test(id)) return 'n_<8rand> (short hash)';
  if (/^k_java_type_[0-9a-f]{16}$/i.test(id)) return 'k_java_type_<sha16>';
  if (/^k_java_source_/.test(id)) return 'k_java_source_*';
  if (/^k_wiki_(zh|en)_/.test(id)) return 'k_wiki_{zh|en}_* (path-derived)';
  if (/^k_web_[0-9a-f]+/.test(id)) return 'k_web_<hash>';
  if (/^k_vault_/.test(id)) return 'k_vault_* (path-derived)';
  if (/^k_acm2012_/.test(id)) return 'k_acm2012_*';
  if (/^k_\d{13}_[a-z0-9]+/.test(id)) return 'k_<timestamp>_<rand>';
  if (/^k_/.test(id)) return 'k_* (other stable digest / slug)';
  if (/^(mysql_|concept_|theory_|explain_|innodb_)/.test(id)) return 'topic_slug (human/manual)';
  if (/^[a-z]+:/.test(id)) return 'colon_namespace (mysql:/container:)';
  if (/^[a-z]+_[a-z0-9_]+$/i.test(id)) return 'snake_slug';
  return 'other';
}

const idPat = {};
for (const id of ids) {
  const p = classifyId(id);
  idPat[p] = (idPat[p] || 0) + 1;
}

// Duplicate labels → re-import suspects
const byLabel = new Map();
for (const n of nodes) {
  const label = String(n.label ?? n.card?.title ?? '').trim().toLowerCase();
  if (!label) continue;
  if (!byLabel.has(label)) byLabel.set(label, []);
  byLabel.get(label).push(n);
}
const dupLabels = [...byLabel.entries()]
  .filter(([, arr]) => arr.length > 1)
  .sort((a, b) => b[1].length - a[1].length);

// Same identity different ids (java type via tags)
const javaFqcn = new Map();
for (const n of nodes) {
  const tags = n.tags ?? [];
  const fqcn = tags.find((t) => /^(?:[a-z_$][\w$]*\.)+[A-Z_$][\w$]*$/.test(t));
  if (fqcn) {
    if (!javaFqcn.has(fqcn)) javaFqcn.set(fqcn, []);
    javaFqcn.get(fqcn).push(n.id);
  }
}
const dupJava = [...javaFqcn.entries()].filter(([, arr]) => arr.length > 1);

// Wiki page base vs sections — same article re-import?
const wikiBases = {};
for (const id of ids.filter((i) => i.startsWith('k_wiki_'))) {
  const base = id.replace(/_(?:s|b)\d+(?:_.*)?$/, '');
  wikiBases[base] = (wikiBases[base] || 0) + 1;
}

console.log('\n========== Q1 节点身份 ==========');
console.log('总节点:', ids.length);
console.log('ID 模式分布:');
for (const [k, v] of Object.entries(idPat).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${v}\t${k}`);
}
console.log('\n抽 20 个不同来源样本:');
const seenPat = new Set();
let shown = 0;
for (const id of ids) {
  const p = classifyId(id);
  if (seenPat.has(p) && [...seenPat].length < 12) {
    // allow 1-2 per pattern until 20
  }
  const countForPat = [...seenPat].filter((x) => x === p).length;
  // track differently
  const key = p;
  const already = nodes.filter(() => false);
  void already;
  if (!globalThis.__patCount) globalThis.__patCount = {};
  globalThis.__patCount[key] = (globalThis.__patCount[key] || 0) + 1;
  if (globalThis.__patCount[key] > 2) continue;
  console.log(`  [${p}] ${id}  label=${JSON.stringify(pool[id].label)}`);
  shown++;
  if (shown >= 20) break;
}

console.log('\n重复 label 组数:', dupLabels.length, ' 涉及节点:', dupLabels.reduce((s, [, a]) => s + a.length, 0));
console.log('Top 10 重复 label:');
for (const [label, arr] of dupLabels.slice(0, 10)) {
  const clusters = [...new Set(arr.map(clusterOf))];
  console.log(`  x${arr.length} "${label.slice(0, 40)}" → ids: ${arr.map((n) => n.id).slice(0, 5).join(', ')}${arr.length > 5 ? '...' : ''}  clusters=[${clusters.join(', ')}]`);
}
console.log('\n同一 Java FQCN 多 id:', dupJava.length);
for (const [fqcn, arr] of dupJava.slice(0, 8)) {
  console.log(`  ${fqcn}: ${arr.join(', ')}`);
}
console.log('\nWiki base 文章带多 section 的数量:', Object.values(wikiBases).filter((c) => c > 1).length);

// ─── Q2: 分层交叉 ──────────────────────────────────────────────
console.log('\n========== Q2 节点分层 ==========');
const cross = {};
const clusterCount = {};
const clusterDetail = {};
for (const n of nodes) {
  const c = clusterOf(n);
  clusterCount[c] = (clusterCount[c] || 0) + 1;
  const key = [
    hasHandContent(n) ? '正文Y' : '正文N',
    tabCount(n) > 0 ? `tabs${tabCount(n) >= 2 ? '2+' : '1'}` : 'tabs0',
    hasDefinitionPages(n) ? 'pagesY' : 'pagesN',
    hasMeaningfulTags(n) ? 'tagsY' : 'tagsN',
  ].join('|');
  cross[key] = (cross[key] || 0) + 1;
  if (!clusterDetail[c]) {
    clusterDetail[c] = { contentY: 0, tabs0: 0, tabs1: 0, tabs2p: 0, pagesY: 0, dimsY: 0, sample: [] };
  }
  const d = clusterDetail[c];
  if (hasHandContent(n)) d.contentY++;
  const tc = tabCount(n);
  if (tc === 0) d.tabs0++;
  else if (tc === 1) d.tabs1++;
  else d.tabs2p++;
  if (hasDefinitionPages(n)) d.pagesY++;
  if (Array.isArray(n.dimensions) && n.dimensions.length) d.dimsY++;
  if (d.sample.length < 3) d.sample.push(n.id);
}
console.log('交叉表 (正文|tabs|pages|tags):');
for (const [k, v] of Object.entries(cross).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${v}\t${k}`);
}
console.log('\n方法簇:');
for (const [c, v] of Object.entries(clusterCount).sort((a, b) => b[1] - a[1])) {
  const d = clusterDetail[c];
  console.log(
    `  ${v}\t${c}\t正文Y=${d.contentY} tabs0=${d.tabs0} tabs1=${d.tabs1} tabs2+=${d.tabs2p} pagesY=${d.pagesY} dimsY=${d.dimsY}`,
  );
  console.log(`       samples: ${d.sample.join(', ')}`);
}

// ─── Q3: 孤儿 ──────────────────────────────────────────────────
console.log('\n========== Q3 孤儿 ==========');
const treeRefs = new Set();
function walkTree(node) {
  if (node.nodeRef) treeRefs.add(node.nodeRef);
  for (const ch of node.children ?? []) walkTree(ch);
}
walkTree(tree);

const degree = new Map();
for (const id of ids) degree.set(id, 0);
let danglingEdges = 0;
let bothMissing = 0;
let oneMissing = 0;
for (const e of edgeList) {
  const sOk = pool[e.source] != null;
  const tOk = pool[e.target] != null;
  if (!sOk && !tOk) {
    bothMissing++;
    danglingEdges++;
  } else if (!sOk || !tOk) {
    oneMissing++;
    danglingEdges++;
  }
  if (sOk) degree.set(e.source, (degree.get(e.source) || 0) + 1);
  if (tOk) degree.set(e.target, (degree.get(e.target) || 0) + 1);
}
const notInTree = ids.filter((id) => !treeRefs.has(id));
const noEdges = ids.filter((id) => (degree.get(id) || 0) === 0);
const notInTreeAndNoEdge = notInTree.filter((id) => (degree.get(id) || 0) === 0);

console.log('tree 引用的 nodeRef 数:', treeRefs.size);
console.log('不在 tree 里的节点:', notInTree.length);
console.log('不连任何边的节点:', noEdges.length);
console.log('两端节点都不存在的边:', bothMissing);
console.log('(参考) 一端缺失的边:', oneMissing, ' 总边:', edgeList.length);
console.log('既不在 tree 又无边:', notInTreeAndNoEdge.length);

const orphanByCluster = {};
for (const id of notInTree) {
  const c = clusterOf(pool[id]);
  orphanByCluster[c] = (orphanByCluster[c] || 0) + 1;
}
console.log('不在 tree 的按簇:');
for (const [c, v] of Object.entries(orphanByCluster).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${v}\t${c}`);
}

// ─── Q4: 边分布 ────────────────────────────────────────────────
console.log('\n========== Q4 边分布 ==========');
const edgeType = {};
const edgeDim = { withDims: 0, noDims: 0, emptyDims: 0 };
const typeXdim = {};
const typeXclusterPair = {};
const noDimByClusterPair = {};

for (const e of edgeList) {
  const t = e.type || '(none)';
  edgeType[t] = (edgeType[t] || 0) + 1;
  const hasD = Array.isArray(e.dimensions) && e.dimensions.length > 0;
  if (!e.dimensions) edgeDim.noDims++;
  else if (!e.dimensions.length) edgeDim.emptyDims++;
  else edgeDim.withDims++;

  const dimKey = hasD ? 'dimsY' : 'dimsN';
  const tk = `${t}|${dimKey}`;
  typeXdim[tk] = (typeXdim[tk] || 0) + 1;

  const sc = pool[e.source] ? clusterOf(pool[e.source]) : 'MISSING';
  const tc = pool[e.target] ? clusterOf(pool[e.target]) : 'MISSING';
  const pair = [sc, tc].sort().join(' × ');
  typeXclusterPair[`${t}|${pair}`] = (typeXclusterPair[`${t}|${pair}`] || 0) + 1;
  if (!hasD) {
    noDimByClusterPair[pair] = (noDimByClusterPair[pair] || 0) + 1;
  }
}

console.log('边 type 分布:');
for (const [k, v] of Object.entries(edgeType).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${v}\t${k}`);
}
console.log('dimensions:', edgeDim, `无标签比例=${((edgeDim.noDims + edgeDim.emptyDims) / edgeList.length * 100).toFixed(1)}%`);
console.log('\ntype × dims:');
for (const [k, v] of Object.entries(typeXdim).sort((a, b) => b[1] - a[1]).slice(0, 30)) {
  console.log(`  ${v}\t${k}`);
}
console.log('\n无 dimensions 的边 — 按端点簇对 Top 20:');
for (const [k, v] of Object.entries(noDimByClusterPair).sort((a, b) => b[1] - a[1]).slice(0, 20)) {
  console.log(`  ${v}\t${k}`);
}

// ─── summary JSON for STATE.md ─────────────────────────────────
const summary = {
  nodes: ids.length,
  edges: edgeList.length,
  idPatterns: idPat,
  clusters: clusterCount,
  cross,
  orphans: {
    notInTree: notInTree.length,
    noEdges: noEdges.length,
    bothMissingEdges: bothMissing,
    oneMissingEdges: oneMissing,
    notInTreeAndNoEdge: notInTreeAndNoEdge.length,
  },
  edgeDims: edgeDim,
  dupLabelGroups: dupLabels.length,
  dupJavaFqcn: dupJava.length,
};
fs.writeFileSync(
  path.join(ROOT, 'outputs', 'archaeology-summary.json'),
  JSON.stringify(summary, null, 2),
);
console.log('\nWrote outputs/archaeology-summary.json');
