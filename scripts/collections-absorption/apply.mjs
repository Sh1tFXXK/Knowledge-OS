// 集合框架内容吸收 — apply 脚本（D1=A 双删 / D2=删镜像tab / D3=Iterator加边界句 / D4=不引入BitSet）
// 用法: node scripts/collections-absorption/apply.mjs --data-dir <dir>
// 纪律: 先指向临时数据目录演练，验收后指向 data/ 真跑。
import fs from 'node:fs';
import path from 'node:path';

const argDir = process.argv[process.argv.indexOf('--data-dir') + 1];
if (!argDir) { console.error('missing --data-dir'); process.exit(1); }
const DATA = path.resolve(argDir);
const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const write = (f, o) => fs.writeFileSync(path.join(DATA, f), JSON.stringify(o, null, 2) + '\n', 'utf8');

const pool = read('node-pool.json');
const tree = read('tree-data.json');
const qs = read('questions.json');
const edges = read('knowledge-edges.json');
const now = Date.now();
const log = [];
const fail = (m) => { console.error('ASSERT FAIL: ' + m); process.exit(1); };

// ── 0. 质量断言工具 ──────────────────────────────────────────────
const FORBIDDEN = [/runoob/i, /序号.{0,12}类描述/, /<br>/, /cdn-mineru/];
const assertClean = (text, where) => {
  for (const re of FORBIDDEN) if (re.test(text)) fail(`${where} 含禁用工件 ${re}`);
};

// ── 1. 节点填充（定义→rootContent，原则7）────────────────────────
const FILLS = [
  ['k_1785747858308_aoqbr5', 'set', [
    'Iterator 是 Collection 体系的统一遍历接口：hasNext() 判断是否还有下一个元素，next() 取出下一个元素（游标后移），remove() 删除刚取出的元素（可选操作，须先 next）。',
    'Iterator 取代了传统 Enumeration（hasMoreElements/nextElement），额外提供 remove 语义，并采用 fail-fast 策略——遍历期间集合被结构性修改时抛出 ConcurrentModificationException。',
    'ListIterator 继承 Iterator、仅用于 List，新增 hasPrevious()/previous() 支持双向遍历，并提供 add/set 在遍历中修改列表。',
  ].join('\n')],
  ['k_1785742371669_zng9px', 'set', [
    'Comparator 是自定义排序策略接口：int compare(o1, o2) 返回负数/0/正数分别表示 o1 小于/等于/大于 o2。',
    '与 Comparable（compareTo，由类自身实现、定义唯一自然排序）相对，Comparator 在类外部定义、可对同一类提供多种排序规则。',
    '通过 Collections.sort(list, cmp)、TreeSet/TreeMap 构造参数传入生效；同时提供 Comparable 与 Comparator 时，Comparator 优先。',
  ].join('\n')],
  ['k_1785731277675_rog9oy', 'append',
    '\n\n底层由 HashMap 实例承载（元素作为 key 存储），增删查均摊 O(1)，不保证迭代顺序。需要顺序时选用 LinkedHashSet（保插入序）或 TreeSet（保排序，红黑树）。'],
  ['k_1785471820450_v6okms', 'set',
    'HashMap 的存储结构为「数组（哈希桶）+ 链表 + 红黑树」：key 经哈希定位桶，冲突元素挂入桶内链表；链表长度超过阈值（8）且容量足够时转为红黑树，将冲突链查找从 O(n) 降为 O(log n)。'],
];
for (const [id, mode, text] of FILLS) {
  const e = pool[id]; if (!e) fail(`填充目标缺失 ${id}`);
  assertClean(text, `fill ${id}`);
  if (mode === 'set') e.card.rootContent = text;
  else e.card.rootContent = (e.card.rootContent || '') + text;
  log.push(`fill ${id} (${e.label || e.card.title}) rootContent=${e.card.rootContent.length}字`);
}

