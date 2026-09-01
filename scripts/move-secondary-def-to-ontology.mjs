// 二级索引「定义」上移本体层（2026-09-01）
// 背景：聚簇笔记融合时，定义类内容（别名/体积/数量）随整卡写进了 demo_secondary_index，
//       但该节点在树里的唯一挂载点是 MVCC 子树（tree_mvcc_secondary_index_existing），
//       「索引 → 二级索引」容器下反而看不到定义。
// 定案（用户）：定义归本体（concept_secondary_index，挂载于 索引/二级索引）；
//               其余（对比、结构图等关联内容）留在 MVCC 挂载的 demo 节点。
// 动作：① demo_secondary_index def tab 移除「补充（面试笔记·聚簇 vs 非聚簇）」块（上移而非复制，避免双份）
//       ② concept_secondary_index def tab 追加判定标准句（与 concept_clustered_index 的判定标准对称）
//       ③ 两节点 rootContent 按 [title + 全部tabs] 重算
// 红线：不动 cmp / struct 两个 tab，不动 knowledge-edges，不动 tree-data。
// 用法：node scripts/move-secondary-def-to-ontology.mjs          # dry-run（默认，不改文件）
//       node scripts/move-secondary-def-to-ontology.mjs --apply  # 写入 data/node-pool.json

import { readFileSync, writeFileSync, renameSync } from 'fs';

const APPLY = process.argv.includes('--apply');
const MARK = '补充（面试笔记·聚簇 vs 非聚簇）';
const ONTO_MARK = '判定标准（聚簇 vs 非聚簇的一句话区别）';
const ONTO_APPEND = '\n\n判定标准（聚簇 vs 非聚簇的一句话区别）：叶节点**不**存放一整行记录，只存索引列与指向数据的引用。别名：**辅助索引**（auxiliary index）；一表仅一个聚簇索引，但可建多个二级索引，体积远小于聚簇索引。';

console.log(`== move-secondary-def-to-ontology ${APPLY ? '--apply（写入模式）' : 'dry-run（只读模式）'} ==`);

const file = 'data/node-pool.json';
const pool = JSON.parse(readFileSync(file, 'utf8'));
let dirty = false;

const regenRoot = n => {
  n.card.rootContent = [n.card.title || n.label, ...(n.card.tabs || []).map(t => t.content || '')]
    .join(' ').replace(/\s+/g, ' ').trim();
};

const findDef = id => {
  const n = pool[id];
  if (!n) { console.error('✗ 节点不存在:', id); process.exit(1); }
  const def = (n.card.tabs || []).find(t => t.id === 'def') || (n.card.tabs || [])[0];
  if (!def) { console.error('✗ 无 def tab:', id); process.exit(1); }
  return { n, def };
};

/* ① demo_secondary_index：移除 def 尾部的融合块（上移本体，避免双份） */
{
  const { n, def } = findDef('demo_secondary_index');
  const i = def.content.indexOf('\n**' + MARK + '**');
  if (i < 0) {
    console.log('· demo_secondary_index · def 已无融合块，跳过');
  } else {
    const removed = def.content.slice(i);
    if (!removed.includes('辅助索引') || !removed.includes('多个二级索引')) {
      console.error('✗ 融合块形状异常，中止（防误删）。前 80 字符: ' + removed.slice(0, 80));
      process.exit(1);
    }
    if (APPLY) {
      def.content = def.content.slice(0, i);
      regenRoot(n);
      dirty = true;
    }
    console.log(`${APPLY ? '✂' : '○'} demo_secondary_index · def 移除融合块（${removed.length} 字符，判定标准/别名/体积 上移本体）`);
    console.log('  → cmp「对比（InnoDB vs MyISAM）」、struct「结构图」保留不动（MVCC 挂载点不变）');
  }
}

/* ② concept_secondary_index：def 追加判定标准句（与 concept_clustered_index 对称） */
{
  const { n, def } = findDef('concept_secondary_index');
  if (def.content.includes(ONTO_MARK)) {
    console.log('· concept_secondary_index · def 已有判定标准句，跳过');
  } else {
    if (APPLY) {
      def.content += ONTO_APPEND;
      regenRoot(n);
      dirty = true;
    }
    console.log(`${APPLY ? '✚' : '○'} concept_secondary_index · def 追加判定标准句（叶不存整行/别名辅助索引/一聚簇多二级/体积小）`);
  }
}

if (APPLY) {
  if (!dirty) { console.log('✓ 无变更，不写文件'); process.exit(0); }
  const raw = readFileSync(file, 'utf8');
  const tmp = file + '.tmp-' + process.pid;
  writeFileSync(tmp, JSON.stringify(pool, null, 2) + (raw.endsWith('\n') ? '\n' : ''));
  renameSync(tmp, file);
  console.log('✅ written', file);
  console.log('下一步: git add data/node-pool.json scripts/move-secondary-def-to-ontology.mjs');
} else {
  console.log('\ndry-run 完毕，未改任何文件。确认后: node scripts/move-secondary-def-to-ontology.mjs --apply');
}
