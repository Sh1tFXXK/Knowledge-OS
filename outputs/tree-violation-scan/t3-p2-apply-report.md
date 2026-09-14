# T3-P2 预检 / 落盘报告（MyBatis 4 条卸树留池）

- 批次：`t3-p2`　模式：**apply**　生成：2026-09-14T15:27:16.145Z
- 宿主：`tree_java_fw_mybatis`（Mybatis，池 `k_java_fw_mybatis`）
- 目标：4 条 —— `tree_java_fw_mybatis_executor` · `tree_java_fw_mybatis_statement_handler` · `tree_java_fw_mybatis_parameter_handler` · `tree_java_fw_mybatis_resultset_handler`

## 操作

| 文件 | 动作 |
|---|---|
| `data/tree-data.json` | `detachChild ×4`，保留其余 11 个子原顺序 |
| `data/knowledge-edges.json` | 按**精确 id** 删 4 条 treebind 边 |
| `data/node-pool.json` | **零改动** |
| `data/questions.json` | **零改动** |
| `data/evolution-events.json` | +1 事件 |

## 闸门

| # | 闸门 | 结果 | 详情 |
|---|---|---|---|
| G1 | 4 个目标存在 ∧ 均为宿主直接子 ∧ 均为叶子（childCount=0 ⇒ 无需提级） | ✅ PASS | 直接子=true · 均叶子=true |
| G2 | 宿主子数恰为 15 | ✅ PASS | 实测 15 个：tree_vault_javamybatismybatis_14eqlq, tree_vault_javamybatis02sqlsession_5c5wcf, tree_vault_javamybatis03mybatis_17ypok, tree_vault_javamybatis06mybatisspring_wq41yx, tree_vault_javamybatis07mybatis_leuyf9, tree_vault_javamybatisplus_1srs85, tree_vault_javamybatisplusmybatisplus_193zda, tree_vault_javamybatismybatis_1pkfbo, tree_vault_javamybatis_p3kuh0, tree_java_fw_mybatis_mapper, tree_java_fw_dynamic_sql, tree_java_fw_mybatis_executor, tree_java_fw_mybatis_statement_handler, tree_java_fw_mybatis_parameter_handler, tree_java_fw_mybatis_resultset_handler |
| G3 | 4 条 treebind 边按精确 id 各命中 1 条 ∧ 端点均在池 | ✅ PASS | 命中 4/4 · 端点均在池=true |
| G4 | ⚠️ 口径登记：宿主 treeId 不含冒号 ⇒ split(':') helper 对本批**恰好有效**（删除 4 条） | ✅ PASS | helper 报告删除 4 条（P0.1 时任宿主 id 含冒号 ⇒ 报 0）· 本脚本仍用精确 id 匹配（同一 idiom + 不依赖已知有缺陷的 helper）· 全库 id 分段>2 的 treebind 边仍为 2665 条，对 helper 一律失效 |
| G5 | 4 个池实体保留 ∧ 网格 mybatis_plugin_grid atom 4/4 可解析 ∧ 4 个目标 atom 全在 | ✅ PASS | 实体保留=true · 网格 atom=4（P0.1 为 4 含 1 非本批；本批 4/4 全为本批目标）· 可解析 4 · 目标全在=true |
| G6 | 引用闭合：池/题库 0 残留 ∧ 审计**叙述外**0 残留 ∧ 边侧命中恰为将删的 4 条 ∧ 端点引用 0 | ✅ PASS | 池/题库残留=0 · 审计叙述外残留=0 · 叙述内命中（§3.6 容许、计入不判负）=4 · 边侧命中 4 条且均在删除清单=true · source/target 引用=0 |
| G7 | 宿主剩余 11 个子顺序保持 ∧ 其余边逐字节不变 ∧ count 全树不变 | ✅ PASS | 顺序=true · 其余边逐字节=true · count=true |
| G8 | node-pool 与 questions **零改动**（池实体保留 = 本批不改池） | ✅ PASS | pool 克隆后完全相等=true · questions 不在写集内 |
| G9 | 预期 diff：树 3216→3212 · 边 4163→4159 · 池不变 3855 | ✅ PASS | 实测 树 3212 · 边 4159 · 池 3855 |
| G10 | 4 个 treeId 在树中 0 残留 | ✅ PASS | 实测残留 0 个 |
| G11 | tree 节点 nodeRef 悬空 = 0（本批前 0 → 后 0） | ✅ PASS | 实测 0 |
| G12 | 本批引入的新未解析 treebind 边 = 0（既有债 18 条不归本批） | ✅ PASS | 前 18 → 后 18 · 新增 0 |
| G13 | 全库 viewDimensions atom 悬空 = 0（248 个 atom） | ✅ PASS | 前 0 → 后 0 · atom 总数 248 |
| G14 | 三个待写文件的末尾换行状态延续 | ✅ PASS | {"tree":false,"edges":false,"evo":false} |
| G15 | dev server / preview 未在写数据端口监听（防内存态回写覆盖） | ✅ PASS | 已探测，未发现 5173/4192 监听 |