// ── 2. 根节点：删镜像 tab，rootContent 压缩 3 句（D2）─────────────
{
  const e = pool['k_1785664228019_k7eq57']; if (!e) fail('根节点缺失');
  const tabs = e.card.tabs || [];
  if (tabs.length !== 1 || tabs[0].label !== '接口继承关系与实现') fail('根节点 tab 形态不符预期');
  if (tabs[0].content !== e.card.rootContent) fail('根节点镜像前置断言失败：tab 与 rootContent 不逐字节相同');
  e.card.tabs = [];
  e.card.rootContent = [
    '集合类存放于 java.util 包，按三种语义划分：set（集）、list（列表，含 Queue）与 map（映射）。',
    'Collection 侧由 Iterator 统一遍历，Map 侧自成体系（键值对、非 Iterable）。',
    '实现选型沿三个轴展开：有序性、查改效率、线程安全。',
  ].join('\n');
  log.push('root 集合框架: 删镜像tab(7645字), rootContent 压缩为3句');
}

// ── 3. 并入既有题（只改 answer/updatedAt；笔误修题干）─────────────
const MERGES = [
  ['q_1785470772832_pmbik3',
    '\n补充（实现类选型）：List 常用实现 ArrayList（随机访问快）/LinkedList（插入删除快）；Set 常用实现 HashSet（无序、O(1)）/LinkedHashSet（保插入序）/TreeSet（保排序）。'],
  ['q_1785470459454_t70ahn',
    '\n补充：ArrayList 基于动态数组、实现 RandomAccess，随机访问 O(1)；LinkedList 基于双向链表，随机访问 O(n)，但头尾插入删除 O(1)，且实现 Deque 可当队列/栈用。二者均不同步；多数场景默认选 ArrayList。'],
  ['q_1785747375387_2gd38c',
    '\n补充 LinkedHashSet 维度：三者均不允许重复元素。HashSet 无序、O(1)；LinkedHashSet 维护插入顺序、开销略高；TreeSet 基于红黑树保排序、O(log n)，要求元素可比较（Comparable 或传入 Comparator）。'],
  ['q_1785746257595_6wwncp',
    '\n补充（定位流程）：key.hashCode() 经扰动函数处理后在数组上定位桶；哈希冲突由桶内链表/红黑树承载（链表长度超 8 且容量足够时转红黑树）；查找先比 hash 再用 equals 判定命中；扩容为 2 倍并重新散列。'],
  ['q_1786353277269_msn0mabd2s',
    '\n补充：TreeMap/TreeSet 底层为红黑树，排序取自元素的 Comparable.compareTo 或构造时传入的 Comparator（Comparator 优先）；键不可为 null（无法比较）；增删查 O(log n)。'],
  ['q_1785747877571_y1yig4',
    '\n补充：ListIterator 继承 Iterator、仅用于 List，新增 hasPrevious()/previous() 支持双向遍历，并提供 add/set 在遍历中修改列表；Iterator 的 remove 是可选操作，调用前必须先 next。'],
  ['q_1785743459504_c240yt',
    '\n补充：Comparable 由类自身实现（compareTo），定义唯一自然排序；Comparator 在外部定义（compare），可对同一类提供多种排序策略。TreeSet/TreeMap/Collections.sort 同时拿到两者时 Comparator 优先。'],
  ['q_1786353277269_msn0mabe2t',
    '\n补充：Vector 因方法级同步开销大、且无法保证复合操作原子性，已被 ArrayList（单线程）/Collections.synchronizedList/CopyOnWriteArrayList（并发）取代，属遗留类，新代码不应使用。'],
];
for (const [id, add] of MERGES) {
  const q = qs.find(x => x.id === id); if (!q) fail(`并入目标题缺失 ${id}`);
  assertClean(add, `merge ${id}`);
  q.answer = (q.answer || '') + add;
  q.updatedAt = now;
  log.push(`merge ${id} answer=${q.answer.length}字`);
}
{ // 题干笔误：Listlterator → ListIterator（q_1785747877571_y1yig4）
  const q = qs.find(x => x.id === 'q_1785747877571_y1yig4');
  const fixed = q.text.replace(/Listlterator/g, 'ListIterator');
  if (fixed !== q.text) { q.text = fixed; log.push('fix 题干笔误 Listlterator→ListIterator'); }
}

