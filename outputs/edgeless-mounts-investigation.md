# edgeless-mounts 调查报告（只读，零改动）

- 日期：2026-09-19 ｜ 状态：**调查完成，待分批修复决策**
- 口径：非根树节点，其父节点缺对应 `treebind:<parentId>:<childId>` 边

## 总量

```
非根树节点   3200
edgeless     648（20%）
```

## 二分法（按是否有任何边指向其 ref）

| 类 | 量 | 性质 | 样本 |
|---|---:|---|---|
| **完全无边** | **427** | 导入残留——早期 vault/wiki/asplit 导入挂树时未建 treebind | `tree_tpl_flow`、`tree_aop_flow`、`tree_java_common_libraries`、`tree_wiki_en_outline_of_databases` |
| **有其他边** | **221** | 多为**有意**——treebind 用了不同父段，或挂的是 rel/asplit/instance-of 关系边 | `instance-of`（MySQL 实例→概念）、`member-of`、`asplit:s136` |

## 按父 id 前缀分布（top）

```
tree_wiki_en_outline  91   ← wiki outline 导入（未建 treebind）
mysql                 30
governance            26   ← canonical 治理节点（有意，非树包含语义）
projection            26   ← projection: 命名空间（冒号 id，treebind 解析陷阱）
tree_vault_se_patter  23   ← vault 导入
chapter_db_07/11      各20 ← 章节孩子（部分挂树未建边）
demo_db               18
school_security       12
```

## 归因结论

1. **427 完全无边 = 导入残留**。修复方向：补建 treebind 边（`treebind:<parentTreeId>:<childTreeId>`，source=parentRef/target=childRef）。
   - ⚠️ 陷阱：`projection:`/`mysql-term:` 等含冒号 id 不能 `split(':')` 反解父段，须从树结构直接取父 id/ref（G7 冒号安全，预检已记）。
2. **221 有其他边 = 基本有意**（关系边/instance-of/asplit），**不补**，否则会把关系语义错标成树包含。
3. governance canonical（26）是治理挂载点，非知识树包含，**保持 edgeless 属正确**。

## 修复建议（另立批次，不混入治理收尾）

- **批次 A**：427 完全无边 → 脚本按树结构补 treebind（父 ref/子 ref 从树节点直取，绕开冒号 id）。预估 +427 边。
- **排除**：221 有其他边 + 26 governance canonical，不补。
- 本调查**零改动**，仅产出结论。修复需独立批次 + 就绪门。

## 追溯

- 探针：`$TEMP\edgeless*.cjs`（已删，结论可由 tree-data.json + knowledge-edges.json 复现）
