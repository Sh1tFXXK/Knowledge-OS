import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const legacyPath = process.argv.find((arg) => arg.startsWith('--legacy='))?.slice('--legacy='.length);
const apply = process.argv.includes('--apply');
if (!legacyPath) throw new Error('请通过 --legacy=<旧版 node-pool.json 路径> 指定用户提供的结构基线');

const poolPath = path.join(root, 'data', 'node-pool.json');
const governancePath = path.join(root, 'data', 'knowledge-governance.json');
const legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
const pool = JSON.parse(fs.readFileSync(poolPath, 'utf8'));
const governance = JSON.parse(fs.readFileSync(governancePath, 'utf8'));
const legacyMysql = legacy['n_8s66vwo1'];
const currentMysql = pool['n_8s66vwo1'];
const legacyView = legacyMysql?.viewDimensions?.find((view) => view.id === 'mysql_glossary_structure');
const currentViewIndex = currentMysql?.viewDimensions?.findIndex((view) => view.id === 'mysql_glossary_structure');
if (!legacyView || currentViewIndex === -1) throw new Error('未找到 MySQL 知识结构视图');

const redirects = new Map([
  ['mysql_glossary_java_uspy11', 'k_1782746457581_30q8ao'],
  ['mysql_glossary_servlet_12jp4v', 'k_1784340526295_skm8iw'],
  ['mysql_glossary_tomcat_10qwey', 'k_1786353277269_msn0ma9ap'],
]);
const historicalContextIds = new Set(['mysql_glossary_java_uspy11', 'k_dict_qttpkbhf', 'mysql_glossary_servlet_12jp4v', 'mysql_glossary_tomcat_10qwey']);

const oldToCanonical = (nodeId) => redirects.get(nodeId) ?? nodeId;
const restoredView = structuredClone(legacyView);
for (const section of restoredView.sections) {
  for (const atom of section.atoms) atom.nodeId = oldToCanonical(atom.nodeId);
}
currentMysql.viewDimensions[currentViewIndex] = restoredView;

const preservedContent = [];
for (const legacyId of historicalContextIds) {
  const canonicalId = oldToCanonical(legacyId);
  const legacyNode = legacy[legacyId];
  const canonicalNode = pool[canonicalId];
  if (!legacyNode || !canonicalNode) throw new Error(`缺少待合并节点：${legacyId} -> ${canonicalId}`);
  canonicalNode.card = canonicalNode.card ?? { nodeId: canonicalId, title: canonicalNode.label, tabs: [] };
  canonicalNode.card.tabs = canonicalNode.card.tabs ?? [];
  const tabId = `legacy-mysql-glossary-${legacyId}`;
  if (!canonicalNode.card.tabs.some((tab) => tab.id === tabId)) {
    const sourceContent = legacyNode.card?.rootContent ?? legacyNode.card?.tabs?.map((tab) => tab.content ?? '').filter(Boolean).join('\n\n') ?? '';
    canonicalNode.card.tabs.push({
      id: tabId,
      label: 'MySQL 术语来源',
      content: sourceContent,
    });
  }
  preservedContent.push({ legacyId, canonicalId });
  if (legacyId !== canonicalId && !pool[legacyId]) {
    pool[legacyId] = {
      ...structuredClone(legacyNode),
      status: 'archived-redirect',
      canonicalNodeId: canonicalId,
      redirectTo: canonicalId,
      tags: [...new Set([...(legacyNode.tags ?? []), 'archived-redirect'])],
    };
  }
}

governance.redirects = (governance.redirects ?? []).filter((entry) => entry.id !== 'redirect:k_dict_qttpkbhf');
for (const { legacyId, canonicalId } of preservedContent.filter((entry) => entry.legacyId !== entry.canonicalId)) {
  const record = {
    id: `redirect:${legacyId}`,
    from: legacyId,
    to: canonicalId,
    status: 'accepted',
    contentStatus: 'archived-redirect',
    rationale: '旧版 MySQL 知识结构中的同义节点已合并到现有规范实体；原术语正文作为“ MySQL 术语来源”标签保留，导航入口仍保留在原主题位置。',
  };
  const index = governance.redirects.findIndex((entry) => entry.id === record.id);
  if (index >= 0) governance.redirects[index] = record;
  else governance.redirects.push(record);
}

const report = {
  apply,
  restoredSectionCount: restoredView.sections.length,
  restoredAtomCount: restoredView.sections.reduce((count, section) => count + section.atoms.length, 0),
  preservedContent,
};
if (apply) {
  const backupDir = path.join(root, 'output', `mysql-legacy-view-content-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '')}`);
  fs.mkdirSync(backupDir, { recursive: true });
  fs.copyFileSync(poolPath, path.join(backupDir, 'node-pool.json'));
  fs.copyFileSync(governancePath, path.join(backupDir, 'knowledge-governance.json'));
  fs.writeFileSync(poolPath, JSON.stringify(pool, null, 2) + '\n', 'utf8');
  fs.writeFileSync(governancePath, JSON.stringify(governance, null, 2) + '\n', 'utf8');
}
console.log(JSON.stringify(report, null, 2));
