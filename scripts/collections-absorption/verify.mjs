// 集合框架内容吸收 — 独立验证（只读，对演练或真数据目录跑）
// 用法: node scripts/collections-absorption/verify.mjs --data-dir <dir> [--backup <backup.json>]
import fs from 'node:fs';
import path from 'node:path';

const ai = process.argv.indexOf('--data-dir');
const DATA = path.resolve(process.argv[ai + 1]);
const bi = process.argv.indexOf('--backup');
const BACKUP = bi > -1 ? path.resolve(process.argv[bi + 1]) : null;
const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));

const pool = read('node-pool.json');
const tree = read('tree-data.json');
const qs = read('questions.json');
const edges = read('knowledge-edges.json');

let pass = 0, failed = 0;
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✅ ' + name); } else { failed++; console.log('  ❌ ' + name); } };

// ── V1 dump 双删 ──
ok(!pool['k_vault_javajava_15bnft'] && !pool['k_vault_javajava_ii523d'], 'V1a dump 池实体已摘除');
let dumpInTree = 0;
const scan = (n) => { if (/vault_javajava_(15bnft|ii523d)/.test((n.id || '') + (n.nodeRef || ''))) dumpInTree++; (n.children || []).forEach(scan); };
scan(tree);
ok(dumpInTree === 0, 'V1b dump 树节点已摘除');
ok(!edges.some(e => /vault_javajava_(15bnft|ii523d)/.test(JSON.stringify(e))), 'V1c dump 相关边已摘除');

// ── V2 空壳消失 + 填充到位 ──
const fillChecks = [
  ['k_1785747858308_aoqbr5', ['Iterator', 'Enumeration', 'fail-fast', 'ListIterator']],
  ['k_1785742371669_zng9px', ['Comparator', 'compare', 'Comparable']],
  ['k_1785731277675_rog9oy', ['HashMap', 'LinkedHashSet', 'TreeSet']],
  ['k_1785471820450_v6okms', ['红黑树', '链表', '哈希']],
];
for (const [id, needles] of fillChecks) {
  const rc = (pool[id] && pool[id].card.rootContent) || '';
  ok(rc.length > 80 && needles.every(w => rc.includes(w)), 'V2 填充 ' + id + ' (' + rc.length + '字)');
}

// ── V3 根节点：镜像 tab 已删 + 3 句压缩 ──
{
  const e = pool['k_1785664228019_k7eq57'];
  ok((e.card.tabs || []).length === 0, 'V3a 根节点镜像 tab 已删');
  const rc = e.card.rootContent || '';
  ok(rc.length < 300 && rc.includes('java.util') && rc.includes('Iterator') && rc.includes('Map'), 'V3b rootContent 压缩 3 句 (' + rc.length + '字)');
}
// ── V4 并入题追加 + 笔误 ──
{
  const m = (id, needle) => { const q = qs.find(x => x.id === id); ok(q && (q.answer || '').includes(needle), 'V4 并入 ' + id + ' 含「' + needle + '」'); };
  m('q_1785470772832_pmbik3', '补充（实现类选型）');
  m('q_1785470459454_t70ahn', 'LinkedList 基于双向链表');
  m('q_1785747375387_2gd38c', 'LinkedHashSet');
  m('q_1785746257595_6wwncp', '扰动函数');
  m('q_1786353277269_msn0mabd2s', '红黑树');
  m('q_1785747877571_y1yig4', 'ListIterator 继承 Iterator');
  m('q_1785743459504_c240yt', 'Comparator 优先');
  m('q_1786353277269_msn0mabe2t', 'Vector 因方法级同步');
  const qy = qs.find(x => x.id === 'q_1785747877571_y1yig4');
  ok(qy && !/Listlterator/.test(qy.text), 'V4b 题干笔误 Listlterator 已修');
  const hm = pool['k_1785463930010_invjhq'];
  ok(hm && !(hm.card.tabs || []).some(t => t.label === 'LinkenHashMap') && (hm.card.tabs || []).some(t => t.label === 'LinkedHashMap'), 'V4c tab label 笔误已修');
}

// ── V5 新增 5 题（schema + 质检断言）──
{
  const news = qs.filter(q => q.source && q.source.sourceId === 'runoob:java-collections');
  ok(news.length === 5, 'V5a 新增题数=5（实际 ' + news.length + '）');
  const KINDS = ['definition', 'mechanism', 'comparison', 'application', 'troubleshooting', 'recall'];
  const DIFFS = ['basic', 'intermediate', 'advanced'];
  for (const q of news) {
    ok(q.answered === true && KINDS.includes(q.kind) && DIFFS.includes(q.difficulty) && q.answer && q.answer.length > 60,
      'V5b schema ' + q.id + ' kind=' + q.kind);
    ok(!/序号.{0,12}类描述/.test(q.answer) && !/<br>/.test(q.answer),
      'V5c 质检 ' + q.id + ' answer 无序号表格/<br> 工件');
    ok(pool[q.relatedNodeId], 'V5d relatedNodeId 存活 ' + q.id);
    ok((q.answerSteps || []).every(s => pool[s.nodeId]), 'V5e answerSteps 引用存活 ' + q.id);
  }
}

