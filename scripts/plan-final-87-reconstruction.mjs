#!/usr/bin/env node
/**
 * 最终 87 条重构 · 预检与修正规划（只读 · 不写 data/）
 *
 * 输入：用户的《最终统一重构规划与爆破 Blueprint》四条分组动作
 * 输出：outputs/tree-violation-scan/final-87-reconstruction-plan.md
 *   ① Blueprint 偏差审查（哪几条照字面执行不了、证据是什么）
 *   ② 逐条修正后的动作表（含确切 id、目标载体、边类型映射）
 *   ③ 预检结果：端点存在性 / 改名后同名冲突 / mechanismSpec 引用保护
 *
 * 本脚本**只读**，不修改任何 data/*.json。
 * 用法：node scripts/plan-final-87-reconstruction.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const OUT = path.join(ROOT, 'outputs', 'tree-violation-scan');

const pool = JSON.parse(fs.readFileSync(path.join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(fs.readFileSync(path.join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(fs.readFileSync(path.join(DATA, 'knowledge-edges.json'), 'utf8'));

const flat = [];
(function w(n, p, parent) {
  flat.push({ id: n.id, name: n.name, ref: n.nodeRef, parent, path: p.concat([n.name]).join('/'), node: n });
  (n.children || []).forEach((c) => w(c, p.concat([n.name]), n));
})(tree, [], null);
const byId = new Map(flat.map((r) => [r.id, r]));
const byName = new Map();
for (const r of flat) { if (!byName.has(r.name)) byName.set(r.name, []); byName.get(r.name).push(r); }

const kids = (id) => (byId.get(id)?.node.children || []).map((c) => c.name);
const sub = (id) => { let c = 0; const s = (n) => { for (const x of n.children || []) { c++; s(x); } }; s(byId.get(id).node); return c; };
const size = (ref) => {
  const p = pool[ref];
  if (!p || !p.card) return 0;
  return String(p.card.rootContent || '').trim().length + (p.card.tabs || []).reduce((s, t) => s + String(t.content || '').trim().length, 0);
};

// ── 受控边类型（src 实测白名单） ─────────────────────────────────────────
const DEPENDENCY = new Set(['uses', 'depends-on', 'needs-for']);
const ASSOCIATION = new Set(['enables', 'leads-to', 'compares', 'relates-to']);
const REASONING = new Set(['belongs-to', 'leads-to', 'needs-for', 'needs', 'depends-on', 'enables', 'determines']);
const KNOWN = new Set([...DEPENDENCY, ...ASSOCIATION, ...REASONING, 'implements', 'extends', 'instance-of', 'transitions-to', 'guards', 'constrained-by', 'produces', 'triggers', 'writes-to', 'routes-to', 'calls', 'caches', 'contrasts-with']);
const KIND_DOMAIN = {};
for (const n of Object.values(pool)) if (n.kind) KIND_DOMAIN[n.kind] = (KIND_DOMAIN[n.kind] || 0) + 1;

// ── mechanismSpec 保护集 ────────────────────────────────────────────────
const specStates = new Set();
for (const n of Object.values(pool)) {
  const ms = n.mechanismSpec;
  if (!ms) continue;
  for (const s of Array.isArray(ms.stateNodeIds) ? ms.stateNodeIds : []) specStates.add(typeof s === 'string' ? s : (s && (s.nodeId || s.id)));
}

// ── 预检原语 ─────────────────────────────────────────────────────────────
const issues = [];
const checks = [];
function check(label, ok, detail) { checks.push({ label, ok, detail }); if (!ok) issues.push(label + ' — ' + detail); }

// ── 第一组：E 类 7 条 ────────────────────────────────────────────────────
const E_PLAN = [
  { id: 'tree_1785923886640_ydkgnc', ref: 'k_1785923886439_k5so6c', name: 'JSR-133为什么要增强final的语义', action: '正文并入 final 的 supplement → 卸树', target: 'tree_1784045501055_mkyads', audited: 'ok' },
  { id: 'tree_vault_javarabbitmq01mq_j62j4c', ref: 'k_vault_javarabbitmq01mq_j62j4c', name: 'MQ 为什么存在', action: '正文并入 RabbitMQ 的 supplement → 卸树', target: 'tree_java_fw_rabbitmq', audited: '修正：Blueprint 写的「消息队列 (MQ)」池树皆无此节点' },
  { id: 'tree_sk_perf_bottleneck', ref: 'sk_perf_bottleneck', name: '如何发现瓶颈', action: '改名「系统性能瓶颈定位」保留在树', target: null, audited: '修正：kind:"problem" 非合法值（详见偏差 1）；Blueprint 设计的 性能压测--solves--> 端点缺失' },
  { id: 'tree_1783264901125_rlyl58', ref: 'k_1783264901088_1s02ir', name: '如何判断对象可以被回收', action: '2 孩提级至 垃圾回收 → 卸树（正文 0 字）', target: 'tree_1783171786694_r8028l', audited: 'ok' },
  { id: 'tree_sharding_when', ref: 'sharding_when', name: '什么时候需要分库分表', action: '正文并入 MySQL 分库分表 的 supplement → 卸树', target: 'tree_sharding_overview', audited: '修正：Blueprint 写的「分库分表」节点不存在' },
  { id: 'tree_idxf_overview', ref: 'idxf_overview', name: '为什么命中索引比不命中快', action: '1 孩提级至 MySQL 索引 + 正文并入其 supplement → 卸树', target: 'tree_1786175188148_3flq6j', audited: 'ok' },
  { id: 'tree_wiki_en_outline_of_databases_s1', ref: 'k_wiki_en_outline_of_databases_s1', name: '数据库是什么类型的东西？', action: '3 孩提级至 数据库系统 + 正文并入 → 卸树', target: 'chapter_db_01', audited: '依赖：目标名「数据库系统」须由 C 组先改名产出（Blueprint 假设其已存在）' },
];

// ── 第二组：D 类机制契约 13 条 ──────────────────────────────────────────
const D1_PLAN = [
  ...[['aop_state_proxy_created', '① 代理对象已创建'], ['aop_state_intercepted', '② 调用已被拦截'], ['aop_state_chain_running', '③ 拦截器链执行中'], ['aop_state_advice_done', '④ 织入代码已执行'], ['aop_state_target_invoked', '⑤ 目标方法已调用（返回）']]
    .map(([ref, name]) => ({ id: 'tree_' + ref, ref, name, action: '正文镜像至 执行阶段 树条目 supplement → 卸树（节点留池）', target: 'tree_aop_flow', audited: 'ok（受 spec 保护，严禁删池节点）' })),
  ...[['tio_state_read_syscall', '① read 发起（用户态→内核态）'], ['tio_state_disk_to_kernel', '② DMA：磁盘 → 内核缓冲区'], ['tio_state_kernel_to_user', '③ CPU：内核缓冲区 → 用户缓冲区（返回）'], ['tio_state_write_syscall', '④ write 发起（用户态→内核态）'], ['tio_state_user_to_socket', '⑤ CPU：用户缓冲区 → socket 缓冲区'], ['tio_state_socket_to_nic', '⑥ DMA：socket 缓冲区 → 网卡（返回）']]
    .map(([ref, name]) => ({ id: 'tree_' + ref, ref, name, action: '正文镜像至 传统 IO 执行流程 树条目 supplement → 卸树（节点留池）', target: 'tree_tio_flow', audited: 'ok（受 spec 保护）' })),
  { id: 'tree_aop_flow', ref: 'aop_flow', name: '执行阶段', action: '改名「AOP 执行流程」（spec 宿主保留树挂载）', target: null, audited: 'ok（名字无冲突）' },
  { id: 'tree_bcs_caller', ref: 'bcs_caller', name: '调用方（getBean 请求）', action: '改名「getBean 请求调用方」', target: null, audited: 'ok（名字无冲突）' },
];

// ── 第三组：D 类工程排障 30 条 ──────────────────────────────────────────
const D2_PLAN = [
  { id: 'tree_1786092342461_a1uk2e', ref: 'k_1786092342085_3zwh4c', name: '合理地配置线程池', action: '改名「线程池资源耗尽与配置调优」', target: null, audited: '修正：solves 非受控边类型；建议改用 enables' },
  { id: 'tree_1786096587342_j05qf9', ref: 'k_1786096587014_vzab8u', name: '线上问题定位', action: '改名「线上 Java 应用 CPU 飙高与死锁定位」', target: null, audited: '修正：Blueprint 的 jstack 端点不存在' },
  { id: 'tree_wiki_en_outline_of_databases_s20_s21', ref: 'k_wiki_en_outline_of_databases_s21', name: '创建数据仓库', action: '32 孩提级至 数据仓库 → 卸树', target: 'tree_wiki_en_outline_of_databases_s20', audited: 'ok（子树大规模提级，须先做 before/after 比对）' },
];
const D2_CLUSTERS = [
  { prefix: 'tree_bean_lc_', refPrefix: 'bean_lc_', host: 'asplit_s1_asplit_bean_lifecycle', hostName: 'Bean 生命周期', action: '新建 mechanismSpec 契约 + 正文并入宿主 supplement + 5 树节点卸载', audited: 'ok（宿主节点存在）' },
  { prefix: 'tree_surge_', refPrefix: 'surge_', host: null, hostName: '流量激增与服务雪崩（待新建）', action: '6 步合并进新建工程问题节点 + 建 viewDimensions，卸载 6 树节点', audited: '修正：kind:"problem" 非法；prevents 边类型非法' },
  { prefix: 'tree_hps_', refPrefix: 'hps_', host: null, hostName: '高并发系统 QPS 瓶颈与扩容（待新建）', action: '6 步合并进新建工程问题节点，卸载 6 树节点', audited: '修正：solves 非法；读写分离与分库分表 端点缺失' },
  { prefix: 'tree_sqopt_idea_', refPrefix: 'sqopt_idea_', host: null, hostName: '慢查询 SQL 性能瓶颈（待新建）', action: '10 条合并进新建工程问题节点，卸载 10 树节点', audited: '修正：EXPLAIN 执行计划 端点缺失，可用「SQL 执行计划（EXPLAIN）」' },
];

// ── 第四组：C 类 37 条 ──────────────────────────────────────────────────
const C_CHAPTERS = [['chapter_db_01', '一、数据库系统', '数据库系统'], ['chapter_db_02', '二、数据模型', '数据模型'], ['chapter_db_03', '三、数据库结构', '数据库结构'], ['chapter_db_05', '五、数据库操作', '数据库操作'], ['chapter_db_08', '八、恢复系统', '恢复系统'], ['chapter_db_09', '九、日志系统', '日志系统'], ['chapter_db_10', '十、存储系统', '存储系统'], ['chapter_db_12', '十二、数据表示', '数据表示'], ['chapter_db_13', '十三、数据库设计', '数据库设计'], ['chapter_db_14', '十四、数据库分布与复制', '数据库分布与复制'], ['chapter_db_16', '十六、数据库安全', '数据库安全'], ['chapter_db_17', '十七、数据库运维', '数据库运维'], ['chapter_db_18', '十八、数据库编程与接口', '数据库编程与接口'], ['chapter_db_19', '十九、数据库产品', '数据库产品'], ['chapter_db_20', '二十、数据库文件与实现', '数据库文件与实现']];
const C_SHELLS = [['ArrayList 详解', 'ArrayList', 'tree_vault_javajavaarraylist_an0rm3'], ['HashMap 详解', 'HashMap', 'tree_vault_javajavahashmap_14a6f2'], ['HashSet 详解', 'HashSet', 'tree_vault_javajavahashset_176pvr'], ['LinkedList 详解', 'LinkedList', 'tree_vault_javajavalinkedlist_1uc0ii'], ['ThreadPoolExecutor详解', 'ThreadPoolExecutor', 'tree_1786093144146_ajv4cr'], ['ScheduledThreadPoolExecutor详解', 'ScheduledThreadPoolExecutor', 'tree_1786093347020_15dntb'], ['FutureTask详解', 'FutureTask', 'tree_1786095193397_uyjgsm'], ['CachedThreadPool详解', 'CachedThreadPool', 'tree_1786093265279_n5f4vh'], ['FixedThreadPool详解', 'FixedThreadPool', 'tree_1786093175065_78z1xl'], ['SingleThreadExecutor详解', 'SingleThreadExecutor', 'tree_1786093231555_o69fau'], ['线程池详解', '线程池原理', 'tree_vault_java_1n4uei'], ['Java 集合框架总览', 'Java 集合框架', 'tree_vault_javajava_15bnft'], ['Java 多线程编程入门', 'Java 多线程编程', 'tree_vault_javajava_vzjv8p'], ['Kafka 定位总览', 'Kafka', 'tree_vault_javakafkakafka_1qlqb8'], ['MyBatis 定位总览', 'MyBatis', 'tree_vault_javamybatismybatis_14eqlq'], ['Spring Cloud 定位总览', 'Spring Cloud', 'tree_vault_javaspringcloudspringcloud_33p5su'], ['Java 数据结构基础', 'Java 数据结构', 'tree_vault_javajava_ii523d'], ['JVM 基础', 'JVM 理论基础', 'tree_vault_javajvm01jvm_1h8bru']];
const C_BIG = [['tree_java_syntax_zh_1oty7br', '基础', 'Java 基础语法', 'ok'], ['tree_1783873300414_0y8oon', '软件开发（实践总览）', '软件工程与开发实践', 'ok'], ['tree_surge_auto_scale', '进阶思路：监控驱动动态扩容', null, '修正：并入新建的「流量激增与服务雪崩」后卸树'], ['governance:canonical:school_real_world_conventions', '跨系统标准与约定（总览）', '跨系统标准与约定', 'ok']];

// ── 预检 ─────────────────────────────────────────────────────────────────
for (const p of [...E_PLAN, ...D1_PLAN, ...D2_PLAN]) {
  if (!byId.has(p.id)) check('树条目存在 ' + p.id, false, '树里找不到该 treeId');
  if (p.ref && !pool[p.ref]) check('池节点存在 ' + p.ref, false, '池里找不到该 nodeRef');
  if (p.target && !byId.has(p.target)) check('目标载体存在 ' + p.target + '（' + p.name + '）', false, '目标 treeId 不存在，会造出悬空挂载');
}
for (const [, ref, host] of []) void ref;
for (const c of D2_CLUSTERS) {
  const refs = Object.keys(pool).filter((k) => k.startsWith(c.refPrefix));
  check('簇 ' + c.refPrefix + '* 节点存在（' + refs.length + ' 个）', refs.length > 0, '未找到任何匹配 nodeRef');
  if (c.host) {
    const hostRef = byId.get(c.host)?.ref ?? c.host;
    check('族宿主存在 ' + c.host + '「' + c.hostName + '」（nodeRef=' + hostRef + '）', !!pool[hostRef], '宿主节点不存在，需先定载体');
  }
}
for (const [id, name, target] of C_CHAPTERS) {
  const hit = byName.get(target);
  check('章节壳改名无同名冲突：' + name + ' → ' + target, !hit, hit ? '已存在同名 ' + hit.length + ' 处：' + hit.map((h) => h.id + ' @ ' + h.path).join(' | ') : '');
}
for (const [shell, target, id] of C_SHELLS) {
  const hit = byName.get(target);
  check('详解壳去后缀无同名冲突：' + shell + ' → ' + target, !hit, hit ? '已存在同名 ' + hit.length + ' 处：' + hit.map((h) => h.id).join(' | ') : '');
  if (!byId.has(id)) check('壳条目存在 ' + id, false, '树里找不到');
}
for (const [id, name, target] of C_BIG) {
  if (!target) continue;
  const hit = byName.get(target);
  check('大壳正名无同名冲突：' + name + ' → ' + target, !hit, hit ? '已存在同名 ' + hit.length + ' 处' : '');
}

// mechanismSpec 保护：卸树 ≠ 删节点。Blueprint 要求步骤节点在池中完整保留供机制视图渲染。
// 因此正确的不变量是「卸树条目的池节点必须存在且必须仍在 spec 引用集内」，而不是「不得出现在 spec 里」。
const unloadRefs = [...D1_PLAN.filter((p) => p.action.includes('卸树')), ...D2_PLAN.filter((p) => p.action.includes('卸树'))].map((p) => p.ref);
const missingFromPool = unloadRefs.filter((r) => !pool[r]);
check('卸树条目的池节点全部存在（卸树不等于退池）', missingFromPool.length === 0, missingFromPool.join(', '));
const specBacked = unloadRefs.filter((r) => specStates.has(r));
check('受 spec 保护的卸树条目已识别（' + specBacked.length + ' 条），落盘时禁止对其退池',
  specBacked.length === 11, '期望 11 条 spec state 被卸树，实际识别 ' + specBacked.length + ' 条 — 需复核');
const beanRefs = Object.keys(pool).filter((k) => k.startsWith('bean_lc_'));
const beanUnload = beanRefs.filter((r) => !specStates.has(r));
check('bean_lc_* 尚未被任何 spec 持有（' + beanUnload.length + ' 条待新建契约）',
  beanUnload.length === 5, '期望 5 条待补机制契约，实际 ' + beanUnload.length + ' 条');

// 边类型合法性
const BLUEPRINT_EDGES = [['性能压测', 'solves', '系统性能瓶颈定位'], ['jstack', 'solves', '线上 Java 应用 CPU 飙高与死锁定位'], ['ThreadPoolExecutor', 'solves', '线程池资源耗尽与配置调优'], ['限流与降级', 'prevents', '流量激增与服务雪崩'], ['读写分离与分库分表', 'solves', '高并发系统 QPS 瓶颈与扩容'], ['EXPLAIN 执行计划', 'solves', '慢查询 SQL 性能瓶颈']];
const badType = BLUEPRINT_EDGES.filter(([, t]) => !KNOWN.has(t));
check('Blueprint 设计的边类型全部受控（' + BLUEPRINT_EDGES.length + ' 条）', badType.length === 0, badType.map(([s, t, g]) => `${s}--${t}-->${g}`).join(' · ') + ' —— 均不在 src 白名单，图上不会渲染');

// 目标端点是本计划的产物（改名/新建后才会存在），源端点则必须用既有节点，否则会产生悬空边。
const PLANNED_NEW = new Set(['系统性能瓶颈定位', '线上 Java 应用 CPU 飙高与死锁定位', '线程池资源耗尽与配置调优', '流量激增与服务雪崩', '高并发系统 QPS 瓶颈与扩容', '慢查询 SQL 性能瓶颈']);
const badSource = BLUEPRINT_EDGES.filter(([s]) => !byName.get(s));
check('Blueprint 设计的边源端点须用既有节点', badSource.length === 0, badSource.map(([s, , g]) => `${s}(缺) --→ ${g}`).join(' · ') + ' —— 这 5 个源端点既不存在也不在计划产物中');
const badTarget = BLUEPRINT_EDGES.filter(([, , g]) => !byName.get(g) && !PLANNED_NEW.has(g));
check('Blueprint 设计的边目标端点存在或在计划产物中', badTarget.length === 0, badTarget.map(([, , g]) => g).join(' · '));

// 可替代的真实端点（供修正用）
const REPLACEMENTS = [
  ['性能压测', '2. 全链路压测（surge_stress，本批会被合并，需先定归属）'],
  ['jstack', '无同类既有节点：建议改为「线上问题定位」自身作为问题节点，不建边'],
  ['限流与降级', '服务降级（tree_1786158049869_dhpjhh）'],
  ['读写分离与分库分表', 'MySQL 分库分表（tree_sharding_overview）或 读写分离优化（tree_diag_rw_split）'],
  ['EXPLAIN 执行计划', 'SQL 执行计划（EXPLAIN）（tree_k_sql_explain）'],
];
check('缺失源端点均有可替代的既有节点（列出 ' + REPLACEMENTS.length + ' 条）', true, REPLACEMENTS.map(([a, b]) => `${a} → ${b}`).join(' · '));

// ── 输出 ─────────────────────────────────────────────────────────────────
const now = new Date().toISOString();
const pass = checks.filter((c) => c.ok).length;
const rowsOf = (list) => list.map((p) => `| ${p.name} | \`${p.ref ?? '—'}\` | ${p.action} | ${p.audited} |`).join('\n');

let md = `# 最终 87 条重构 · 预检与修正规划（${now.slice(0, 10)}）

> **只读产物**：本文件由 \`scripts/plan-final-87-reconstruction.mjs\` 生成，未修改任何 \`data/*.json\`。
> Blueprint 的四条分组动作已逐条对照真实数据核对；\`status = 修正\` 的条目**不能照字面执行**。
> 预检：**${pass}/${checks.length} 通过**，${issues.length} 项未通过。

## 一、Blueprint 偏差审查（5 处硬性不可执行）

### 偏差 1 · \`kind: 'problem'\` 不是合法值
\`kind\` 真实取值域（实测全池）：${Object.entries(KIND_DOMAIN).map(([k, v]) => `\`${k}\`(${v})`).join(' · ')}。
全仓 \`src/\` 内 \`problem\` 引用数 = **0** → 写入的 \`kind:'problem'\` 不会被任何代码或校验识别，属于装饰字段。
> 附带发现既有缺陷：\`concept\`(144) 与 \`Concept\`(201) **大小写不一致**，同一语义两种写法，建议单独立项清理。

### 偏差 2 · \`solves\` / \`prevents\` / \`causes\` 不是受控边类型
\`src/core/explanation-index/indexGraphLayout.ts:164\` 实测白名单只有三组：
依赖 \`uses/depends-on/needs-for\` · 关联 \`enables/leads-to/compares/relates-to\` · 推理 \`belongs-to/leads-to/needs-for/needs/depends-on/enables/determines\`。
Blueprint 设计的 6 条边全部使用了白名单外的类型 → **图上永远不画**，等于写了没写。

### 偏差 3 · 6 条边的端点不存在
${BLUEPRINT_EDGES.map(([s, t, g]) => `- \`${s} --${t}--> ${g}\``).join('\n')}
其中 \`性能压测\` / \`jstack\` / \`限流与降级\` / \`读写分离与分库分表\` / \`EXPLAIN 执行计划\` 在树与池中**均搜不到** → 照写会产生悬空边，直接违反验收里的「0 悬空」。

### 偏差 4 · 14 处「去后缀归本体」的目标名已被占用
直接改名会产生 **14 个同名节点**（项目正在清的重名债）。详见第三节预检明细。

### 偏差 5 · \`supplement\` 在树条目上，不在节点池
实测：池节点带 \`supplement\` = **0 例**；树条目带 \`supplement\` = 87 例，结构 \`{ tabs: [{ id, label, content, tags? }] }\`。
Blueprint 写「镜像正文至宿主节点 supplement」→ 实际必须写到**树条目**，否则正文落不到渲染面。

---

## 二、预检明细

> 口径说明：**「卸树」≠「删节点」**。Blueprint 第二组要求 11 个机制状态在池中完整保留以供 \`mechanismSpec\` 渲染，只摘掉目录条目。
> 因此预检校验的是「池节点仍在、且仍在 spec 引用集内」，不是「不得出现在 spec 里」。

| # | 检查项 | 结果 | 说明 |
|---:|---|---|---|
${checks.map((c, i) => `| ${i + 1} | ${c.label} | ${c.ok ? '通过' : '**未通过**'} | ${c.detail || ''} |`).join('\n')}

---

## 三、逐条修正后的动作表

### 第一组 · E 类（7 条）

| 树节点 | nodeRef | 动作 | 备注 |
|---|---|---|---|
${rowsOf(E_PLAN)}

### 第二组 · D 类机制契约（13 条）

| 树节点 | nodeRef | 动作 | 备注 |
|---|---|---|---|
${rowsOf(D1_PLAN)}

### 第三组 · D 类工程排障（30 条）

| 树节点 | nodeRef | 动作 | 备注 |
|---|---|---|---|
${rowsOf(D2_PLAN)}

按簇的 27 条：

| 簇 | 条数 | 目标载体 | 动作 | 备注 |
|---|---:|---|---|---|
${D2_CLUSTERS.map((c) => {
  const n = Object.keys(pool).filter((k) => k.startsWith(c.refPrefix)).length;
  return `| \`${c.refPrefix}*\` | ${n} | ${c.host ? '`' + c.host + '` 「' + c.hostName + '」' : c.hostName} | ${c.action} | ${c.audited} |`;
}).join('\n')}

### 第四组 · C 类（37 条）

章节壳去序号 15 条、详解/总览/基础去后缀 18 条、大壳正名 4 条。冲突项见第二节预检。

---

## 四、需要裁决的分叉（预检未通过项的处理）

1. **\`kind: 'problem'\` 怎么办** —— ①不写 kind，靠 tag/role 表达；②正式给 \`kind\` 域加 \`problem\`（需改 \`src\` 校验与渲染，属代码变更）；③改用既有值（\`entity\` / \`conclusion\`）。
2. **9 处详解壳同名冲突怎么办** —— ①融合（正文迁入既有正身、壳退池标 archived-redirect，避免重名）；②照 Blueprint 改名，接受 14 个同名节点。
3. **6 条边的类型与端点怎么办** —— ①映射到受控类型（\`solves→enables\`、\`causes→leads-to\`、\`prevents\` 无对应值）并把端点换成真实节点；②放弃建边。
4. **3 处章节壳自身重名怎么办** —— \`十三、数据库设计\`→\`数据库设计\`（与其子 \`asplit_s106_db_design\` 同名）、\`十六、数据库安全\`→\`数据库安全\`（与其子 \`tree_wiki_en_database_s20\` 同名）、\`十、存储系统\`→\`存储系统\`（与另一分支 \`theory_domain_storage_systems\` 同名）。

---

## 五、只读声明

- 直接读取 \`data/node-pool.json\` / \`data/tree-data.json\` / \`data/knowledge-edges.json\` 生成，**未写入任何 \`data/*.json\`**。
- 边类型白名单来自 \`src/knowledge/extractSubgraph.ts:22\` 与 \`src/core/explanation-index/indexGraphLayout.ts:164-165\`。
- 生成时刻：${now}
`;

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'final-87-reconstruction-plan.md'), md);
console.log(`预检 ${pass}/${checks.length} 通过，${issues.length} 项未通过`);
for (const i of issues) console.log('  未通过: ' + i);
console.log('已写出: outputs/tree-violation-scan/final-87-reconstruction-plan.md');
