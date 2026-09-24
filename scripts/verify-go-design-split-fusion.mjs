// verify-go-design-split-fusion：独立验证（不 import apply，从备份快照反推）。
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const bkDir = fs.readdirSync(path.join(ROOT, 'data', 'backups')).filter((d) => d.startsWith('go-design-split-fusion-')).sort().pop();
if (!bkDir) { console.error('FATAL: 找不到本批备份'); process.exit(1); }
const BK = path.join(ROOT, 'data', 'backups', bkDir);
const rd = (base, f) => JSON.parse(fs.readFileSync(path.join(base, f), 'utf8'));
const before = { pool: rd(BK, 'node-pool.json'), tree: rd(BK, 'tree-data.json'), edges: rd(BK, 'knowledge-edges.json') };
const after = { pool: rd(path.join(ROOT, 'data'), 'node-pool.json'), tree: rd(path.join(ROOT, 'data'), 'tree-data.json'), edges: rd(path.join(ROOT, 'data'), 'knowledge-edges.json') };

const L = (s) => console.log(s);
const ok = (b) => (b ? 'PASS' : 'FAIL');
let failures = 0;
const check = (name, cond, detail = '') => { if (!cond) failures++; L(`  ${ok(cond)}  ${name}${detail ? '  [' + detail + ']' : ''}`); };

const SURVIVOR = 'k_goexplain_design', HISTORY = 'k_1787722763547_no5htk', GENERICS = 'k_go_generic', NEW = 'k_go_versioning', GO = 'k_1786618025492_dmwekx';

// ── V1 独立重切分（从 before DONOR 反推，锚串独立写一遍）──
const donor = before.pool[SURVIVOR].card.rootContent;
const idx = (a) => donor.indexOf(a);
const cuts = [
  ['静态类型 和 运行时 效率', '受到激励。'],
  ['Go于2009年11月正式发布', '并不是最重要的。'],
  ['泛型\n初始版本的Go缺乏', '版本1.18中添加到Go中。'],
  ['Versioning\nGo 1 guarantees', 'over potential breaking changes.'],
  ['设计\n2015年Rob Pike的讲座', '来实现。'],
].map(([s, e]) => donor.slice(idx(s), idx(e) + e.length));
const [P1, P2, P3, P4, P5] = cuts;
check('V1 五段独立重切拼回 === before DONOR', cuts.join('\n\n') === donor, `${donor.length} 字`);

// ── V2 期望值独立构建（剥杂质规则独立重写；⚠️ split 第二参是 limit，必须 rm() 两参固定）──
const rm = (s, x) => s.split(x).join('');
const P5s = rm(rm(P5, '[failed verification – see discussion]'), '设计\n').replace(/\n{3,}/g, '\n\n').trim();
const P3s = rm(rm(P3, '.mw-parser-output.monospaced{font-family:monospace,monospace}'), '泛型\n').replace(/\n{3,}/g, '\n\n').trim();
const survivorNew = P1.replace(/\n+$/, '') + '\n\n' + P5s;
const historyNew = before.pool[HISTORY].card.rootContent.replace(/\s*$/, '') + '\n\n' + P2;
const genericsNew = before.pool[GENERICS].card.rootContent.replace(/\s*$/, '') + '\n\n' + P3s;

// ── V3 逐实体结果 ──
check('V3 SURVIVOR 正文 = P1 + P5（剥后）', after.pool[SURVIVOR].card.rootContent === survivorNew);
check('V3b HISTORY 正文 = 旧89字 + P2（旧文逐字节保留）', after.pool[HISTORY].card.rootContent === historyNew && after.pool[HISTORY].card.rootContent.startsWith(before.pool[HISTORY].card.rootContent.replace(/\s*$/, '')));
check('V3c GENERICS 正文 = 旧620字 + P3（旧文逐字节保留）', after.pool[GENERICS].card.rootContent === genericsNew && after.pool[GENERICS].card.rootContent.startsWith(before.pool[GENERICS].card.rootContent.replace(/\s*$/, '')));
check('V3d NEW 节点 = P4（Versioning 原文含标题行）', after.pool[NEW] && after.pool[NEW].card.rootContent === P4.trim() && after.pool[NEW].label === '版本策略' && after.pool[NEW].card.tabs.length === 0);
check('V3e NEW tags 沿库内惯例', JSON.stringify(after.pool[NEW].tags) === JSON.stringify(['版本策略', 'go']));

