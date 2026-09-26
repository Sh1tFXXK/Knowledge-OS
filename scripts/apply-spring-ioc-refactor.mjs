#!/usr/bin/env node
/**
 * SPRING-IOC-REFACTOR · IoC 解释卡正文拆解融合（默认 dry-run，--apply 才写）
 *
 * 用户裁决（2026-09-22）：「这是ioc解释卡的正文，拆解融合入库」。
 *   IoC容器（k_java_fw_spring_ioc）rootContent = 9220 字八股整段，拆散后按事实归属融进
 *   现有节点卡；已有覆盖的一律不重复（诚实融合），事实缺口才补。
 *
 * 逐块去向（全部落位现有节点，0 新建节点 / 0 树改动 / 0 边改动）：
 *   ① IoC 概念/职责/机制/接口/导航        → IoC容器 rootContent+def 重写为导览式正文
 *   ② IoC 的作用 + IoC 优点              → 「本质」def 重写（原为截断的八股碎片）
 *   ③ BF/AC 创建方式 + 后处理器注册差异   → ApplicationContext 新增对比 tab
 *   ④ 自动装配 5 模式/@Autowired/局限     → 自动装配已有 4 tab 全覆盖，仅补缺失的 rootContent 正文
 *   ⑤ Bean 生命周期 9 步（原文）          → 生命周期 stages tab 重排为编号列表（去掉失效插图引用，
 *      BeanPostProcessor 由「bean 实现」更正为「容器注册」——事实修正，报告披露）
 *   ⑥ DI 三种方式 + 接口注入废弃注记      → 依赖注入方式 overview 第 4 条订正
 *   不动作：作用域 5 种+线程安全（已覆盖，含 ThreadLocal 段——材料该段与现存卡重复，非排除）；
 *      BeanFactory（def 已完整）；IoC 原理（def+mechanism 已覆盖工厂+反射）；
 *      通用层 控制反转/依赖注入 节点（Spring 专属 DI 材料已有 spring-di tab 承接）
 *
 * ⚠️ 不写 evolution-events.json —— 2026-09-15 裁决「批次脚本不得向本文件写入操作日志类事件」。
 *
 * 用法：
 *   node scripts/apply-spring-ioc-refactor.mjs            # dry-run
 *   node scripts/apply-spring-ioc-refactor.mjs --apply    # 落盘
 *   KNOWLEDGE_OS_DATA_DIR=/tmp/x 重定向数据目录（测试用，不许打真数据）
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const APPLY = process.argv.includes('--apply');
const DATA_DIR = process.env.KNOWLEDGE_OS_DATA_DIR
  ? path.resolve(process.env.KNOWLEDGE_OS_DATA_DIR)
  : path.join(ROOT, 'data');
const OUT_DIR = path.join(ROOT, 'outputs', 'tree-violation-scan');

const F = {
  tree: path.join(DATA_DIR, 'tree-data.json'),
  edges: path.join(DATA_DIR, 'knowledge-edges.json'),
  pool: path.join(DATA_DIR, 'node-pool.json'),
  evo: path.join(DATA_DIR, 'evolution-events.json'),
};
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const detectIndent = (text) => {
  for (const line of text.split('\n')) {
    const m = line.match(/^(\s+)\S/);
    if (m) return m[1];
  }
  return ' ';
};
const sleepSync = (ms) => { try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch { const end = Date.now() + ms; while (Date.now() < end) { /* spin */ } } };
const RETRYABLE_FS = new Set(['EPERM', 'EEXIST', 'EBUSY', 'EACCES', 'UNKNOWN']);
const withFsRetry = (fn, label) => {
  const maxAttempts = 6;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try { return fn(); } catch (e) {
      const code = String((e && e.code) || '');
      if (!RETRYABLE_FS.has(code) || attempt === maxAttempts - 1) throw e;
      console.warn(`[apply] fs ${code} on ${label}, retry #${attempt + 1}`);
      sleepSync(250 * 2 ** attempt);
    }
  }
};
const writeJsonAtomic = (file, obj) => {
  const base = path.basename(file);
  const indent = detectIndent(fs.readFileSync(file, 'utf8'));
  const body = JSON.stringify(obj, null, indent) + '\n';
  const tmp = path.join(path.dirname(file), `.${base}.tmp-${process.pid}`);
  withFsRetry(() => fs.writeFileSync(tmp, body), `${base}:write-temp`);
  try {
    withFsRetry(() => fs.renameSync(tmp, file), `${base}:rename`);
  } catch (e) {
    console.warn(`[apply] ${base} rename 退避耗尽（${e.code}），退回原地直写`);
    withFsRetry(() => fs.writeFileSync(file, body), `${base}:write-inplace`);
    try { fs.unlinkSync(tmp); } catch { /* noop */ }
  }
};