// ── V6 全局一致性 ──
{
  const qIds = new Set(); let dup = 0;
  for (const q of qs) { if (qIds.has(q.id)) dup++; qIds.add(q.id); }
  ok(dup === 0, 'V6a 题库 id 无重复（共 ' + qs.length + ' 题）');
  let orphanRefs = 0;
  for (const q of qs) if (q.relatedNodeId && !pool[q.relatedNodeId]) orphanRefs++;
  ok(orphanRefs === 0, 'V6b 题库 relatedNodeId 无悬挂');
}

// ── V7 孤儿单元扫描（零实质信息损失，需 --backup）──
if (BACKUP && fs.existsSync(BACKUP)) {
  const backup = JSON.parse(fs.readFileSync(BACKUP, 'utf8'));
  const dumpText = Object.values(backup.entities || {}).map(e =>
    (e.card && e.card.rootContent || '') + '\n' + ((e.card && e.card.tabs) || []).map(t => t.content || '').join('\n')).join('\n');

  // 删除后语料 = 集合框架子树全部正文 + 全部题 answer
  let corpus = '';
  let root = null;
  const walkR = (n) => { if (n.id === 'tree_1785252754835_b77vuj') root = n; (n.children || []).forEach(walkR); };
  walkR(tree);
  const col = (n) => {
    const e = pool[n.nodeRef];
    if (e && e.card) corpus += (e.card.rootContent || '') + '\n' + ((e.card.tabs || []).map(t => t.content || '').join('\n'));
    (n.children || []).forEach(col);
  };
  col(root);
  corpus += qs.map(q => (q.answer || '')).join('\n');

  // dump 切成信息单元（>20 字、去图片/代码块/纯表格线），逐单元看关键词是否已在语料有落点
  const units = dumpText.split(/\n+/).map(s => s.trim())
    .filter(s => s.length > 20 && !/^!\[|cdn-mineru|```|^\|(\s*[-:]+)\|/.test(s));
  const keywordsOf = (s) => [...new Set((s.match(/[A-Za-z][A-Za-z0-9_]{2,}|[一-龥]{4,}/g) || []))]
    .filter(w => !/集合|框架|方法|元素|接口|实现|可以|通过|使用|进行|时候|如果|因为|所以|一个|没有|这个|那个|它们|自己|已经/.test(w));
  let covered = 0, orphaned = [];
  for (const u of units) {
    const kws = keywordsOf(u);
    if (kws.length === 0) { covered++; continue; }
    const hit = kws.some(k => corpus.includes(k));
    if (hit) covered++;
    else orphaned.push({ text: u.slice(0, 60), kws: kws.slice(0, 5) });
  }
  console.log('\n── V7 孤儿扫描：单元=' + units.length + ' 有落点=' + covered + ' 孤儿=' + orphaned.length + ' ──');
  orphaned.forEach(o => console.log('    孤儿: ' + o.text + ' … kw=[' + o.kws.join(',') + ']'));

  // 实质知识点逐条验收（report.md 追问复核列出的实质孤儿清单）
  const has = (kw) => corpus.includes(kw);
  const points = [
    ['迭代器 hasNext/next/remove', () => has('hasNext') && has('remove')],
    ['ListIterator 双向遍历', () => has('双向') && has('ListIterator')],
    ['Enumeration 被取代（D3 边界句）', () => has('Enumeration') && has('取代')],
    ['EMPTY_* 常量', () => has('EMPTY_SET') || has('emptyList')],
    ['Vector 过时/同步', () => has('Vector') && has('同步')],
    ['Hashtable 不允许 null', () => has('Hashtable') && has('null')],
    ['WeakHashMap 弱引用', () => has('WeakHashMap') && has('弱引用')],
    ['UnsupportedOperationException 语义', () => has('UnsupportedOperationException')],
    ['Collections sort/max/min', () => has('sort') && has('max')],
    ['Comparable vs Comparator', () => has('Comparable') && has('Comparator')],
    ['HashSet/LinkedHashSet/TreeSet 三选型', () => has('LinkedHashSet') && has('TreeSet')],
    ['HashMap 链表+红黑树结构', () => has('红黑树') && has('链表')],
  ];
  for (const [name, fn] of points) ok(fn(), 'V7 知识点落点: ' + name);
}

console.log('\nVERIFY: pass=' + pass + ' fail=' + failed);
process.exit(failed ? 1 : 0);

