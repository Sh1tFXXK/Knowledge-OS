# go-design-split-fusion — UI 探针报告

- 套路：dedup 批固定套路。临时数据目录 `.tmp-ui-data-gosplit/`（六文件由 apply 后 data 复制，与真实 data 一致）+ `vite preview 4192`（`/api/data?file=<f>` 服务端复核：池 3872 · 四节点 rootContent 长度 420/363/950/577 与磁盘一致）+ 无头 Chromium CDP 9341，屏蔽 `*fonts.googleapis.com*`。
- 实跑：2026-09-24，**7/7 PASS · pageExceptions 0 · consoleErrors 0**（刷新复测含在内）。

## 断言读数

| # | 项 | 读数 |
| --- | --- | --- |
| T0 | 应用加载无异常 | PASS · pageExceptions=0 consoleErrors=0 |
| T1 | 语言设计卡（SURVIVOR 瘦身） | PASS · len=420 · 含 P1 设计目标 / 反 C++ 动机 / 2015 Pike 讲座 / goroutine 原语 = true/true/true/true |
| T2 | 历史卡（HISTORY 融合） | PASS · len=363 · 含旧 2007 动机 / 2009-11 发布 / 1.0@2012-03 / 工程工作 = true/true/true/true |
| T3 | 泛型卡（GENERICS 融合） | PASS · len=950 · 含旧用法 / 2018 草案 / go2go / 1.18 落地 = true；**CSS 残渣 mw-parser-output = false**（零残留） |
| T4 | 版本策略卡（NEW） | PASS · len=577 · 含兼容承诺 / go1.[major].[patch] / never reach 2.0 = true/true/true |
| T4b | 树上「版本策略」叶子可见 | PASS · 展开 4 层祖先 folder icon 后 visible=true |
| T5 | 刷新后复现 | PASS · 版本策略 / 语言设计均能再次打开 · pageExceptions=0 |

歧义 label 处理：「语言设计」树/表 3 行、「历史」22 行匹配 → `openUntilAnchor(label, anchorTight)` 逐行点开至锚点命中（T1 matchedRow=3 · T2 matchedRow=22），打开的均验证为目标卡（len 与磁盘 rootContent 长度一致）。

## 量具修复记录（两处，均为探针缺陷，未改期望值）

1. **T1 锚串漏括号**：原文「轻量级进程（goroutines），通道和select语句」中 `goroutines` 后有 `）`，首版锚串写作 `goroutines，通道和select语句` → includes 恒假。修为含括号全串。
2. **T4b 展开方式**：树展开交互在 `.tree-node-icon--folder`（role=button，`setIsOpen` 本地 state，默认折叠；`aria-expanded` 判别）；点击 `.tree-node-row` 只是 onSelect 不展开。首版点行 6 次仍 visible=false；改为自底向上收集未展开的 folder icon（4 个）逐个 dispatch click 后 visible=true。

## 临时产物处置

探针脚本 `.tmp-uiprobe-gosplit.mjs`、临时数据目录 `.tmp-ui-data-gosplit/`、Chrome profile `.tmp-chrome-profile-gosplit/` 用后即删（AGENTS.md 约定，验收脚本核心断言已留档本报告）。