const K = {
  ioc: 'k_java_fw_spring_ioc',
  essence: 'k_1788681463569_fqwfp2',
  appctx: 'spring_appcontext',
  autowire: 'k_1784453158872_rsqoiy',
  lifecycle: 'k_1785225243066_ds8pn6',
  diWays: 'k_1788687205852_lhoemy',
};
const DECLARED = Object.values(K);

// ─── 拆解后的内容块 ─────────────────────────────────────────────────────────
const C = {};
C.iocRoot = [
  'IoC 容器：Spring 的核心容器，负责 Bean 的创建、装配、配置与整个生命周期的管理。',
  '',
  '**控制反转（IoC）**：把对象组件的调用权从程序代码本身转移给外部容器——组件不自己创建依赖，由容器装配注入。IoC 是设计原则（通用概念见「设计模式 > 架构模式 > 控制反转 / 依赖注入」），依赖注入（DI）是其最主要的实现手段。',
  '',
  '**容器职责**：创建对象、通过 DI 装配对象、配置对象、管理对象的整个生命周期。',
  '',
  '**为什么需要它 / 优点**：管理对象的创建与依赖维护、解耦、托管类的产生过程（如代理增强交给容器）；应用代码量更低、易测试（无需单例与 JNDI 查找）、最小侵入实现松耦合、支持饿汉式初始化与懒加载——详见「本质」。',
  '',
  '**实现机制**：工厂模式 + 反射（详见「IoC 原理」）。',
  '',
  '**容器接口**：BeanFactory（低级容器，延迟加载）与 ApplicationContext（高级容器，启动预载入），对比详见两子节点。',
  '',
  '**子节点导航**：IoC 原理 · 本质 · 依赖注入方式 · BeanFactory · ApplicationContext；Bean 的作用域 / 生命周期 / 自动装配见「Spring Beans」下的对应节点。',
].join('\n');
C.iocDef = C.iocRoot.split('\n\n**为什么需要它')[0];

C.essence = [
  '**控制反转（IoC）的作用**',
  '- 管理对象的创建和依赖关系的维护——对象关系复杂时，依赖关系由程序手写维护成本极高',
  '- 解耦：由容器去维护具体的对象',
  '- 托管类的产生过程：需要在类产生过程中做的处理（最直接的例子是代理）交给容器，应用无需关心类如何完成代理',
  '',
  '**IoC / DI 的优点**',
  '- 把应用的代码量降到最低',
  '- 使应用容易测试：单元测试不再需要单例和 JNDI 查找机制',
  '- 以最小的代价和最小的侵入性实现松散耦合',
  '- 容器支持加载服务时的饿汉式初始化和懒加载',
].join('\n');
C.essenceRoot = 'IoC 的本质：把对象的控制权从程序代码本身转移到外部容器。\n\n' + C.essence;

C.appctxTab = [
  '**与 BeanFactory 的对比补充**：',
  '- **创建方式**：BeanFactory 通常以编程的方式被创建；ApplicationContext 还能以声明的方式创建（如使用 ContextLoader）',
  '- **后处理器注册**：两者都支持 BeanPostProcessor、BeanFactoryPostProcessor 的使用，区别在注册方式——BeanFactory 需要手动注册，ApplicationContext 自动注册',
].join('\n');

C.autowireRoot = [
  '自动装配：Spring 容器无需为每个依赖显式配置 ref，自动处理相互协作的 Bean 之间的装配关系。XML 中通过 <bean> 的 autowire 属性指定模式；注解方式以 @Autowired 为主（辅以 @Qualifier / @Primary，及标准注解 @Resource、@Inject）。',
  '',
  '**五种 autowire 模式**：no（默认，手工 ref）/ byName / byType / constructor（参数按 byType）/ autodetect（有构造方法走 constructor，否则 byType）。',
  '',
  '**@Autowired 装配过程**：容器启动时自动装载 AutowiredAnnotationBeanPostProcessor，扫描到 @Autowired / @Resource / @Inject 时按类型查找——唯一则注入；多个则按名称再查；为空抛异常（required=false 放行）。',
  '',
  '**局限**：仍需 constructor-arg / property 显式定义依赖；不能自动装配基本类型、String、Class 等简单属性；不如显式装配精确，能显式则显式。',
].join('\n');

