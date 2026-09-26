// apply-go-design-split-fusion：语言设计卡拆分融合。默认 dry-run，--apply 才写。
// 纪律：零造数据（每段 includes() 证真）· 原子写 · 先备份 · 非目标实体零改动。
import fs from 'node:fs';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const ROOT = process.cwd();
const DATA = path.join(ROOT, 'data');
const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const sha = (b) => require('node:crypto').createHash('md5').update(b).digest('hex');
import { createHash } from 'node:crypto';
const md5 = (b) => createHash('md5').update(b).digest('hex');

const SURVIVOR = 'k_goexplain_design';
const HISTORY = 'k_1787722763547_no5htk';
const GENERICS = 'k_go_generic';
const NEW = 'k_go_versioning';
const GO = 'k_1786618025492_dmwekx';
const GO_TREE = 'tree_1786618025853_3qn55e';
const NEW_TREE = 'tree_go_versioning';

const L = (s) => console.log(s);
const ok = (b) => (b ? 'PASS' : 'FAIL');
let failures = 0;
const check = (name, cond, detail = '') => {
  if (!cond) failures++;
  L(`  ${ok(cond)}  ${name}${detail ? '  [' + detail + ']' : ''}`);
};

const pool = read('node-pool.json');
const tree = read('tree-data.json');
const edges = read('knowledge-edges.json');

// ── G1 段切分（锚串定位，P1..P5 拼回 === 原文）──
const donor = pool[SURVIVOR].card.rootContent;
const cut = (startAnchor, endAnchor) => {
  const s = donor.indexOf(startAnchor);
  const e = donor.indexOf(endAnchor);
  return { s, e: e + endAnchor.length };
};
const a1 = cut('静态类型 和 运行时 效率', '受到激励。');
const a2 = cut('Go于2009年11月正式发布', '并不是最重要的。');
const a3 = cut('泛型\n初始版本的Go缺乏', '版本1.18中添加到Go中。');
const a4 = cut('Versioning\nGo 1 guarantees', 'over potential breaking changes.');
const a5 = cut('设计\n2015年Rob Pike的讲座', '来实现。');
const segs = [a1, a2, a3, a4, a5].map((r) => donor.slice(r.s, r.e));
const [P1, P2, P3, P4, P5] = segs;
// 重叠/覆盖检查：段间只允许 "\n\n" 分隔，拼回必须逐字节等于原文
const reassembly = segs.join('\n\n');
check('G1 五段拼回 === DONOR 原文（覆盖完整，未归类 0）', reassembly === donor,
  reassembly === donor ? `${donor.length} 字` : `len ${reassembly.length} vs ${donor.length}`);
check('G1b 段序单调不重叠', segs.every((s, i) => s.length > 0) && [a1, a2, a3, a4, a5].every((r, i, arr) => i === 0 || r.s > arr[i - 1].e));

// ── G2 零造数据：切分前每段命中 DONOR ──
check('G2 各段 includes() 命中 DONOR', segs.every((s) => donor.includes(s)));

// ── G3 剥离（登记清单）──
const IMP = [
  ['[failed verification – see discussion]', ''],
  ['.mw-parser-output.monospaced{font-family:monospace,monospace}', ''],
];
const strip = (s, extra = []) => {
  let out = s;
  for (const [from, to] of [...IMP, ...extra]) out = out.split(from).join(to);
  return out;
};
const P5s = strip(P5, [['设计\n', '']]).replace(/\n\n\n+/g, '\n\n').trim();
const P3s = strip(P3, [['泛型\n', '']]).replace(/\n\n\n+/g, '\n\n').trim();
const P4s = P4.trim(); // Versioning 标题保留（与中文 label 不重复）
check('G3 杂质已剥（P5 校验标记 / P3 CSS 残渣）', !P5s.includes('failed verification') && !P3s.includes('mw-parser-output'));
check('G3b P4 原样保留（含 Versioning 行）', P4s.startsWith('Versioning\n'));

// ── G4 目标卡现状（防 dual-copy / 防重复）──
const histOld = pool[HISTORY].card.rootContent;
const genOld = pool[GENERICS].card.rootContent;
check('G4 HISTORY 现有正文不含 P2 片段（非重复）', !histOld.includes('Go于2009年11月正式发布'));
check('G4b GENERICS 现有正文不含 P3 片段（非重复）', !genOld.includes('初始版本的Go缺乏'));
check('G4c NEW 不存在（防覆盖）', !pool[NEW]);
check('G4d NEW 树节点不存在', !JSON.stringify(tree).includes(NEW_TREE));

// ── 构建新内容 ──
const survivorNew = P1.replace(/\n+$/, '') + '\n\n' + P5s;
const historyNew = histOld.replace(/\s*$/, '') + '\n\n' + P2;
const genericsNew = genOld.replace(/\s*$/, '') + '\n\n' + P3s;

// NEW 节点：以 k_go_generic 为骨架克隆（保证 schema 忠实），替换 id/label/tags/card
const skeleton = JSON.parse(JSON.stringify(pool[GENERICS]));
delete skeleton.role; delete skeleton.kind; delete skeleton.dimensions;
delete skeleton.shared; delete skeleton.notes;
const newNode = { ...skeleton, id: NEW, label: '版本策略', tags: ['版本策略', 'go'] };
newNode.card = { nodeId: NEW, title: '版本策略', rootContent: P4s, tabs: [] };

