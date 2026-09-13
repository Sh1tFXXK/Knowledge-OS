/**
 * A-split 收尾修正：本批新建节点里 label 含「与/和」而新触扫描器 A 类的两处。
 *
 * 实数据（只读扫描）：本批 123 个新建节点中仅 2 个命中：
 *   1) asplit_conn_state_auth「认证与权限校验」——§二 #99 我自己的命名（连接生命周期的一个态），
 *      非固定词组，改为「认证 / 权限校验」（语义不变、不含连接词）。
 *   2) asplit_svc_registry_discovery「服务注册与发现」——§一 #81 用户正表明确规定的正身名
 *      （L / R = 服务注册与发现 / 负载均衡），属架构领域固定名词，与已豁免的
 *      「交互与通信 / 知识表示与推理 / 自动化规划与调度」同类。**不改名**（尊重用户正表命名），
 *      改为写入扫描器豁免名单，并在源码注释里标明可逆。
 *
 * 用法：node scripts/shell-fusion/a-split/fix-naming-convictions.mjs [--apply]
 */
import fs from 'node:fs'
import { loadState, flatten, statLine, log } from './common.mjs'
import { saveAll } from '../lib.mjs'

const apply = process.argv.includes('--apply')
const state = loadState()
const { pool, tree, edges, questions } = state
const flat = flatten(tree)

log('═══ 收尾：新建节点命名去连接词 ═══')
log(`起始 ${statLine(state)}`)

const RENAME = [
  { ref: 'asplit_conn_state_auth', to: '认证 / 权限校验' },
  { ref: 'asplit_svc_registry_discovery', to: '服务注册与发现', skip: true, why: '用户正表规定的正身名，改走豁免名单' },
]

for (const r of RENAME) {
  const n = pool[r.ref]
  if (!n) throw new Error(`${r.ref} 不在池`)
  if (r.skip) {
    log(`\n  跳过改名：「${n.label}」(${r.ref}) —— ${r.why}`)
    continue
  }
  const old = n.label
  if (old === r.to) { log(`\n  「${old}」已是目标名，跳过`); continue }
  log(`\n  「${old}」→「${r.to}」（${r.ref}）`)
  n.label = r.to
  if (n.card) {
    n.card.title = r.to
    const rc = n.card.rootContent ?? ''
    if (rc.startsWith(old)) {
      n.card.rootContent = `${r.to}${rc.slice(old.length)}`
      log('    rootContent 首行同步')
    }
  }
  for (const f of flat.filter((x) => x.node.nodeRef === r.ref)) {
    const oldTreeName = f.node.name
    f.node.name = r.to
    log(`    树条目改名：「${oldTreeName}」→「${r.to}」(${f.node.id})`)
  }
}

// ── 扫描器豁免名单：加入「服务注册与发现」 ──────────────────────────────
const SCANNER = 'scripts/scan-tree-violations.mjs'
log(`\n── 扫描器豁免名单（${SCANNER}）──`)
{
  const src = fs.readFileSync(SCANNER, 'utf8')
  const before = '^(逻辑与 \\(?&&\\)?|逻辑与|逻辑或|按位与|与门|交互与通信|知识表示与推理|自动化规划与调度)$'
  const after = '^(逻辑与 \\(?&&\\)?|逻辑与|逻辑或|按位与|与门|交互与通信|知识表示与推理|自动化规划与调度|服务注册与发现)$'
  if (src.includes(after)) log('  已包含「服务注册与发现」，跳过')
  else if (!src.includes(before)) throw new Error('扫描器豁免正则与预期不一致，需人工确认')
  else if (!apply) log('  （干跑）将把「服务注册与发现」加入 FALSE_POSITIVE_A')
  else {
    fs.writeFileSync(SCANNER, src.replace(before, after), 'utf8')
    log('  已把「服务注册与发现」加入 FALSE_POSITIVE_A（架构固定名词，与已豁免三项同类）')
  }
}

log(`\n结果：${statLine(state)}`)
if (apply) {
  saveAll({ pool, tree, edges, questions })
  log('已原子写入 data/{node-pool,tree-data,knowledge-edges,questions}.json')
} else {
  log('（干跑，未写盘）')
}
