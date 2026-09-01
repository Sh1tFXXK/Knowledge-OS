// 「说一下聚簇索引与非聚簇索引」笔记融合（2026-09-01）
// 来源：Obsidian Vault/面试/mysql索引/说一下聚簇索引与非聚簇索引？.md
// 归属：MySQL 索引域 → demo_clustered_index / demo_secondary_index / demo_myisam / concept_clustered_index
// 新信息点：① 判定标准——叶节点是否存放一整行记录 ② InnoDB 主键索引即表本身
//          ③ 二级索引=辅助索引、空间占比聚簇小 ④ MyISAM 双树并联·地址直达·无需访问主键树
//          ⑤ 两张原图入库（InnoDB 结构 / MyISAM 结构）+ 串联vs并联对比 mermaid
// 原则：tab 无固定词表，从知识本身切面；「已有补充」已覆盖的知识点不重复写入。
// 用法：node scripts/fuse-clustered-index.mjs          # dry-run（默认，不改文件）
//       node scripts/fuse-clustered-index.mjs --apply  # 写入 data/ 与 public/notes/

import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { join } from 'path';

const APPLY = process.argv.includes('--apply');
const MARK = '补充（面试笔记·聚簇 vs 非聚簇）';

const IMG_A = { src: 'C:/Users/Administrator/Documents/Obsidian Vault/assest/Pasted image 20260511214417.png', rel: 'notes/mysql-index/clustered-secondary-structure.png' };
const IMG_B = { src: 'C:/Users/Administrator/Documents/Obsidian Vault/assest/Pasted image 20260511214449.png', rel: 'notes/mysql-index/myisam-nonclustered-structure.png' };

const MER_SERIAL_PARALLEL = [
  '```mermaid',
  'graph LR',
  '    subgraph s1["InnoDB：树串联"]',
  '        S1["二级索引叶<br/>索引列+主键"] -->|"回表"| C1["聚簇索引叶<br/>整行记录"]',
  '    end',
  '    subgraph s2["MyISAM：树并联"]',
  '        S2["辅助键叶<br/>键+数据地址"] -->|"直达"| D1[("表数据")]',
  '        P2["主键叶<br/>主键+数据地址"] -->|"直达"| D1',
  '    end',
  '```',
].join('\n');

const BLOCK_CLUSTERED = [
  '',
  `**${MARK}**`,
  '- 判定标准：**叶节点是否存放一整行记录**——聚簇叶子存整行；非聚簇叶子只指向数据位置。',
  '- InnoDB 主键索引就是数据表本身：按主键顺序存放整张表数据，占用空间即整表数据量；通常说的「主键索引」就是聚集索引。',
].join('\n');

const BLOCK_SECONDARY = [
  '',
  `**${MARK}**`,
  '- 别名：**辅助索引**——根据索引列构建 B+Tree，叶子节点只存索引列和主键的信息。',
  '- 二级索引占用空间比聚簇索引小很多；一个表只能建一个聚簇索引，但可以创建多个二级索引。',
].join('\n');

const BLOCK_MYISAM = [
  '',
  `**${MARK}**`,
  '- MyISAM 不管主键索引还是二级索引，用的都是**非聚簇索引**（InnoDB 主键用的是聚簇索引）。',
  '- 两棵 B+ 树（主键树 / 辅助键树）节点结构完全一致，只是存储内容不同：主键索引树存主键，辅助键索引树存辅助键。',
  '- 表数据存储在独立的地方，两棵树的叶子节点都用一个**地址**指向真正的表数据；索引树彼此独立，辅助键检索**无需访问主键索引树**。',
].join('\n');

const BLOCK_CONCEPT = '\n\n判定标准（聚簇 vs 非聚簇的一句话区别）：**叶节点是否存放一整行记录**。';

const TAB_CMP = {
  id: 'cmp', label: '对比（InnoDB vs MyISAM）',
  content: `**二级索引的两种形态：InnoDB 树串联 vs MyISAM 树并联**

| | InnoDB（串联） | MyISAM（并联） |
|---|---|---|
| 二级索引叶子存 | 索引列 + 主键 | 辅助键 + 数据地址 |
| 取整行路径 | 回表（经聚簇索引） | 地址直达表数据 |
| 经过主键索引树 | 是 | 否 |
| 主键索引本身 | 聚簇索引（叶=整行） | 非聚簇索引（叶=地址） |

${MER_SERIAL_PARALLEL}

> 来源：面试笔记《说一下聚簇索引与非聚簇索引》——mermaid 为笔记文字重绘。`,
};

const TAB_STRUCT_SECONDARY = {
  id: 'struct', label: '结构图（面试笔记）',
  content: `**InnoDB 聚簇索引与二级索引结构（原图）**

![InnoDB 聚簇索引与二级索引结构](/${IMG_A.rel})

- 聚簇索引叶子 = 完整行记录（数据与索引合一）
- 二级索引叶子 = 索引列 + 主键 → 命中后拿主键回聚簇索引取整行（回表）`,
};