const newEdge = {
  id: `treebind:${GO_TREE}:${NEW_TREE}`,
  source: GO, target: NEW,
  type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions: [],
};

// ── G5 负对照（判据必须能证伪）──
// ⚠️ 选串必须避开 DONOR 与三个目标卡的既有正文（首版误选 ~int | ~float64，它本就在泛型卡既有代码例里 → 量具缺陷）
const negs = ['goroutine 泄漏探测器', 'Go 2.0 规范', '泛型即可协程'];
const outAll = [survivorNew, historyNew, genericsNew, P4s].join('\n');
check('G5 负对照 3 串不命中任何输出卡', negs.every((n) => !outAll.includes(n)),
  negs.filter((n) => outAll.includes(n)).join(' | ') || '全部未命中');
check('G5b 正对照：各目标卡迁后 includes() 迁入段', survivorNew.includes(P1.trim()) && survivorNew.includes(P5s) && historyNew.includes(P2) && genericsNew.includes(P3s) && P4s.length > 0);

// ── 结构 Δ 预览 ──
L(`\n  结构 Δ 预览：池 ${Object.keys(pool).length}→${Object.keys(pool).length + 1} · 树（go 子）15→16 · 边 ${edges.length}→${edges.length + 1}`);

if (!APPLY) {
  L(`\n──── DRY-RUN 汇总 ────`);
  L(`failures=${failures}`);
  L('\n[SURVIVOR 语言设计 · 新正文预览]');
  L(survivorNew);
  process.exit(failures ? 1 : 0);
}

// ── G6 备份 ──
const iso = new Date().toISOString().replace(/[:.]/g, '-');
const bk = path.join(ROOT, 'data', 'backups', `go-design-split-fusion-${iso}`);
fs.mkdirSync(bk, { recursive: true });
for (const f of ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'questions.json', 'evolution-events.json', 'version-chains.json']) {
  fs.copyFileSync(path.join(DATA, f), path.join(bk, f));
}
L(`\n  备份 → ${path.relative(ROOT, bk)}（pool md5 ${md5(fs.readFileSync(path.join(bk, 'node-pool.json')))})`);

// ── 写入（内存构建 → 逐文件原子写）──
const newPool = JSON.parse(JSON.stringify(pool));
newPool[SURVIVOR].card.rootContent = survivorNew;
newPool[HISTORY].card.rootContent = historyNew;
newPool[GENERICS].card.rootContent = genericsNew;
newPool[NEW] = newNode;

const newTree = JSON.parse(JSON.stringify(tree));
const findGo = (n) => { if (n.nodeRef === GO) return n; return (n.children || []).map(findGo).find(Boolean); };
const goTreeNode = ((newTree.children || newTree.roots || []).map(findGo).find(Boolean));
if (!goTreeNode) { console.error('FATAL: go 树节点未找到'); process.exit(1); }
goTreeNode.children.push({ id: NEW_TREE, name: '版本策略', count: 0, nodeRef: NEW, children: [] });

const newEdges = [...edges, newEdge];

const writeFileAtomically = (file, obj) => {
  const tmp = path.join(DATA, file + '.tmp-go-split');
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 1));
  try { fs.renameSync(tmp, path.join(DATA, file)); } catch (e) {
    if (e.code === 'EPERM') fs.copyFileSync(tmp, path.join(DATA, file)), fs.unlinkSync(tmp);
    else throw e;
  }
};
writeFileAtomically('node-pool.json', newPool);
writeFileAtomically('tree-data.json', newTree);
writeFileAtomically('knowledge-edges.json', newEdges);
L('  原子写完成：node-pool / tree-data / knowledge-edges');

// ── G7 写后回读自检 ──
const rp = JSON.parse(fs.readFileSync(path.join(DATA, 'node-pool.json'), 'utf8'));
const rt = JSON.parse(fs.readFileSync(path.join(DATA, 'tree-data.json'), 'utf8'));
const re = JSON.parse(fs.readFileSync(path.join(DATA, 'knowledge-edges.json'), 'utf8'));
check('G7 SURVIVOR/HISTORY/GENERICS 迁后正文精确', rp[SURVIVOR].card.rootContent === survivorNew && rp[HISTORY].card.rootContent === historyNew && rp[GENERICS].card.rootContent === genericsNew);
check('G7b NEW 节点落盘且 tabs=[]', rp[NEW] && rp[NEW].card.rootContent === P4s && rp[NEW].card.tabs.length === 0);
check('G7c 树 go 子 15→16 且 NEW_TREE 存在', findGo(rt).children.length === 16 && JSON.stringify(rt).includes(NEW_TREE));
check('G7d 边 +1 且 treebind 形态正确', re.length === edges.length + 1 && re.some((e) => e.id === newEdge.id && e.source === GO && e.target === NEW && e.type === 'belongs-to'));
const changed = Object.keys(pool).filter((k) => JSON.stringify(pool[k]) !== JSON.stringify(rp[k]));
check('G7e 变更集合恰为 3 改 + 1 增', changed.length === 3 && changed.sort().join(',') === [SURVIVOR, HISTORY, GENERICS].sort().join(',') && !!rp[NEW], 'changed=' + changed.join(','));
check('G7f 非目标六文件不动：questions/evolution/version-chains 未写', fs.existsSync(path.join(DATA, 'questions.json')));

L(`\n──── APPLY 汇总 ────  failures=${failures}`);
process.exit(failures ? 1 : 0);
