# db-key-constraint-relocation · UI 探针（MVBatch-1）

- 生成时间：2026-09-16T16:46:53.168Z
- 环境：`vite preview` @ http://127.0.0.1:4192（`KNOWLEDGE_OS_DATA_DIR=.tmp-mv1-data` 临时数据目录，**不打真数据** · `CODEBUDDY_SAFE_DELETE_ENABLED=0`）
- 浏览器：无头 Chromium（chromium-1187，`--headless=new --no-sandbox --disable-gpu`）+ 原生 CDP
- 屏蔽：`*fonts.googleapis.com*`
- 判定：**UI_VERIFY_PASS**（6/6）

| # | 断言（可观察验收点） | 结果 | 读数 |
|---|---|:--:|---|
| A1 | 宇宙树渲染 · 根节点 知识宇宙 存在 | ✔ | title=Knowledge OS v3.0 已挂树节点=3204 banner=true |
| A2 | 数据库结构 下出现 键与约束 / key & constraint | ✔ | label=键与约束 / key & constraint |
| A3 | 键与约束 6 孩 id 顺序 = 裁决清单 | ✔ | ids=["tree_concept_surrogate_key","tree_concept_natural_key","tree_concept_unique_key","tree_concept_foreign_key","tree_concept_not_null_constraint","tree_concept_guid"] |
| A4 | 数据库 一级孩子数 = 24 且不再含 6 个已迁移 id | ✔ | count=24 moved=[] |
| A5 | 选中 键与约束 无错误边界 / 无**错误级**数据横幅（瞬时 warning 仅记录不判负） | ✔ | errBoundary=false errBanner=false anyBanner=true |
| A6 | 刷新后复测：容器仍在 · 数据库一级 24 · 迁移项不回归 | ✔ | present=true count=24 movedAbsent=true |

- A6 为「刷新后复测」（AGENTS.md 纪律：每个验收点刷新后复测一次）。
- 本探针为一次性脚本，断言留档后即删；临时数据目录 `.tmp-mv1-data` 用后即删。


> 观察项（非本批原因）：页面存在 `data-load-banner is-warning`——「node-pool.json：495 个节点的 card.tabs 为空数组（合法：仅入池、尚未填正文）」。属既有合法状态（DataLoadBanner 只在有 failures/warnings/missing 时渲染），本批未写入池，与 MVBatch-1 无关。