const TAB_STRUCT_MYISAM = {
  id: 'struct', label: '结构图（面试笔记）',
  content: `**MyISAM 非聚簇结构（原图）**

![MyISAM 主键索引与辅助键索引双树结构](/${IMG_B.rel})

- 主键索引 B+ 树节点存主键；辅助键索引 B+ 树节点存辅助键
- 两棵树叶子都用地址指向独立存放的表数据（双树并联，检索互不依赖）`,
};

const OPS = [
  { id: 'demo_clustered_index', check: MARK, append: BLOCK_CLUSTERED, tabs: [] },
  { id: 'demo_secondary_index', check: MARK, append: BLOCK_SECONDARY, tabs: [TAB_CMP, TAB_STRUCT_SECONDARY] },
  { id: 'demo_myisam', check: MARK, append: BLOCK_MYISAM, tabs: [TAB_STRUCT_MYISAM] },
  { id: 'concept_clustered_index', check: '叶节点是否存放一整行记录', append: BLOCK_CONCEPT, tabs: [] },
];

const NEW_EDGES = [
  { id: 'clustered_secondary_contrast_edge', source: 'demo_clustered_index', target: 'demo_secondary_index', type: 'contrasts-with', label: '聚簇 vs 非聚簇', dimensions: ['storage'] },
  { id: 'innodb_myisam_contrast_edge', source: 'demo_innodb', target: 'demo_myisam', type: 'contrasts-with', label: '聚簇 vs 非聚簇', dimensions: ['storage'] },
];

/* ---------- 执行 ---------- */

console.log(`== fuse-clustered-index ${APPLY ? '--apply（写入模式）' : 'dry-run（只读模式）'} ==`);

for (const { src, rel } of [IMG_A, IMG_B]) {
  if (!existsSync(src)) { console.error('✗ 缺图:', src); process.exit(1); }
  if (APPLY) {
    mkdirSync(join('public', 'notes', 'mysql-index'), { recursive: true });
    if (!existsSync(join('public', rel))) copyFileSync(src, join('public', rel));
    console.log('✚ image -> public/' + rel);
  } else {
    console.log('○ image -> public/' + rel + '（待 --apply）');
  }
}

const pool = JSON.parse(readFileSync('data/node-pool.json', 'utf8'));
const edges = JSON.parse(readFileSync('data/knowledge-edges.json', 'utf8'));

const regenRoot = n => {
  n.card.rootContent = [n.card.title || n.label, ...(n.card.tabs || []).map(t => t.content || '')]
    .join(' ').replace(/\s+/g, ' ').trim();
};

for (const op of OPS) {
  const n = pool[op.id];
  if (!n) { console.error('✗ 节点不存在:', op.id); process.exit(1); }
  n.card.tabs = n.card.tabs || [];
  const def = n.card.tabs.find(t => t.id === 'def') || n.card.tabs[0];
  if (!def) { console.error('✗ 无 def tab:', op.id); process.exit(1); }
  let dirty = false;
  if (!def.content.includes(op.check)) {
    if (APPLY) def.content += op.append;
    console.log(`${APPLY ? '✚' : '○'} ${op.id} · def 追加 ${op.append.split('\n').length} 行`);
    dirty = true;
  } else {
    console.log(`· ${op.id} · def 已融合，跳过`);
  }
  for (const t of op.tabs) {
    const ex = n.card.tabs.some(x => x.id === t.id || x.label === t.label);
    if (!ex) {
      if (APPLY) n.card.tabs.push(t);
      console.log(`${APPLY ? '✚' : '○'} ${op.id} · 新 tab「${t.label}」`);
      dirty = true;
    } else {
      console.log(`· ${op.id} · tab「${t.label}」已存在，跳过`);
    }
  }
  if (dirty && APPLY) regenRoot(n);
  if (dirty && !APPLY) console.log(`  → rootContent 将按 [title + 全部tabs] 重算`);
}

const pair = e => [e.source, e.target].sort().join('=>') + '|' + e.type;
const seen = new Set(edges.map(pair));
for (const ne of NEW_EDGES) {
  if (seen.has(pair(ne))) { console.log(`· 边 ${ne.source} — ${ne.target} 已存在，跳过`); continue; }
  if (APPLY) edges.push(ne);
  console.log(`${APPLY ? '✚' : '○'} 边: ${ne.source} —${ne.label}→ ${ne.target}`);
}

if (APPLY) {
  for (const [file, doc] of [['data/node-pool.json', pool], ['data/knowledge-edges.json', edges]]) {
    const raw = readFileSync(file, 'utf8');
    const tmp = file + '.tmp-' + process.pid;
    writeFileSync(tmp, JSON.stringify(doc, null, 2) + (raw.endsWith('\n') ? '\n' : ''));
    renameSync(tmp, file);
    console.log('✅ written', file);
  }
  console.log('\n下一步: git add data public scripts && git commit -m "Fuse clustered index interview notes"');
} else {
  console.log('\ndry-run 完毕，未改任何文件。确认后: node scripts/fuse-clustered-index.mjs --apply');
}
