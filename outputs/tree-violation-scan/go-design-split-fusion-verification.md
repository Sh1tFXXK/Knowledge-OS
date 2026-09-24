# go-design-split-fusion — 独立验证报告

- 脚本：`scripts/verify-go-design-split-fusion.mjs`（**不 import apply**，从 `data/backups/go-design-split-fusion-2026-09-24T10-40-55-308Z/` 快照反推，期望值独立构建）
- 实跑：2026-09-24 两次（apply 后首跑 + 提交前复跑），**14/14 PASS · failures=0 · 退出码 0**。

## 逐项读数（提交前复跑）

```
PASS  V1 五段独立重切拼回 === before DONOR  [1709 字]
PASS  V3 SURVIVOR 正文 = P1 + P5（剥后）
PASS  V3b HISTORY 正文 = 旧89字 + P2（旧文逐字节保留）
PASS  V3c GENERICS 正文 = 旧620字 + P3（旧文逐字节保留）
PASS  V3d NEW 节点 = P4（Versioning 原文含标题行）
PASS  V3e NEW tags 沿库内惯例
PASS  V4 负对照 3 串不命中
PASS  V4b 杂质全库输出卡零残留
PASS  V5 池 Δ = +1/-0/3 改  [added=k_go_versioning modified=k_1787722763547_no5htk,k_goexplain_design,k_go_generic]
PASS  V5b 池 3871→3872
PASS  V6 go 子 15→16 且新叶子正确
PASS  V6b 摘除新叶子后整树与 before 逐字节等价（树除 go 子外零改动）
PASS  V6c 边 4161→4162 且形态正确
PASS  V6d 既有边零改动
──── VERIFY 汇总 ────  failures=0
```

## 关键断言说明

- **V1**：verify 脚本内**独立重写**五段锚串并从 before DONOR 重新切分，拼回与 DONOR 逐字节相等 ⇒ apply 的切分零造数据。
- **V3b/V3c**：HISTORY / GENERICS 追加段前的旧文逐字节保留（`startsWith(before…)`）⇒ 融合只增不覆盖。
- **V6b**：在 after 树的**深克隆**上摘除新叶子 `tree_1790219617527_m6qc7d` 后与 before 整树逐字节等价 ⇒ 树除 go 子树外零改动（修复过别名污染：不能在原对象上摘）。
- **V4 负对照**：三串库内不存在的内容不命中输出 ⇒ 证明断言非永真。

## 回归

- `npx tsc --noEmit` 退出码 0
- `npm test` 68/68（apply 后实测）