**闸门结论：15/15 —— 全绿**

## 基线

```
before: {"treeNodes":3216,"edges":4163,"pool":3855,"tbTotal":2665,"tbUnresolved":18,"atomTotal":248,"atomDangling":0,"refDangling":0}
after : {"treeNodes":3212,"edges":4159,"pool":3855,"tbTotal":2661,"tbUnresolved":18,"atomTotal":248,"atomDangling":0,"refDangling":0}
```

## 宿主 children

```
before(15): tree_vault_javamybatismybatis_14eqlq
  tree_vault_javamybatis02sqlsession_5c5wcf
  tree_vault_javamybatis03mybatis_17ypok
  tree_vault_javamybatis06mybatisspring_wq41yx
  tree_vault_javamybatis07mybatis_leuyf9
  tree_vault_javamybatisplus_1srs85
  tree_vault_javamybatisplusmybatisplus_193zda
  tree_vault_javamybatismybatis_1pkfbo
  tree_vault_javamybatis_p3kuh0
  tree_java_fw_mybatis_mapper
  tree_java_fw_dynamic_sql
  tree_java_fw_mybatis_executor
  tree_java_fw_mybatis_statement_handler
  tree_java_fw_mybatis_parameter_handler
  tree_java_fw_mybatis_resultset_handler
after (11): tree_vault_javamybatismybatis_14eqlq
  tree_vault_javamybatis02sqlsession_5c5wcf
  tree_vault_javamybatis03mybatis_17ypok
  tree_vault_javamybatis06mybatisspring_wq41yx
  tree_vault_javamybatis07mybatis_leuyf9
  tree_vault_javamybatisplus_1srs85
  tree_vault_javamybatisplusmybatisplus_193zda
  tree_vault_javamybatismybatis_1pkfbo
  tree_vault_javamybatis_p3kuh0
  tree_java_fw_mybatis_mapper
  tree_java_fw_dynamic_sql
```

## 网格保留核对

- `k_java_fw_mybatis.viewDimensions[`mybatis_plugin`].sections[`mybatis_plugin_grid`]`
- atom（4 个，本批不改池 ⇒ 逐字不变）：`asplit_mybatis_executor` · `asplit_mybatis_statement_handler` · `asplit_mybatis_parameter_handler` · `asplit_mybatis_resultset_handler`
- 全部可解析：4/4

## 落盘

- 备份目录：`data/backups/t3-p2-2026-09-14T15-27-15-288Z`（5 个数据文件全量副本）
- 写后复验：**REAL_APPLY_VERIFIED**
```
{
  "fileVerified": {
    "treeNodes": 3212,
    "edges": 4159,
    "pool": 3855
  },
  "treeNodesRemoved": 4,
  "treeIdsResidual": [],
  "hostChildrenAfter": [
    "tree_vault_javamybatismybatis_14eqlq",
    "tree_vault_javamybatis02sqlsession_5c5wcf",
    "tree_vault_javamybatis03mybatis_17ypok",
    "tree_vault_javamybatis06mybatisspring_wq41yx",
    "tree_vault_javamybatis07mybatis_leuyf9",
    "tree_vault_javamybatisplus_1srs85",
    "tree_vault_javamybatisplusmybatisplus_193zda",
    "tree_vault_javamybatismybatis_1pkfbo",
    "tree_vault_javamybatis_p3kuh0",
    "tree_java_fw_mybatis_mapper",
    "tree_java_fw_dynamic_sql"
  ],
  "droppedEdgesConfirmed": [
    "treebind:tree_java_fw_mybatis:tree_java_fw_mybatis_executor",
    "treebind:tree_java_fw_mybatis:tree_java_fw_mybatis_statement_handler",
    "treebind:tree_java_fw_mybatis:tree_java_fw_mybatis_parameter_handler",
    "treebind:tree_java_fw_mybatis:tree_java_fw_mybatis_resultset_handler"
  ],
  "droppedEdgesResidual": [],
  "poolEntitiesKept": [
    "asplit_mybatis_executor",
    "asplit_mybatis_statement_handler",
    "asplit_mybatis_parameter_handler",
    "asplit_mybatis_resultset_handler"
  ],
  "gridAtomsUnchanged": true,
  "gridAtomsResolvable": "4/4",
  "atomDanglingGlobal": 0,
  "nodeRefDangling": 0,
  "poolBytesUnchanged": true,
  "verdict": "REAL_APPLY_VERIFIED"
}
```
