// 清理：移除已空的 MySQL「SQL 与语言对象」主题容器（其子节点已全部迁到本体）。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';
const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `peel-mysql-sql-theme-clean-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
function walk(n, fn, parent) { fn(n, parent); for (const c of (n.children || [])) walk(c, fn, n); }
function findNode(id) { let hit = null; walk(tree, n => { if (!hit && n.id === id) hit = n; }); return hit; }
const theme = findNode('mysql:theme:sql-language');
if (!theme) { console.log('theme 已不存在，无需清理'); }
else if ((theme.children || []).length > 0) { console.log('theme 仍有子节点，不移除:', theme.children.map(c => c.name)); }
else {
  // 从父节点摘除
  let removed = false;
  walk(tree, (n, parent) => {
    if (parent && parent.children) {
      const i = parent.children.findIndex(c => c.id === 'mysql:theme:sql-language');
      if (i >= 0) { parent.children.splice(i, 1); removed = true; }
    }
  });
  console.log('已移除空主题容器 mysql:theme:sql-language:', removed);
}
function atomicWrite(file, obj) {
  const tmp = join(DATA, `${file}.tmp-${process.pid}`);
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  renameSync(tmp, join(DATA, file));
}
atomicWrite('tree-data.json', tree);
console.log('done');