// ── V4 零造数据负对照 ──
const outAll = [after.pool[SURVIVOR].card.rootContent, after.pool[HISTORY].card.rootContent, after.pool[GENERICS].card.rootContent, after.pool[NEW].card.rootContent].join('\n');
check('V4 负对照 3 串不命中', ['goroutine 泄漏探测器', 'Go 2.0 规范', '泛型即可协程'].every((n) => !outAll.includes(n)));
check('V4b 杂质全库输出卡零残留', !outAll.includes('failed verification') && !outAll.includes('mw-parser-output'));

// ── V5 变更集合恰为 3 改 + 1 增 ──
const added = Object.keys(after.pool).filter((k) => !before.pool[k]);
const removed = Object.keys(before.pool).filter((k) => !after.pool[k]);
const modified = Object.keys(before.pool).filter((k) => after.pool[k] && JSON.stringify(before.pool[k]) !== JSON.stringify(after.pool[k]));
check('V5 池 Δ = +1/-0/3 改', added.length === 1 && added[0] === NEW && removed.length === 0 && modified.length === 3 && [SURVIVOR, HISTORY, GENERICS].every((k) => modified.includes(k)), `added=${added} modified=${modified.join(',')}`);
check('V5b 池 3871→3872', Object.keys(before.pool).length === 3871 && Object.keys(after.pool).length === 3872);

// ── V6 树/边 ──
const goBefore = (function f(t) { if (t.nodeRef === GO) return t; return (t.children || []).map(f).find(Boolean); })(before.tree);
const goAfter = (function f(t) { if (t.nodeRef === GO) return t; return (t.children || []).map(f).find(Boolean); })(after.tree);
check('V6 go 子 15→16 且新叶子正确', goBefore.children.length === 15 && goAfter.children.length === 16 && goAfter.children.some((c) => c.nodeRef === NEW && c.name === '版本策略' && (c.children || []).length === 0));
// V6b 真断言：把 after 树中 go 的新叶子摘掉后，整棵树必须与 before 逐字节等价（⚠️ 在克隆上摘除，勿改原对象）
const afterTreeSpliced = JSON.parse(JSON.stringify(after.tree));
const gaSpliced = (function f(t) { if (t.nodeRef === GO) return t; return (t.children || []).map(f).find(Boolean); })(afterTreeSpliced);
gaSpliced.children = gaSpliced.children.filter((c) => c.nodeRef !== NEW);
check('V6b 摘除新叶子后整树与 before 逐字节等价（树除 go 子外零改动）', JSON.stringify(afterTreeSpliced) === JSON.stringify(before.tree));
const beforeEdges = before.edges.length, afterEdges = after.edges.length;
const newEdge = after.edges.find((e) => e.id === `treebind:tree_1786618025853_3qn55e:tree_go_versioning`);
check('V6c 边 4161→4162 且形态正确', beforeEdges === 4161 && afterEdges === 4162 && newEdge && newEdge.source === GO && newEdge.target === NEW && newEdge.type === 'belongs-to' && newEdge.relationKind === 'structure');
check('V6d 既有边零改动', before.edges.every((e) => { const w = after.edges.find((x) => x.id === e.id); return w && JSON.stringify(w) === JSON.stringify(e); }));

L(`\n──── VERIFY 汇总 ────  failures=${failures}`);
process.exit(failures ? 1 : 0);
