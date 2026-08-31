// 批量整理后收尾：剥离套话后出现的空卡检查与补齐
import { readFileSync, writeFileSync, renameSync } from 'fs';
const pool = JSON.parse(readFileSync('data/node-pool.json', 'utf8'));
const tree = JSON.parse(readFileSync('data/tree-data.json', 'utf8'));

const mounted = new Set();
(function w(n) { if (n.nodeRef) mounted.add(n.nodeRef); for (const c of (n.children || [])) w(c); })(tree);

// 1) MySQL 页 实例（模板剥离后仅剩标题）
{
  const p = pool['k_1787209372193_jgoudp'];
  const def = p.card.tabs.find(t => t.id === 'def') || p.card.tabs[0];
  if ((def.content || '').trim().length < 20) {
    def.content = 'InnoDB 磁盘管理的**最小物理单位**，默认 16KB（由 innodb_page_size 配置）。常见类型：数据页、索引页、undo 页、系统页等；行数据按页组织，缓冲池以页为单位在磁盘与内存间换入换出。';
    p.role = 'plain';
    p.card.rootContent = [p.card.title || p.label, ...p.card.tabs.map(t => t.content || '')].join(' ').replace(/\s+/g, ' ').trim();
    console.log('filled: MySQL 页');
  }
}

// 2) 挂在树上但 def 为空的卡
const empties = [];
(function w(n) {
  const p = pool[n.nodeRef];
  if (p && p.card && Array.isArray(p.card.tabs)) {
    const def = p.card.tabs.find(t => t.id === 'def') || p.card.tabs[0];
    const total = (p.card.tabs || []).reduce((s, t) => s + (t.content || '').length, 0);
    if (total === 0) empties.push({ id: p.id, label: p.label, ref: n.nodeRef });
  }
  for (const c of (n.children || [])) w(c);
})(tree);
console.log('树上仍空的卡:', empties.length);
for (const e of empties) console.log('  ', e.id, '|', e.label);

// 3) 池内未挂载但非归档的空卡（信息空缺，仅统计）
let orphanEmpty = 0;
for (const p of Object.values(pool)) {
  if (p.status === 'archived-redirect' || mounted.has(p.id)) continue;
  const total = (p.card?.tabs || []).reduce((s, t) => s + (t.content || '').length, 0);
  if (total === 0) orphanEmpty++;
}
console.log('未挂载且空卡（非归档）:', orphanEmpty);

const tmp = 'data/node-pool.json.tmp-' + process.pid;
writeFileSync(tmp, JSON.stringify(pool, null, 2));
renameSync(tmp, 'data/node-pool.json');
console.log('post-batch touchups complete');