C.stages = [
  '传统 Java 应用中 Bean 的生命周期很简单：new 实例化 → 使用 → 垃圾回收。Spring 容器中的 Bean 生命周期复杂得多，每个阶段都可借助 Spring 的扩展点定制。',
  '',
  'Bean 从创建到销毁的典型过程：',
  '1. Spring 对 Bean 进行实例化',
  '2. Spring 将值和 Bean 的引用注入到对应的属性中',
  '3. 若实现 BeanNameAware 接口，调用 setBeanName() 传入 Bean 的 ID',
  '4. 若实现 BeanFactoryAware 接口，调用 setBeanFactory() 传入 BeanFactory 容器实例',
  '5. 若实现 ApplicationContextAware 接口，调用 setApplicationContext() 传入应用上下文引用',
  '6. 容器注册的 BeanPostProcessor 调用 postProcessBeforeInitialization()',
  '7. 初始化：若实现 InitializingBean 接口，调用 afterPropertiesSet()；声明了 init-method 的方法也在此时调用',
  '8. BeanPostProcessor 调用 postProcessAfterInitialization()——此后 Bean 就绪，驻留容器直到应用上下文销毁',
  '9. 销毁：若实现 DisposableBean 接口，调用 destroy()；声明了 destroy-method 的方法也在此时调用',
].join('\n');