// ── 4. 新增 5 题（Vector vs ArrayList 裁决为 q_1786353277269_msn0mabe2t 同指，不新增）──
const NEW_QS = [
  {
    text: 'WeakHashMap 的弱引用回收机制是怎样的？',
    kind: 'mechanism', difficulty: 'advanced', relatedNodeId: 'k_1785669852023_iqmbm3',
    sectionTitle: '集合实现类',
    answer: [
      'WeakHashMap 的 Entry 继承 WeakReference：键以弱引用持有（值仍为强引用）。',
      '当某个键不再被外部强引用时，GC 可回收该键对象，并把弱引用挂入引用队列。',
      '每次增删查前，WeakHashMap 轮询引用队列，摘除键已被回收的失效条目，使对应键值对随后被 GC 释放。',
      '常见陷阱：键看似仍在使用但条目提前消失；典型用途是以对象为键的缓存、监听器注册表。',
    ].join('\n'),
    answerSteps: [{ nodeId: 'k_1785669852023_iqmbm3', note: 'WeakHashMap 节点本体' }],
  },
  {
    text: 'Collections 工具类提供了哪些算法？如何使用？',
    kind: 'application', difficulty: 'basic', relatedNodeId: 'k_1785686741307_gi966e',
    sectionTitle: '集合算法',
    answer: [
      '排序：sort（自然序或传入 Comparator）、reverse、shuffle、swap、rotate。',
      '查找：binarySearch（要求列表已排序）、max、min、frequency。',
      '修改：fill、copy、replaceAll。',
      '视图与适配：unmodifiableXxx（只读包装）、synchronizedXxx（同步包装）、emptyList/emptySet/emptyMap、singleton。',
      '用法：Collections.sort(list) 按自然序排序；Collections.max(list, cmp) 按比较器取最大。',
    ].join('\n'),
    answerSteps: [{ nodeId: 'k_1785686741307_gi966e', note: 'Collections 节点本体' }],
  },
  {
    text: 'EMPTY_SET、EMPTY_LIST、EMPTY_MAP 常量有什么用？',
    kind: 'application', difficulty: 'intermediate', relatedNodeId: 'k_1785686741307_gi966e',
    sectionTitle: '集合算法',
    answer: [
      '三个常量是 Collections 暴露的类型安全空集合实例（泛型单例），用于以不可变空集合代替 null 返回值。',
      '收益：调用方免去 null 判空；单例复用免去反复新建空集合的分配。',
      '边界：它们不可变，add/remove 会抛 UnsupportedOperationException。',
    ].join('\n'),
    answerSteps: [{ nodeId: 'k_1785686741307_gi966e', note: 'Collections 节点本体' }],
  },
  {
    text: '用迭代器遍历集合的步骤是什么？hasNext/next 各做什么？',
    kind: 'application', difficulty: 'basic', relatedNodeId: 'k_1785747858308_aoqbr5',
    sectionTitle: '如何使用迭代器',
    answer: [
      '步骤：向集合对象取迭代器（iterator()）→ 用 hasNext() 循环判断是否还有下一个元素 → 每次 next() 取出元素并将游标后移。',
      'hasNext() 只探测不移动游标；next() 在 hasNext() 为假时调用会抛 NoSuchElementException。',
      '遍历中删除须用迭代器自身的 remove()（须先 next）；直接改集合会触发 fail-fast，抛 ConcurrentModificationException。',
    ].join('\n'),
    answerSteps: [{ nodeId: 'k_1785747858308_aoqbr5', note: 'Iterator 节点（本批次填充）' }],
  },
  {
    text: 'Hashtable 与 HashMap 有何区别？',
    kind: 'comparison', difficulty: 'basic', relatedNodeId: 'k_1785665455780_1bnf5j',
    sectionTitle: '集合实现类',
    answer: [
      '线程安全：Hashtable 方法级 synchronized，HashMap 不同步（并发应选 ConcurrentHashMap）。',
      'null 容忍：Hashtable 不允许 null 键和 null 值，HashMap 允许一个 null 键与多个 null 值。',
      '血缘：Hashtable 是 JDK 1.0 遗留类（继承 Dictionary），HashMap 是集合框架成员（继承 AbstractMap）。',
      '结论：新代码不应再使用 Hashtable。',
    ].join('\n'),
    answerSteps: [{ nodeId: 'k_1785665455780_1bnf5j', note: 'Hashtable 节点' }, { nodeId: 'k_1785463930010_invjhq', note: 'HashMap 节点' }],
  },
];
const SRC = { kind: 'document', sourceId: 'runoob:java-collections', sourceTitle: 'Java 集合框架 · 菜鸟教程' };
const newIds = [];
for (const q of NEW_QS) {
  assertClean(q.answer, 'newQ ' + q.text.slice(0, 12));
  const id = 'q_' + now + '_' + Math.random().toString(36).slice(2, 8);
  qs.push({ id, text: q.text, answered: true, relatedNodeId: q.relatedNodeId, createdAt: now, updatedAt: now,
    answer: q.answer, answerSteps: q.answerSteps, kind: q.kind, difficulty: q.difficulty,
    source: { ...SRC, sectionTitle: q.sectionTitle } });
  newIds.push(id);
  log.push('newQ ' + id + '「' + q.text.slice(0, 18) + '…」kind=' + q.kind);
}

