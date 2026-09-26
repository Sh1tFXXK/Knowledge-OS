# 集合框架内容吸收 — 落盘报告（COLLECTIONS-TUTORIAL-ABSORB）

- 日期：2026-09-19 ｜ 状态：**COMMITTED**
- 裁决：D1=A 双删 · D2=删镜像 tab 留 rootContent 3 句 · D3=Enumeration 不建题（Iterator 填充加边界句）· D4=不引入 BitSet

## 动作清单（23 步，apply.mjs）

| 类 | 内容 | 量 |
|---|---|---|
| 节点填充 | Iterator(336字)/Comparator(248字)/HashSet(863字)/数据结构(104字) | 4 |
| 根节点 | 删镜像 tab（7645 字逐字节重复）+ rootContent 压缩 3 句（141 字） | 1 |
| 并入既有题 | pmbik3/t70ahn/2gd38c/6wwncp/msn0mabd2s/y1yig4/c240yt/msn0mabe2t | 8 |
| 新增题 | WeakHashMap 机制 / Collections 算法 / EMPTY_* 常量 / 迭代器步骤 / Hashtable vs HashMap | 5 |
| 笔误修复 | 题干 Listlterator→ListIterator；tab label LinkenHashMap→LinkedHashMap | 2 |
| dump 双删 | Java 集合框架(20165字) / Java 数据结构(7862字)，摘 2 treebind + 1 implements 边 | 2 实体 |

**Vector vs ArrayList 裁决修正**：routing-plan 原计划新增，实测 `q_1786353277269_msn0mabe2t`「Vector,ArrayList, LinkedList的区别是什么？」为同指，改为并入（answer 补"Vector 因方法级同步…被取代"）。新增题 6→5。

## 数字对账

```
树节点   3201 → 3199（-2 dump）
池实体   3850 → 3848（-2 dump）
关系边   4155 → 4152（-2 treebind -1 implements）
问题      785 → 790（+5 新增，0 删）
子树       49 → 47 节点，tab 64 → 63，教程 dump 27.8k 字清除
```

## 验证（54/54 全绿）

- V1 dump 三摘除（池/树/边）✅
- V2 四填充关键词断言 ✅
- V3 根镜像 tab 删 + 3 句 ✅
- V4 八并入追加 + 两笔误 ✅
- V5 五新题 schema/kind/difficulty/质检（无 runoob/序号表格/`<br>`）✅
- V6 题库 id 无重复、relatedNodeId 无悬挂 ✅
- V7 孤儿扫描 223 单元：203 有落点，20 孤儿**全部审阅为可丢弃类**（D4 BitSet/表格叙事/优点缺点清单/代码行/教程叙事），12 实质知识点 12/12 有落点 ✅
- 门禁：tsc 无错（build 内含）· vite build 56.56s ✅ · npm test 68/68 ✅

## 追溯

- 原文备份：`data/backups/collections-dump-backup-1789828459554.json`（D1=A 删除前快照，勿回灌）
- 脚本：`scripts/collections-absorption/apply.mjs`（apply）/ `verify.mjs`（独立验证）
- 半拉子 `import-patch.json` 已作废（answer 串表格工件），本批次按 preflight-absorption.md §二 重做
