import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');
export const DATA_DIR = path.join(PROJECT_ROOT, 'data');
export const GOVERNANCE_PATH = path.join(DATA_DIR, 'knowledge-governance.json');
export const CORE_DATA_FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'questions.json', 'timeline.json'];
const CONTENT_STATUSES = new Set(['draft', 'reviewed', 'canonical', 'archived-redirect']);
const PROJECTION_KINDS = new Set(['domain-view', 'topic-view', 'source-view', 'learning-view']);
const CANDIDATE_STATUSES = new Set(['proposed', 'accepted', 'rejected', 'superseded']);

function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
function writeJson(filePath, value) { fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function asArray(value) { return Array.isArray(value) ? value : Object.values(value ?? {}); }
function normalizedText(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function contentOf(node) { return (node?.card?.tabs ?? []).map((tab) => normalizedText(tab?.content)).filter(Boolean).join('\n'); }
function hasMeaningfulContent(node) { const content = contentOf(node); return Boolean(content) && !/^"?.+?"?\s*待补充内容。?$/u.test(content); }
function sourceFingerprint() { const hash = crypto.createHash('sha256'); for (const fileName of CORE_DATA_FILES) { hash.update(fileName); hash.update(fs.readFileSync(path.join(DATA_DIR, fileName))); } return `sha256:${hash.digest('hex')}`; }
function walkTree(root, visit, pathParts = []) { if (!root || typeof root !== 'object') return; const nextPath = [...pathParts, root.name ?? root.label ?? root.id]; visit(root, nextPath); for (const child of root.children ?? []) walkTree(child, visit, nextPath); }

export function indexTree(root) {
  const occurrences = new Map(); const treeNodesById = new Map();
  walkTree(root, (treeNode, nodePath) => { treeNodesById.set(treeNode.id, treeNode); if (!treeNode.nodeRef) return; const entries = occurrences.get(treeNode.nodeRef) ?? []; entries.push({ treeNodeId: treeNode.id, path: nodePath }); occurrences.set(treeNode.nodeRef, entries); });
  return { occurrences, treeNodesById };
}
function countNodeReferences(questions, timeline) {
  const references = new Map(); const add = (nodeId) => { if (nodeId) references.set(nodeId, (references.get(nodeId) ?? 0) + 1); };
  for (const question of asArray(questions)) { add(question.nodeRef); add(question.knowledgeNodeId); for (const step of question.answerSteps ?? []) { add(step.nodeRef); add(step.knowledgeNodeId); } }
  for (const entry of asArray(timeline)) { add(entry.nodeRef); add(entry.knowledgeNodeId); for (const snapshot of entry.snapshots ?? []) { add(snapshot.nodeRef); add(snapshot.knowledgeNodeId); } }
  return references;
}
function degreeByNode(edges) { const degree = new Map(); for (const edge of edges) for (const nodeId of [edge.source, edge.target]) if (nodeId) degree.set(nodeId, (degree.get(nodeId) ?? 0) + 1); return degree; }
function suggestedPath(nodeId, node) {
  const label = normalizedText(node.label); const tags = new Set((node.tags ?? []).map(normalizedText)); const dimensions = new Set(node.dimensions ?? []);
  const exact = {
    demo_btree: ['计算机科学', '数据库', '索引与访问路径'], demo_composite_index: ['计算机科学', '数据库', '索引与访问路径'], demo_snapshot: ['计算机科学', '数据库', 'MySQL', 'InnoDB', 'MVCC 与一致性读'], demo_vchain_sys: ['计算机科学', '数据库', 'MySQL', 'InnoDB', 'MVCC 与版本链'], mysql_runtime_files: ['计算机科学', '数据库', 'MySQL', '服务端运行时', '运行时文件'], mysql_file_pid: ['计算机科学', '数据库', 'MySQL', '服务端运行时', '运行时文件'], mysql_file_socket: ['计算机科学', '数据库', 'MySQL', '服务端运行时', '运行时文件'], react_import_aliasing: ['计算机科学', '编程语言', 'JavaScript', 'React', '模块导入导出'], demo_join: ['计算机科学', '数据库', 'SQL', '查询', '连接'], demo_subquery: ['计算机科学', '数据库', 'SQL', '查询', '子查询'], demo_postgres: ['计算机科学', '数据库', '数据库系统', 'PostgreSQL'],
  };
  if (exact[nodeId]) return { pathHint: exact[nodeId], confidence: 'high', rule: 'reviewed-explicit-mapping' };
  if (tags.has('mysql-glossary') || nodeId.startsWith('mysql_glossary_')) return { pathHint: ['计算机科学', '数据库', 'MySQL', '术语库'], confidence: 'medium', rule: 'mysql-glossary-source-view' };
  if (dimensions.has('transaction')) return { pathHint: ['计算机科学', '数据库', '事务与并发'], confidence: 'medium', rule: 'dimension-transaction' };
  if (dimensions.has('storage')) return { pathHint: ['计算机科学', '数据库', '存储与索引'], confidence: 'medium', rule: 'dimension-storage' };
  if (/Java/u.test(label)) return { pathHint: ['计算机科学', '编程语言', 'Java'], confidence: 'medium', rule: 'label-java' };
  return { pathHint: [], confidence: 'review', rule: 'manual-triage-required' };
}
function duplicateTypedPairs(edges) { const groups = new Map(); for (const edge of edges) { const key = [edge.source, edge.target, edge.type, edge.relationKind ?? ''].join('\u0000'); const values = groups.get(key) ?? []; values.push(edge); groups.set(key, values); } return [...groups.values()].filter((group) => group.length > 1); }

export function createEmptyGovernance() {
  return { schemaVersion: '1.0.0', description: 'Knowledge governance sidecar. This file records proposed canonical placements, navigation projections, merge plans, and redirects without rewriting node-pool, tree-data, or knowledge-edges.', policy: { canonicalParent: { maxPerNode: 1, allowUnassigned: true, requiredForStatuses: ['canonical'] }, projection: { doesNotCreateContainment: true, allowedKinds: [...PROJECTION_KINDS] }, merge: { requiresReferenceRedirectPlan: true, requiresContentPreservation: true, retainLegacyRedirect: true, physicalDeletionAllowed: false }, contentStatuses: [...CONTENT_STATUSES] }, placements: [], projections: [], mergePlans: [], redirects: [], audit: { generatedAt: null, sourceFingerprint: null, summary: null } };
}
export function loadSystemData(root = PROJECT_ROOT) {
  const dataDir = path.join(root, 'data'); return { nodePool: readJson(path.join(dataDir, 'node-pool.json')), tree: readJson(path.join(dataDir, 'tree-data.json')), edges: readJson(path.join(dataDir, 'knowledge-edges.json')), questions: readJson(path.join(dataDir, 'questions.json')), timeline: readJson(path.join(dataDir, 'timeline.json')) };
}
export function generateGovernanceCandidates(data, existing = createEmptyGovernance()) {
  const { nodePool, tree, edges, questions, timeline } = data; const { occurrences } = indexTree(tree); const degree = degreeByNode(edges); const references = countNodeReferences(questions, timeline); const placements = []; const projections = [];
  for (const [fallbackId, node] of Object.entries(nodePool)) {
    const nodeId = node.id ?? fallbackId; if (node.status === 'archived-redirect' || occurrences.has(nodeId) || !hasMeaningfulContent(node)) continue; const linked = (degree.get(nodeId) ?? 0) + (references.get(nodeId) ?? 0); if (linked === 0) continue; const suggestion = suggestedPath(nodeId, node);
    placements.push({ id: `placement:${nodeId}`, nodeId, status: 'proposed', contentStatus: suggestion.confidence === 'review' ? 'reviewed' : 'canonical', canonicalParentNodeId: null, pathHint: suggestion.pathHint, confidence: suggestion.confidence, rule: suggestion.rule, rationale: `节点具有正文，且存在 ${degree.get(nodeId) ?? 0} 条关系端点与 ${references.get(nodeId) ?? 0} 个题目/时间线引用，但尚未进入导航树。` });
    if (suggestion.rule === 'mysql-glossary-source-view') projections.push({ id: `projection:source:mysql-glossary:${nodeId}`, nodeId, status: 'proposed', kind: 'source-view', view: 'mysql-glossary', rationale: '保留原始术语和来源，在来源视图中可达；不创建第二个规范包含关系。' });
  }
  for (const [nodeId, entries] of occurrences) {
    const domainPaths = new Map(); for (const entry of entries) { const domain = entry.path[1] ?? entry.path[0]; const values = domainPaths.get(domain) ?? []; values.push(entry.path); domainPaths.set(domain, values); } if (domainPaths.size < 2) continue;
    for (const [domain, paths] of domainPaths) projections.push({ id: `projection:domain:${nodeId}:${crypto.createHash('sha1').update(domain).digest('hex').slice(0, 10)}`, nodeId, status: 'proposed', kind: 'domain-view', view: domain, sourcePaths: paths, rationale: '该节点跨顶层领域出现；应先人工确定唯一规范归属，其余入口作为导航投影保留。' });
  }
  const mergePlans = duplicateTypedPairs(edges).map((group) => { const [keep, ...duplicates] = [...group].sort((left, right) => left.id.localeCompare(right.id)); return { id: `edge-dedup:${crypto.createHash('sha1').update(group.map((edge) => edge.id).sort().join('|')).digest('hex').slice(0, 12)}`, status: 'proposed', entityKind: 'edge', canonicalId: keep.id, redundantIds: duplicates.map((edge) => edge.id), preservation: { preserveProvenance: true, preserveDimensions: true, requiresReferenceRedirectPlan: false }, rationale: `检测到相同来源、目标、类型与关系种类的 ${group.length} 条边；应合并其来源信息后再归档冗余边。` }; });
  const summary = { activeOrphanPlacementCandidates: placements.length, sourceViewProjectionCandidates: projections.filter((candidate) => candidate.kind === 'source-view').length, crossDomainProjectionCandidates: projections.filter((candidate) => candidate.kind === 'domain-view').length, duplicateRelationMergeCandidates: mergePlans.length };
  return { ...existing, placements, projections, mergePlans, redirects: existing.redirects ?? [], audit: { generatedAt: new Date().toISOString(), sourceFingerprint: sourceFingerprint(), summary } };
}
export function validateGovernance(governance, data) {
  const errors = []; const warnings = []; const { nodePool, tree, edges } = data; const { occurrences } = indexTree(tree); const edgeIds = new Set(edges.map((edge) => edge.id)); const seenPlacementNodes = new Map(); const seenIds = new Set(); const assertUniqueId = (item, collection) => { if (!item?.id) errors.push(`${collection} contains an item without id`); else if (seenIds.has(item.id)) errors.push(`duplicate governance id: ${item.id}`); else seenIds.add(item.id); };
  if (!governance || governance.schemaVersion !== '1.0.0') errors.push('schemaVersion must be 1.0.0'); if (governance?.policy?.merge?.physicalDeletionAllowed !== false) errors.push('physical deletion must remain disabled in the governance policy');
  for (const placement of governance?.placements ?? []) { assertUniqueId(placement, 'placements'); if (!nodePool[placement.nodeId]) errors.push(`placement references missing node: ${placement.nodeId}`); if (!CANDIDATE_STATUSES.has(placement.status)) errors.push(`placement ${placement.id} has invalid status`); if (!CONTENT_STATUSES.has(placement.contentStatus)) errors.push(`placement ${placement.id} has invalid contentStatus`); if (placement.canonicalParentNodeId && !nodePool[placement.canonicalParentNodeId]) errors.push(`placement ${placement.id} references missing canonical parent: ${placement.canonicalParentNodeId}`); if (placement.status === 'accepted' && !placement.canonicalParentNodeId) warnings.push(`accepted placement ${placement.id} still needs canonicalParentNodeId before tree migration`); const current = seenPlacementNodes.get(placement.nodeId) ?? 0; seenPlacementNodes.set(placement.nodeId, current + 1); }
  for (const [nodeId, count] of seenPlacementNodes) if (count > 1) errors.push(`node has multiple placement candidates: ${nodeId}`);
  for (const projection of governance?.projections ?? []) { assertUniqueId(projection, 'projections'); if (!nodePool[projection.nodeId]) errors.push(`projection references missing node: ${projection.nodeId}`); if (!PROJECTION_KINDS.has(projection.kind)) errors.push(`projection ${projection.id} has invalid kind`); if (!CANDIDATE_STATUSES.has(projection.status)) errors.push(`projection ${projection.id} has invalid status`); }
  for (const plan of governance?.mergePlans ?? []) { assertUniqueId(plan, 'mergePlans'); if (!CANDIDATE_STATUSES.has(plan.status)) errors.push(`merge plan ${plan.id} has invalid status`); const source = plan.entityKind === 'edge' ? edgeIds : new Set(Object.keys(nodePool)); if (!source.has(plan.canonicalId)) errors.push(`merge plan ${plan.id} has missing canonical id: ${plan.canonicalId}`); const redirects = new Map((plan.edgeRedirects ?? []).map((redirect) => [redirect.from, redirect.to])); for (const redundantId of plan.redundantIds ?? []) { if (plan.status === 'accepted') { if (source.has(redundantId)) errors.push(`accepted merge plan ${plan.id} still retains redundant id: ${redundantId}`); else if (redirects.get(redundantId) !== plan.canonicalId) errors.push(`accepted merge plan ${plan.id} lacks redirect for merged id: ${redundantId}`); } else if (!source.has(redundantId)) errors.push(`merge plan ${plan.id} references missing redundant id: ${redundantId}`); } }
  for (const redirect of governance?.redirects ?? []) { assertUniqueId(redirect, 'redirects'); if (!nodePool[redirect.from] || !nodePool[redirect.to]) errors.push(`redirect ${redirect.id} must refer to existing nodes`); if (redirect.from === redirect.to) errors.push(`redirect ${redirect.id} cannot target itself`); }
  const unmanagedReferencedNodes = [...occurrences.keys()].filter((nodeId) => !nodePool[nodeId]); if (unmanagedReferencedNodes.length) errors.push(`tree still references ${unmanagedReferencedNodes.length} missing nodes`);
  return { valid: errors.length === 0, errors, warnings };
}
function printJson(value) { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); }
function runCli() { const command = process.argv[2] ?? 'audit'; const data = loadSystemData(); const governance = fs.existsSync(GOVERNANCE_PATH) ? readJson(GOVERNANCE_PATH) : createEmptyGovernance(); if (command === 'generate-candidates') { const next = generateGovernanceCandidates(data, governance); const result = validateGovernance(next, data); if (!result.valid) throw new Error(`Generated governance is invalid:\n${result.errors.join('\n')}`); writeJson(GOVERNANCE_PATH, next); printJson({ command, wrote: path.relative(PROJECT_ROOT, GOVERNANCE_PATH), summary: next.audit.summary, warnings: result.warnings }); return; } if (command === 'validate') { printJson({ command, ...validateGovernance(governance, data) }); return; } if (command === 'audit') { const result = validateGovernance(governance, data); printJson({ command, valid: result.valid, errors: result.errors, warnings: result.warnings, governance: governance.audit, policy: governance.policy }); return; } throw new Error(`Unknown command: ${command}`); }
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runCli();