// ─── 状态构建（预检与实跑共用） ─────────────────────────────────────────────
const buildState = () => {
  const tree = readJson(F.tree);
  const edgesRaw = readJson(F.edges);
  const pool = readJson(F.pool);
  const edges = Array.isArray(edgesRaw) ? edgesRaw : edgesRaw.edges;

  const log = [];
  const before = { tree: null, pool: Object.keys(pool).length, edges: edges.length };
  const countTree = (n) => { let c = 1; for (const k of ['children', 'nodes']) if (Array.isArray(n[k])) for (const x of n[k]) c += countTree(x); return c; };
  before.tree = countTree(tree);

  const src = [];
  const iocRc = pool[K.ioc]?.card?.rootContent ?? '';
  src.push(['G1', 'IoC容器八股正文在位（rootContent >9000 字且含原文标记，防重复执行）',
    iocRc.length > 9000 && iocRc.includes('BeanFactory 和 ApplicationContext有什么区别') && iocRc.includes('单例bean是线程安全的吗'),
    `len=${iocRc.length}`]);
  src.push(['G2', '「本质」def 为八股碎片在位（含原文「程序猿」标记）',
    (pool[K.essence]?.card?.tabs?.find((t) => t.id === 'def')?.content ?? '').includes('程序猿'),
    `rootLen=${(pool[K.essence]?.card?.rootContent ?? '').length}`]);
  src.push(['G3', 'ApplicationContext 尚无「对比补充」tab（id=vs-beanfactory）',
    !(pool[K.appctx]?.card?.tabs ?? []).some((t) => t.id === 'vs-beanfactory'),
    `tabs=${(pool[K.appctx]?.card?.tabs ?? []).map((t) => t.id).join(',')}`]);
  src.push(['G4', '自动装配 rootContent 缺失（card.tabs 已有 4 个全内容 tab，正文槽空）',
    typeof pool[K.autowire]?.card?.rootContent !== 'string' || pool[K.autowire].card.rootContent === '',
    `typeof=${typeof pool[K.autowire]?.card?.rootContent} tabs=${(pool[K.autowire]?.card?.tabs ?? []).length}`]);
  src.push(['G5', '生命周期 stages tab 为旧段落格式在位（含失效插图引用「下图展示了」）',
    (pool[K.lifecycle]?.card?.tabs?.find((t) => t.id === 'stages')?.content ?? '').includes('下图展示了'),
    'marker=下图展示了']);
  src.push(['G6', '依赖注入方式 overview 第 4 条仍写「（较少使用）」',
    (pool[K.diWays]?.card?.tabs?.find((t) => t.id === 'overview')?.content ?? '').includes('（较少使用）'),
    'marker=较少使用']);
  src.push(['G7', '6 个目标实体全部在位', DECLARED.every((id) => !!pool[id]),
    DECLARED.map((id) => `${id.slice(-10)}=${!!pool[id]}`).join(' ')]);

  const srcFailed = src.filter(([, , ok]) => !ok);
  if (srcFailed.length) {
    for (const [id, desc, ok, detail] of src) console.log(`${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(4)} ${desc}  [${detail}]`);
    throw new Error(`源门禁未过 ${srcFailed.length} 项，终止（未做任何修改）`);
  }

  const preserve = { pool: JSON.parse(JSON.stringify(pool)) };

  // ① IoC容器：rootContent + def 重写
  const ioc = pool[K.ioc];
  ioc.card.rootContent = C.iocRoot;
  const iocDef = ioc.card.tabs.find((t) => t.id === 'def');
  iocDef.content = C.iocDef;
  iocDef.label = '定义';
  log.push(`IoC容器 rootContent 9220 字 → ${C.iocRoot.length} 字导览正文；def tab 重写`);

  // ② 本质：def 重写 + rootContent 对齐
  const ess = pool[K.essence];
  ess.card.tabs.find((t) => t.id === 'def').content = C.essence;
  ess.card.rootContent = C.essenceRoot;
  log.push('「本质」def 八股碎片 → 结构化「IoC 的作用 / 优点」；rootContent 对齐');

  // ③ ApplicationContext：新增对比 tab
  pool[K.appctx].card.tabs.push({ id: 'vs-beanfactory', label: '与 BeanFactory 的对比补充', content: C.appctxTab });
  log.push('ApplicationContext 新增 tab「与 BeanFactory 的对比补充」（创建方式 + 后处理器注册差异）');

  // ④ 自动装配：仅补 rootContent 正文（事实已在 4 个 tab 内，正文从其蒸馏，无新事实）
  pool[K.autowire].card.rootContent = C.autowireRoot;
  log.push(`自动装配补 rootContent 正文 ${C.autowireRoot.length} 字（蒸馏自其既有 4 tab，无新事实）`);

  // ⑤ 生命周期 stages 重排
  pool[K.lifecycle].card.tabs.find((t) => t.id === 'stages').content = C.stages;
  log.push('生命周期 stages 段落 → 编号 9 步列表；删失效插图引用「下图展示了」；BeanPostProcessor 措辞由「bean 实现」更正为「容器注册」（事实修正，报告披露）');

  // ⑥ 依赖注入方式 overview 第 4 条订正
  const ov = pool[K.diWays].card.tabs.find((t) => t.id === 'overview');
  ov.content = ov.content.replace('（较少使用）', '（因灵活性与易用性差，自 Spring 4 起已废弃）');
  log.push('依赖注入方式 overview：接口注入注记「较少使用」→「自 Spring 4 起已废弃」');

  log.push('不动作（已覆盖，诚实融合）：作用域 5 种+线程安全（含 ThreadLocal 段）/ BeanFactory / IoC 原理 / 通用层 控制反转·依赖注入 / Spring Beans（bean 定义·inner bean·元数据）');
  log.push('⚠️ 不写 evolution-events.json —— 2026-09-15 裁决（git + batch-manifests 承载）');

  const after = { tree: countTree(tree), pool: Object.keys(pool).length, edges: edges.length };
  return { tree, pool, edges, log, before, after, src, preserve };
};

// ─── 运行 ─────────────────────────────────────────────────────────────────
const evoNow = () => (fs.existsSync(F.evo) ? fs.readFileSync(F.evo, 'utf8') : null);
const orig = {
  tree: fs.readFileSync(F.tree, 'utf8'),
  edges: fs.readFileSync(F.edges, 'utf8'),
  pool: fs.readFileSync(F.pool, 'utf8'),
  evo: evoNow(),
};

let S;
try {
  S = buildState();
} catch (e) {
  console.error(String(e && e.message ? e.message : e));
  process.exit(1);
}

