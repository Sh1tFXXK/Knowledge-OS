// 目录容器数据修复（2026-08-30）
// 背景：split-undefined-to-go（8/26）生成的章节容器没有 id/nodeRef；「数据库」「MySQL」
// 的 id 也丢失。findTreeNodeById 曾以 undefined 匹配到第一个无 id 节点，导致用户重命名
// 目录时误改了「数据库」节点（树名与池 label 均变成「数据库事务」）。
// 修复：
//  1) 恢复「数据库」树名与池 label/card.title（nodeRef n_u4va719e）。
//  2) 为 22 个无 id 树节点补稳定 id（数据库恢复 demo_db；章节 chapter_db_01..20；MySQL tree_ 前缀）。
//  3) 为 24 个无 nodeRef 容器创建池节点卡（role subsystem，卡内列出一子级主题），
//     树 nodeRef 指向新卡，点击即有索引视图，重命名也会同步池 label。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `fix-tree-containers-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));

// ---------- 1) 恢复被误改名的「数据库」 ----------
const dbEntry = (() => { let hit = null; (function w(n) { if (n.nodeRef === 'n_u4va719e' && !hit) hit = n; for (const c of (n.children || [])) w(c); })(tree); return hit; })();
if (!dbEntry) throw new Error('数据库 tree entry not found');
dbEntry.name = '数据库';
const dbNode = pool['n_u4va719e'];
dbNode.label = '数据库';
if (dbNode.card) {
  dbNode.card.title = '数据库';
  dbNode.card.rootContent = [dbNode.card.title || dbNode.label, ...dbNode.card.tabs.map((t) => t.content || '')].join(' ').replace(/\s+/g, ' ').trim();
}
console.log('restored: 树/池 label 数据库事务 -> 数据库');

// ---------- 2) 补 id ----------
let assigned = 0;
(function assignIds(n) {
  if (n.id == null) {
    if (n.nodeRef === 'n_u4va719e') n.id = 'demo_db';
    else if (n.nodeRef) n.id = 'tree_' + n.nodeRef;
    assigned++;
  }
  for (const c of (n.children || [])) assignIds(c);
})(tree);
console.log('assigned fallback ids:', assigned);

// 章节容器编号 id（chapter_db_01..20，按树中顺序）
let chIdx = 0;
const chapterEntries = [];
(function walk(n) {
  for (const c of (n.children || [])) {
    if (/^[一二三四五六七八九十]+、/.test(c.name) && c.id == null) {
      chIdx += 1;
      c.id = `chapter_db_${String(chIdx).padStart(2, '0')}`;
      chapterEntries.push(c);
    }
    walk(c);
  }
})(tree);
console.log('chapter ids assigned:', chapterEntries.length);

// ---------- 3) 为无 nodeRef 容器创建池节点卡 ----------
let created = 0;
(function createCards(n) {
  if (!n.nodeRef) {
    const poolId = 'container:' + n.id;
    if (!pool[poolId]) {
      const kids = (n.children || []).map((c) => c.name);
      const summary = kids.length
        ? `本节点是导航容器，聚合 ${kids.length} 个子主题：${kids.slice(0, 6).join('、')}${kids.length > 6 ? '等' : ''}。点击子节点查看具体内容。`
        : '本节点是导航容器，暂无子节点。';
      pool[poolId] = {
        id: poolId,
        label: n.name,
        role: 'subsystem',
        dimensions: [],
        tags: [n.name],
        card: {
          nodeId: poolId,
          title: n.name,
          tabs: [{ id: 'def', label: '定义', content: `**${n.name}**\n${summary}` }],
          rootContent: '',
        },
      };
      pool[poolId].card.rootContent = [n.name, summary].join(' ').replace(/\s+/g, ' ').trim();
      created++;
    }
    n.nodeRef = poolId;
  }
  for (const c of (n.children || [])) createCards(c);
})(tree);
console.log('container pool cards created:', created);

// ---------- 校验 ----------
let noId = 0, noRef = 0;
(function check(n) {
  if (n.id == null) noId++;
  if (n.nodeRef == null) noRef++;
  if (n.nodeRef && !pool[n.nodeRef]) throw new Error(`nodeRef dangling: ${n.name} -> ${n.nodeRef}`);
  for (const c of (n.children || [])) check(c);
})(tree);
console.log(`校验: 缺 id=${noId}, 缺 nodeRef=${noRef}`);

// ---------- 写回 ----------
function atomicWrite(file, obj) {
  const tmp = join(DATA, `${file}.tmp-${process.pid}`);
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  let ok = false;
  for (let i = 0; i < 8 && !ok; i++) {
    try { renameSync(tmp, join(DATA, file)); ok = true; }
    catch (err) {
      if (i === 7) throw err;
      console.log(`rename ${file} busy, retry ${i + 1}/7...`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
    }
  }
}
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
console.log('fix-tree-containers complete');
