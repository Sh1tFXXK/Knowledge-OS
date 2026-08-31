// 「最佳左前缀法则」笔记融合进知识系统（2026-08-31）
// 来源：Obsidian Vault/面试/mysql索引/介绍一下最佳左前缀法则.md
// 原则：读内容并进已有节点，不新建重复节点。
//  1) 笔记图片复制到 public/notes/mysql-index/（37 张既有卡已用 markdown 图片，走同一渲染链路）。
//  2) demo_composite_index（MySQL 组合索引实例）：并入最佳左前缀法则（三场景）+ 底层原理 + 图示。
//  3) 联合索引题答案补入笔记独有点：优化器自动重排（场景三）与跳列失效的 B+树解释。
//  4) concept_composite_index 本体已含「列顺序决定最左前缀匹配规则」，不再重复改动。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `fuse-leftmost-prefix-${ts}`);
mkdirSync(backupDir, { recursive: true });
copyFileSync(join(DATA, 'node-pool.json'), join(backupDir, 'node-pool.json'));
copyFileSync(join(DATA, 'questions.json'), join(backupDir, 'questions.json'));
console.log('backup ->', backupDir);

// 1) 图片入系统
const SRC_IMG = 'C:/Users/Administrator/Documents/Obsidian Vault/assest/Pasted image 20260511213043.png';
const IMG_REL = 'notes/mysql-index/leftmost-prefix-btree.png';
if (existsSync(SRC_IMG)) {
  mkdirSync(join('public', 'notes', 'mysql-index'), { recursive: true });
  copyFileSync(SRC_IMG, join('public', IMG_REL));
  console.log('image copied -> public/' + IMG_REL);
} else {
  console.log('image not found, card will reference textual description only');
}

const IMG_MD = existsSync(SRC_IMG) ? `\n\n![联合索引排序结构：先按 user_name 排序，user_name 相等的行内再按 user_age 排序](/${IMG_REL})` : '';

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const inst = pool['demo_composite_index'];
const def = inst.card.tabs.find((t) => t.id === 'def');
if (def.content.includes('最佳左前缀')) {
  console.log('already fused, skip');
} else {
  def.content = def.content.replace(
    '本节点是实例，其本体见「组合索引 / composite index」概念节点。',
    [
      '【最佳左前缀法则】',
      '使用联合索引时，where 条件需**从索引最左列开始、连续匹配、不跳列**：',
      '- 场景一：`WHERE user_name=\'tom\' AND user_age=17 AND user_level=\'A\'`——按索引顺序使用，三列全部命中；',
      "- 场景二：跳过最左列，`WHERE user_age=17 AND user_level='A'`——索引失效，用不到索引；",
      "- 场景三：`WHERE user_age=17 AND user_name='tom' AND user_level='A'`——书写顺序与索引（user_name, user_age, user_level）不一致但仍全列命中，因为 **MySQL 优化器会自动调整条件顺序**。",
      '【底层原理（B+树结构决定）】',
      '联合索引的排序规则：先对最左列排序，在最左列相等的基础上再对第二列排序（依此类推）。因此**最左列全局有序，第二列只在第一列相等的范围内局部有序**——跳过最左列直接按第二列查询时，B+ 树上无法定位，索引自然用不上。',
      '本节点是实例，其本体见「组合索引 / composite index」概念节点。',
    ].join('\n') + IMG_MD,
  );
  inst.card.rootContent = [inst.card.title || inst.label, ...inst.card.tabs.map((t) => t.content || '')].join(' ').replace(/\s+/g, ' ').trim();
  console.log('fused into demo_composite_index');
}

// 3) 联合索引题答案补笔记独有点
const qs = JSON.parse(readFileSync(join(DATA, 'questions.json'), 'utf8'));
const q = qs.find((x) => x.text.includes('联合索引是什么'));
if (q && !/优化器/.test(q.answer || '')) {
  q.answer = (q.answer || '')
    + '\n\n补充：若查询条件的书写顺序与索引顺序不一致（如 WHERE user_age=17 AND user_name=\'tom\' AND user_level=\'A\'），MySQL 优化器会自动调整条件顺序，仍能命中索引；但直接跳过最左列（只用 age、level 查询）则用不到索引——最左列才是全局有序的，第二列只在第一列相等的范围内局部有序（B+ 树结构决定）。';
  q.updatedAt = Date.now();
  console.log('question answer enriched:', q.id);
}

function atomicWrite(file, obj) {
  const tmp = join(DATA, `${file}.tmp-${process.pid}`);
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  renameSync(tmp, join(DATA, file));
}
atomicWrite('node-pool.json', pool);
atomicWrite('questions.json', qs);
console.log('fuse-leftmost-prefix complete');