// ── 预检（结果态门禁）──
const pre = [];
pre.push(['P1', 'IoC容器 rootContent 已拆解（<2000 字、不再含八股标记「单例bean是线程安全的吗」「自动装配有哪些局限性」）',
  S.pool[K.ioc].card.rootContent.length < 2000
    && !S.pool[K.ioc].card.rootContent.includes('单例bean是线程安全的吗')
    && !S.pool[K.ioc].card.rootContent.includes('自动装配有哪些局限性')
    && S.pool[K.ioc].card.rootContent.includes('BeanFactory'),
  `len=${S.pool[K.ioc].card.rootContent.length}`]);
pre.push(['P2', 'IoC容器 def tab 已重写且不含八股标记',
  !S.pool[K.ioc].card.tabs.find((t) => t.id === 'def').content.includes('BeanFactory 和 ApplicationContext有什么区别'),
  `len=${S.pool[K.ioc].card.tabs.find((t) => t.id === 'def').content.length}`]);
pre.push(['P3', '「本质」def 结构化且含 3 条作用 + 4 条优点；rootContent 同步',
  (() => { const c = S.pool[K.essence].card.tabs.find((t) => t.id === 'def').content;
    return ['管理对象的创建和依赖关系的维护', '托管类的产生过程', '饿汉式初始化和懒加载'].every((m) => c.includes(m))
      && S.pool[K.essence].card.rootContent.includes('管理对象的创建和依赖关系的维护'); })(),
  'markers=作用3+优点4']);
pre.push(['P4', 'ApplicationContext 新 tab 在位且含「手动注册 / 自动注册」对比',
  (() => { const t = S.pool[K.appctx].card.tabs.find((x) => x.id === 'vs-beanfactory');
    return !!t && t.content.includes('手动注册') && t.content.includes('自动注册') && t.content.includes('ContextLoader'); })(),
  'tab=vs-beanfactory']);
pre.push(['P5', '自动装配 rootContent 已补（含五种模式 + @Autowired 过程 + 局限）',
  (() => { const c = S.pool[K.autowire].card.rootContent;
    return typeof c === 'string' && ['byName', 'autodetect', 'AutowiredAnnotationBeanPostProcessor', 'required=false', '显式装配精确'].every((m) => c.includes(m)); })(),
  `len=${S.pool[K.autowire].card.rootContent.length}`]);
pre.push(['P6', '生命周期 stages 为编号列表、无失效插图引用、BeanPostProcessor 措辞已更正',
  (() => { const c = S.pool[K.lifecycle].card.tabs.find((t) => t.id === 'stages').content;
    return c.includes('1. Spring 对 Bean 进行实例化') && c.includes('9. 销毁') && !c.includes('下图展示了') && c.includes('容器注册的 BeanPostProcessor'); })(),
  'steps=1..9']);
pre.push(['P7', '依赖注入方式 overview 接口注入注记已订正',
  S.pool[K.diWays].card.tabs.find((t) => t.id === 'overview').content.includes('自 Spring 4 起已废弃')
    && !S.pool[K.diWays].card.tabs.find((t) => t.id === 'overview').content.includes('（较少使用）'),
  'marker=Spring 4 起已废弃']);
pre.push(['P8', '全池 diff：改动实体恰为声明的 6 个，0 新增 0 删除',
  (() => {
    const before = S.preserve.pool;
    const changed = [];
    for (const id of Object.keys(S.pool)) {
      if (!before[id]) changed.push('+ ' + id);
      else if (JSON.stringify(S.pool[id]) !== JSON.stringify(before[id])) changed.push('~ ' + id);
    }
    for (const id of Object.keys(before)) if (!S.pool[id]) changed.push('- ' + id);
    const expected = DECLARED.map((id) => '~ ' + id).sort();
    return changed.length === expected.length && changed.sort().every((c, i) => c === expected[i]);
  })(),
  (() => {
    const before = S.preserve.pool;
    const changed = [];
    for (const id of Object.keys(S.pool)) {
      if (!before[id]) changed.push('+ ' + id);
      else if (JSON.stringify(S.pool[id]) !== JSON.stringify(before[id])) changed.push('~ ' + id);
    }
    for (const id of Object.keys(before)) if (!S.pool[id]) changed.push('- ' + id);
    return changed.join(' ');
  })()]);
pre.push(['P9', '计数：树 / 池 / 边 数量全不变（内容级批，0 结构改动）',
  S.before.tree === S.after.tree && S.before.pool === S.after.pool && S.before.edges === S.after.edges,
  `树 ${S.before.tree}→${S.after.tree} 池 ${S.before.pool}→${S.after.pool} 边 ${S.before.edges}→${S.after.edges}`]);
