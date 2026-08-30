// 修复：移除已空的安全主题容器 mysql:theme:security-access
// 背景：peel-mysql-security.mjs 在 EMPTY_THEMES 检查该主题时它仍挂着 mysql_topic_security_auth，
// 而该 topic 在同轮稍后被移除，导致安全主题变空却未被清掉；它带 self-nodeRef，通用空容器清理也会跳过。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `peel-mysql-security-fix-${ts}`);
mkdirSync(backupDir, { recursive: true });
copyFileSync(join(DATA, 'tree-data.json'), join(backupDir, 'tree-data.json'));

const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
function walk(n, fn, parent) { fn(n, parent); for (const c of (n.children || [])) walk(c, fn, n); }
function findNode(id) { let hit = null; walk(tree, n => { if (!hit && n.id === id) hit = n; }); return hit; }

const THEME = 'mysql:theme:security-access';
const t = findNode(THEME);
if (!t) { console.log('theme already gone:', THEME); process.exit(0); }
if ((t.children || []).length > 0) { console.log('theme NOT empty, abort:', t.children.map(c => c.name)); process.exit(1); }

let removed = false;
walk(tree, (n, parent) => {
  if (parent && parent.children) {
    const i = parent.children.findIndex(c => c.id === THEME);
    if (i >= 0) { parent.children.splice(i, 1); removed = true; }
  }
});
console.log('removed empty security theme:', removed ? THEME : 'FAILED');

function atomicWrite(file, obj) {
  const tmp = join(DATA, `${file}.tmp-${process.pid}`);
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  renameSync(tmp, join(DATA, file));
}
atomicWrite('tree-data.json', tree);
console.log('peel-mysql-security-fix complete');
