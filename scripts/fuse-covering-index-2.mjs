// 覆盖索引卡补齐笔记独有点（第二轮）
// 已核对：Using index 判据、普通/联合索引可充当、宽度权衡 均已在卡内；
// 缺：① 仅 B+Tree 可做覆盖索引 ② EXPLAIN 示例 SQL ③ 配图。
import { readFileSync, writeFileSync, renameSync } from 'fs';

const pool = JSON.parse(readFileSync('data/node-pool.json', 'utf8'));
const inst = pool['demo_covering_index'];
const def = inst.card.tabs.find(t => t.id === 'def') || inst.card.tabs[0];

if (def.content.includes('B+Tree 索引能用作覆盖索引')) {
  console.log('already complete');
} else {
  def.content += [
    '',
    '**补充（笔记）**',
    '- MySQL **只有 B+Tree 索引能用作覆盖索引**——只有 B+ 树的叶子节点存储索引列值，哈希索引不行。',
    '- 示例：`EXPLAIN SELECT user_name, user_age, user_level FROM users WHERE user_name=\'tom\' AND user_age=17;`——三列全被联合索引覆盖时 Extra 显示 Using index，无需回表。',
    '',
    '![EXPLAIN 覆盖索引示例：Extra 列显示 Using index](/notes/mysql-index/covering-index-explain.png)',
  ].join('\n');
  inst.card.rootContent = [inst.card.title || inst.label, ...inst.card.tabs.map(t => t.content || '')].join(' ').replace(/\s+/g, ' ').trim();
  console.log('appended: B+Tree-only + example SQL + image');
}

const tmp = 'data/node-pool.json.tmp-' + process.pid;
writeFileSync(tmp, JSON.stringify(pool, null, 2));
renameSync(tmp, 'data/node-pool.json');
console.log('done');