pre.push(['P10', '演化事件文件零改动（2026-09-15 裁决）', evoNow() === orig.evo,
  `字节 ${orig.evo === null ? '(不存在)' : Buffer.byteLength(orig.evo)} 逐字节${evoNow() === orig.evo ? '相等' : '不等'}`]);

const preFailed = pre.filter(([, , ok]) => !ok);
for (const [id, desc, ok, detail] of pre) console.log(`${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(4)} ${desc}  [${detail}]`);
console.log(`\n源门禁 ${S.src.length}/${S.src.length} · 预检 ${pre.length - preFailed.length}/${pre.length}`);
console.log(`计数 前: 树 ${S.before.tree} 池 ${S.before.pool} 边 ${S.before.edges}`);
console.log(`计数 后: 树 ${S.after.tree} 池 ${S.after.pool} 边 ${S.after.edges}`);
S.log.forEach((l) => console.log('  · ' + l));

if (preFailed.length) { console.error('\n预检未过，终止'); process.exit(1); }

if (!APPLY) {
  console.log('\n[DRY-RUN] 未写入任何文件。加 --apply 落盘。');
} else {
  writeJsonAtomic(F.pool, S.pool);
  const okPool = JSON.stringify(readJson(F.pool)) === JSON.stringify(S.pool);
  const okTree = fs.readFileSync(F.tree, 'utf8') === orig.tree;
  const okEdges = fs.readFileSync(F.edges, 'utf8') === orig.edges;
  const okEvo = evoNow() === orig.evo;
  console.log(`\n[APPLY] 已落盘 node-pool.json（tree/edges/evo 未触碰）；回读一致性 pool=${okPool} tree未动=${okTree} edges未动=${okEdges} evo未变=${okEvo}`);
  if (!okPool || !okTree || !okEdges || !okEvo) { console.error('落盘后回读不一致，请检查'); process.exit(1); }
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'spring-ioc-refactor-apply-report.md'), [
  `# SPRING-IOC-REFACTOR · ${APPLY ? 'APPLY' : 'DRY-RUN'} 报告`,
  '',
  `- 时间：${new Date().toISOString()}`,
  `- 数据目录：\`${DATA_DIR}\``,
  '- 裁决：IoC 解释卡正文（9220 字八股整段）拆解融合入库——按事实归属融进现有节点卡，已覆盖不重复',
  '',
  '## 源门禁',
  '',
  '| 项 | 说明 | 结果 | 读数 |',
  '|---|---|---|---|',
  ...S.src.map(([id, desc, ok, detail]) => `| ${id} | ${desc} | ${ok ? 'PASS' : '**FAIL**'} | ${detail} |`),
  '',
  '## 预检',
  '',
  '| 项 | 说明 | 结果 | 读数 |',
  '|---|---|---|---|',
  ...pre.map(([id, desc, ok, detail]) => `| ${id} | ${desc} | ${ok ? 'PASS' : '**FAIL**'} | ${detail} |`),
  '',
  '## 计数',
  '',
  `- 前：树 ${S.before.tree} / 池 ${S.before.pool} / 边 ${S.before.edges}`,
  `- 后：树 ${S.after.tree} / 池 ${S.after.pool} / 边 ${S.after.edges}（内容级批：0 新建节点 / 0 树改动 / 0 边改动）`,
  `- 演化事件：**未写入**（2026-09-15 裁决）—— 落盘前后逐字节比对${evoNow() === orig.evo ? '**相等**' : '**不等**'}`,
  '',
  '## 操作日志',
  '',
  ...S.log.map((l) => `- ${l}`),
  '',
  '## 事实修正披露',
  '',
  '- 生命周期 stages 重排时，原文「如果 bean 实现了 BeanPostProcessor 接口」更正为「容器注册的 BeanPostProcessor」——BeanPostProcessor 是容器级后置处理器，不是每个 Bean 实现一次的接口；同卡 def tab 的扩展点表述（BeanFactoryPostProcessor、BeanPostProcessor 等）原本就是正确的。',
  '- 原文「接口注入从 Spring 4 开始已被废弃」落为依赖注入方式 overview 第 4 条注记（原为「较少使用」）。',
  '',
].join('\n'));
console.log('报告 → outputs/tree-violation-scan/spring-ioc-refactor-apply-report.md');
