// 「什么是覆盖索引」笔记融合（2026-08-31）
// 来源：Obsidian Vault/面试/mysql索引/什么是覆盖索引.md
// 归属：十一、索引 → 覆盖索引 → MySQL 覆盖索引（demo_covering_index）
// 新信息点：① 仅 B+Tree 索引可做覆盖索引（哈希索引不行）② EXPLAIN Extra 的 Using index 判据
//          ③ EXPLAIN 示例 SQL 与截图入库
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { join } from 'path';

const SRC_IMG = 'C:/Users/Administrator/Documents/Obsidian Vault/assest/Pasted image 20260511213718.png';
const IMG_REL = 'notes/mysql-index/covering-index-explain.png';
if (existsSync(SRC_IMG)) {
  mkdirSync(join('public', 'notes', 'mysql-index'), { recursive: true });
  copyFileSync(SRC_IMG, join('public', IMG_REL));
  console.log('image copied -> public/' + IMG_REL);
}

const pool = JSON.parse(readFileSync('data/node-pool.json', 'utf8'));
const inst = pool['demo_covering_index'];
const def = inst.card.tabs.find(t => t.id === 'def') || inst.card.tabs[0];

if (def.content.includes('Using index')) {
  console.log('already fused, skip');
} else {
  // 剥掉文档模板的「另请参见」尾巴再追加，保持卡面干净
  const tail = def.content.indexOf('\n\n另请参见');
  if (tail > 0) def.content = def.content.slice(0, tail);
  def.content += [
    '',
    '**要点**',
    '- MySQL **只有 B+Tree 索引能用作覆盖索引**——只有 B+ 树的叶子节点存储索引列值；哈希索引无法覆盖查询。',
    '- 实现方式：把被查询的字段建为普通索引或联合索引，查询即可直接从索引返回数据，无需经聚簇索引定位整行（避免回表）。',
    '- 判据：`EXPLAIN` 的 Extra 列出现 **Using index** 即表示命中覆盖索引，所需数据完全在索引中取得。',
    '- 示例：`EXPLAIN SELECT user_name, user_age, user_level FROM users WHERE user_name=\'tom\' AND user_age=17;`——三列都被 (user_name, user_age, …) 索引覆盖时不回表。',
    '',
    '![EXPLAIN 覆盖索引示例：Extra 列显示 Using index](/' + IMG_REL + ')',
  ].join('\n');
  inst.card.rootContent = [inst.card.title || inst.label, ...inst.card.tabs.map(t => t.content || '')].join(' ').replace(/\s+/g, ' ').trim();
  console.log('fused into demo_covering_index');
}

const tmp = 'data/node-pool.json.tmp-' + process.pid;
writeFileSync(tmp, JSON.stringify(pool, null, 2));
renameSync(tmp, 'data/node-pool.json');
console.log('fuse-covering-index complete');
