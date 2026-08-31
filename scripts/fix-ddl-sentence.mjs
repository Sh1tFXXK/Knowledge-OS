// 修复被 shell 反引号替换破坏的 DDL 说明句（2026-08-31）
import { readFileSync, writeFileSync, renameSync } from 'fs';
const pool = JSON.parse(readFileSync('data/node-pool.json', 'utf8'));
const inst = pool['mysql:sql:ddl'];
const def = inst.card.tabs.find((t) => t.id === 'def');
const broken = '注意： 属于 DDL——它的工作方式与  不同（逐行删除、可回滚），即使最终效果相似。';
const fixed = '注意：TRUNCATE 属于 DDL——它的工作方式与 DELETE FROM table_name 不同（TRUNCATE 重建结构、不可逐行回滚；DELETE 逐行删除），即使最终效果相似。';
if (!def.content.includes(broken)) throw new Error('broken sentence not found');
def.content = def.content.replace(broken, fixed);
inst.card.rootContent = [inst.card.title || inst.label, ...inst.card.tabs.map((t) => t.content || '')].join(' ').replace(/\s+/g, ' ').trim();
const tmp = 'data/node-pool.json.tmp-' + process.pid;
writeFileSync(tmp, JSON.stringify(pool, null, 2));
renameSync(tmp, 'data/node-pool.json');
console.log('fixed sentence:', JSON.stringify(def.content.slice(def.content.indexOf('注意：'), def.content.indexOf('注意：') + 130)));
