#!/usr/bin/env node
/**
 * versions-v1 apply 脚本（2026-09-15）。
 *
 * 职责：创建 data/version-chains.json（2 链 6 节点种子）+ knowledge-edges.json 追加
 * 2 条 requires 边（4161→4163）。默认 dry-run，只有 --apply 才落盘；落盘用原子写
 * （tmp + rename，Windows EPERM 退化原地写），绝不打其他切片。
 *
 * 纪律：本脚本不向 evolution-events.json 写任何操作日志事件（evolution-v2 治理规则）。
 * 版本链/requires 的仓库留痕由 git 提交 + batch-manifests/versions-v1.json 承载。
 */
import { readFileSync, writeFileSync, renameSync, existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

const APPLY = process.argv.includes('--apply');
const ROOT = resolve(import.meta.dirname, '..');
const SNAPSHOT = resolve(ROOT, 'data/backups/versions-v1-2026-09-15T07-14-24-000Z');
const EDGES_PATH = resolve(ROOT, 'data/knowledge-edges.json');
const CHAINS_PATH = resolve(ROOT, 'data/version-chains.json');
const REPORT_PATH = resolve(ROOT, 'outputs/tree-violation-scan/versions-v1-apply-report.md');

// ── 种子数据（用户裁决：Java 3 + Spring 3；Spring 取 v4.0/v5.0/v6.0 对齐既有事件轨道）──
const JAVA_ENTITY = 'k_1782746457581_30q8ao'; // 池 label "java"，全库唯一
const SPRING_ENTITY = 'k_java_fw_spring';     // 既有事件轨道 scopeRootId 同源

const versionChains = [
  {
    entityId: SPRING_ENTITY,
    versions: [
      {
        id: 'spring-framework-v4.0',
        label: 'Spring Framework 4.0',
        releasedAt: '2013-12',
        eolAt: null,
        previous: null,
        tags: [],
        changes: ['WebSocket 支持', 'Groovy Bean 定义 DSL', '条件化 Bean 定义'],
      },
      {
        id: 'spring-framework-v5.0',
        label: 'Spring Framework 5.0',
        releasedAt: '2017-09',
        eolAt: null,
        previous: 'spring-framework-v4.0',
        tags: [],
        changes: ['响应式 Web 框架 WebFlux', 'Kotlin 支持', 'JDK 8 基线'],
      },
      {
        id: 'spring-framework-v6.0',
        label: 'Spring Framework 6.0',
        releasedAt: '2022-11',
        eolAt: null,
        previous: 'spring-framework-v5.0',
        tags: [],
        changes: ['Jakarta EE 9 基线（javax → jakarta）', 'AOT 编译支持', 'JDK 17 基线'],
      },
    ],
  },
  {
    entityId: JAVA_ENTITY,
    versions: [
      {
        id: 'java-v8',
        label: 'Java 8',
        releasedAt: '2014-03',
        eolAt: null,
        previous: null,
        tags: ['LTS'],
        changes: ['Lambda 表达式', 'Stream API', '新的日期时间 API'],
      },
      {
        id: 'java-v11',
        label: 'Java 11',
        releasedAt: '2018-09',
        eolAt: null,
        previous: 'java-v8',
        tags: ['LTS'],
        changes: ['HTTP Client 标准化', 'ZGC 实验性', '移除 Java EE 模块'],
      },
      {
        id: 'java-v17',
        label: 'Java 17',
        releasedAt: '2021-09',
        eolAt: null,
        previous: 'java-v11',
        tags: ['LTS'],
        changes: ['Sealed Classes', '强封装 JDK 内部 API', '移除废弃特性'],
      },
    ],
  },
];

const requiresEdges = [
  {
    id: 'requires:spring-framework-v5.0:java-v8',
    source: 'spring-framework-v5.0',
    target: 'java-v8',
    type: 'requires',
    relationKind: 'dependency',
    label: '需要 Java 8',
  },
  {
    id: 'requires:spring-framework-v6.0:java-v17',
    source: 'spring-framework-v6.0',
    target: 'java-v17',
    type: 'requires',
    relationKind: 'dependency',
    label: '需要 Java 17',
  },
];

// ── 工具 ──
let failures = 0;
function gate(name, ok, detail = '') {
  const mark = ok ? '✅' : '❌';
  console.log(`${mark} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
  return ok;
}

function jsonFormatted(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function writeFileAtomically(filePath, content) {
  const tmp = `${filePath}.tmp-versions-v1`;
  writeFileSync(tmp, content, 'utf8');
  try {
    renameSync(tmp, filePath);
  } catch (error) {
    // Windows rename EPERM → 退化原地写（项目铁律既定退化路径）
    if (String(error).includes('EPERM') || error.code === 'EPERM') {
      writeFileSync(filePath, content, 'utf8');
      try { unlinkSync(tmp); } catch { /* 忽略 */ }
    } else {
      throw error;
    }
  }
}

function fmtDay(ts) {
  return typeof ts === 'number' && Number.isFinite(ts)
    ? new Date(ts).toISOString().slice(0, 10)
    : String(ts);
}

// ── 预检（dry-run 与 apply 都跑）──
console.log(`\n== versions-v1 预检（mode = ${APPLY ? 'APPLY' : 'DRY-RUN'}）==`);

const snapshotEdges = JSON.parse(readFileSync(resolve(SNAPSHOT, 'knowledge-edges.json'), 'utf8'));
gate('G1 快照基线 edges = 4161', snapshotEdges.length === 4161, `实际 ${snapshotEdges.length}`);

const currentEdges = JSON.parse(readFileSync(EDGES_PATH, 'utf8'));
gate('G2 当前工作树 edges = 4161（未被他人动过）', currentEdges.length === 4161, `实际 ${currentEdges.length}`);

gate('G3 version-chains.json 不存在（新建）', !existsSync(CHAINS_PATH));

const existingIds = new Set(currentEdges.map((edge) => edge.id));
const newEdgeIds = requiresEdges.map((edge) => edge.id);
gate('G4 新边 id 无冲突', newEdgeIds.every((id) => !existingIds.has(id)));

const pool = JSON.parse(readFileSync(resolve(ROOT, 'data/node-pool.json'), 'utf8'));
gate('G5 Java 锚点在池', !!pool[JAVA_ENTITY], `label = ${pool[JAVA_ENTITY]?.label}`);
gate('G6 Spring 锚点在池', !!pool[SPRING_ENTITY], `label = ${pool[SPRING_ENTITY]?.label}`);

const allVersionIds = new Set(versionChains.flatMap((chain) => chain.versions.map((v) => v.id)));
gate('G7 版本 id 无冒号', [...allVersionIds].every((id) => !id.includes(':')));
gate(
  'G8 requires 边端点均为已声明的版本 id',
  requiresEdges.every((edge) => allVersionIds.has(edge.source) && allVersionIds.has(edge.target)),
);
gate(
  'G9 requires 边端点均不在池中（索引图隔离前提）',
  requiresEdges.every((edge) => !pool[edge.source] && !pool[edge.target]),
);

if (!APPLY) {
  console.log('\n== DRY-RUN 结束：未写入任何文件。加 --apply 执行落盘 ==');
  console.log(`将新建 ${CHAINS_PATH}`);
  console.log(`将追加 2 条 requires 边到 ${EDGES_PATH}（4161→4163）`);
  process.exit(failures === 0 ? 0 : 1);
}

if (failures > 0) {
  console.error(`\n⛔ 预检 ${failures} 项失败，拒绝落盘`);
  process.exit(1);
}

// ── 落盘 ──
console.log('\n== 落盘 ==');
writeFileAtomically(CHAINS_PATH, jsonFormatted(versionChains));
console.log(`✅ 新建 version-chains.json（${versionChains.length} 链 / ${allVersionIds.size} 节点）`);

writeFileAtomically(EDGES_PATH, jsonFormatted([...currentEdges, ...requiresEdges]));
console.log('✅ knowledge-edges.json 4161→4163（+2 requires）');

// ── 落盘自检 ──
console.log('\n== 落盘自检 ==');
const chainsReread = JSON.parse(readFileSync(CHAINS_PATH, 'utf8'));
gate('S1 复读 chains = 2', chainsReread.length === 2);
gate(
  'S2 复读节点 = 6 且 id 集合一致',
  chainsReread.flatMap((chain) => chain.versions).length === 6
    && new Set(chainsReread.flatMap((chain) => chain.versions.map((v) => v.id))).size === 6,
);

const edgesReread = JSON.parse(readFileSync(EDGES_PATH, 'utf8'));
gate('S3 复读 edges = 4163', edgesReread.length === 4163, `实际 ${edgesReread.length}`);
const added = edgesReread.slice(4161);
gate(
  'S4 尾部恰为 2 条声明的 requires 边',
  added.length === 2 && added.every((edge, index) => JSON.stringify(edge) === JSON.stringify(requiresEdges[index])),
);

// 既有 4161 条边内容不变（reparse 后深比较，允许整体重格式化）
const before = snapshotEdges.map((edge) => JSON.stringify(edge));
const after = edgesReread.slice(0, 4161).map((edge) => JSON.stringify(edge));
gate('S5 既有边逐条深比较不变', before.length === after.length && before.every((line, index) => line === after[index]));

// ── 报告 ──
const report = `# versions-v1 apply 报告

- 运行时刻：${fmtDay(Date.now())}
- 模式：${APPLY ? 'APPLY（已落盘）' : 'DRY-RUN'}
- 预检：G1-G9（见上方控制台输出，失败数 ${failures}）
- 落盘：data/version-chains.json 新建（2 链 / 6 节点：java-v8→v11→v17、spring-framework-v4.0→v5.0→v6.0）
- 落盘：data/knowledge-edges.json 4161→4163（+2 requires 边：v5.0→java-v8、v6.0→java-v17）
- 自检：S1-S5（既有 4161 条边逐条深比较不变）
- 纪律：未向 evolution-events.json 写入任何操作日志事件（evolution-v2 治理规则）
- 种子裁决：Spring v4.0/v5.0/v6.0（对齐既有事件轨道 2013-12/2017-09）；requires ×2 覆盖多对一（java-v8 被两个版本依赖）
`;
if (APPLY) writeFileSync(REPORT_PATH, report, 'utf8');
console.log(`\n== 完成：${failures === 0 ? '全部通过' : `${failures} 项失败`} ==`);
process.exit(failures === 0 ? 0 : 1);