// ── 5. 教程 dump 双删（D1=A）：备份原文 → 摘边 → 摘树 → 摘池实体 ──
const DUMPS = ['k_vault_javajava_15bnft', 'k_vault_javajava_ii523d'];
{
  const backup = { note: 'D1=A 删除前原文备份（追溯用，勿回灌）', deletedAt: new Date(now).toISOString(), entities: {} };
  for (const id of DUMPS) {
    const e = pool[id]; if (!e) fail('dump 实体缺失 ' + id);
    backup.entities[id] = e;
  }
  for (const fid of ['k_1785747858308_aoqbr5', 'k_1785742371669_zng9px']) {
    if (!pool[fid].card.rootContent) fail('分流未完成：' + fid + ' 仍为空壳，禁止删除');
  }
  const bkPath = path.join(DATA, 'backups', 'collections-dump-backup-' + now + '.json');
  fs.mkdirSync(path.dirname(bkPath), { recursive: true });
  fs.writeFileSync(bkPath, JSON.stringify(backup, null, 2) + '\n', 'utf8');
  log.push('dump 原文备份 → ' + bkPath);

  const before = edges.length;
  for (let i = edges.length - 1; i >= 0; i--) {
    const e = edges[i];
    if (DUMPS.includes(e.source) || DUMPS.includes(e.target)) edges.splice(i, 1);
  }
  log.push('edges: ' + before + ' → ' + edges.length + '（摘 ' + (before - edges.length) + ' 条）');

  const TREE_IDS = DUMPS.map(d => d.replace('k_', 'tree_'));
  let removedTree = 0;
  const strip = (n) => {
    if (!n.children) return;
    const b = n.children.length;
    n.children = n.children.filter(c => !TREE_IDS.includes(c.id));
    removedTree += b - n.children.length;
    n.children.forEach(strip);
  };
  strip(tree);
  if (removedTree !== 2) fail('树节点摘除数=' + removedTree + ' ≠ 2');

  for (const id of DUMPS) delete pool[id];
  log.push('pool: 摘除 2 实体（Java 集合框架 / Java 数据结构）');
}

// ── 6. 修 HashMap tab label 笔误 ──────────────────────────────────
{
  const e = pool['k_1785463930010_invjhq']; if (!e) fail('HashMap 实体缺失');
  const t = (e.card.tabs || []).find(t => t.label === 'LinkenHashMap');
  if (t) { t.label = 'LinkedHashMap'; log.push('fix tab label LinkenHashMap→LinkedHashMap'); }
  else log.push('note: HashMap 无 LinkenHashMap tab（跳过）');
}

// ── 7. 收尾断言 + 写盘 ───────────────────────────────────────────
{
  for (const q of qs) if (/^q_new_/.test(q.id)) fail('旧半拉子 id 混入: ' + q.id);
  let root = null;
  const walkR = (n) => { if (n.id === 'tree_1785252754835_b77vuj') root = n; (n.children || []).forEach(walkR); };
  walkR(tree);
  let cnt = 0; const col = (n) => { cnt++; (n.children || []).forEach(col); };
  col(root);
  if (cnt !== 47) fail('子树节点数=' + cnt + ' ≠ 47');
  write('node-pool.json', pool);
  write('tree-data.json', tree);
  write('questions.json', qs);
  write('knowledge-edges.json', edges);
  console.log(log.map(l => '  ✓ ' + l).join('\n'));
  console.log('\nAPPLY OK — ' + DATA + ' | 池实体=' + Object.keys(pool).length + ' | 题=' + qs.length + ' | 边=' + edges.length);
  console.log('新题 ids: ' + newIds.join(', '));
}

