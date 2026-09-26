# DEDUP-DUAL-COPY-NORMALIZED · UI 无头实测

> ✅ **状态：已执行（2026-09-24 02:0x–02:10 GMT+8）。**
> 执行通道恢复后实跑，**12/12 PASS**，未捕获页面异常 **0**、console error **0**。
> 本文件已由待跑执行单改写为实测证据。⚠️ 其中 **T7 的断言形态被改写**，原因与替代断言见下文「T7 改写说明」——原始断言在本应用里不可判定，不是被悄悄放宽。

## 方法（按 AGENTS.md 固定套路）

1. `npm run build`（退出码 0）
2. `npx vite preview --port 4192 --host=127.0.0.1`，环境 `CODEBUDDY_SAFE_DELETE_ENABLED=0`、`KNOWLEDGE_OS_DATA_DIR=E:/project/Knowledge-OS/.tmp-ui-data-dedup`
3. 无头 Chromium：`%LOCALAPPDATA%\ms-playwright\chromium-1187\chrome-win\chrome.exe --headless=new --no-sandbox --disable-gpu --remote-debugging-port=9333`，原生 WebSocket 走 CDP；`Network.setBlockedURLs` 屏蔽 `*fonts.googleapis.com*` / `*fonts.gstatic.com*`
4. 交互：React 合成事件用 `dispatchEvent(new MouseEvent('click',{bubbles:true}))`；受控 input 用原生 value setter + `input` 事件
5. 探针脚本一次性（`.tmp-uiprobe-dedup.mjs` + `.tmp-chrome-profile-dedup/`），**用后即删**；断言与结论留在本文件

## 被测数据的可靠性（已先证明）

临时数据目录六文件 = 落盘后真源**逐字节副本**（`Buffer.compare === 0`），sha256 前缀：

| 文件 | 字节 | sha256(前16) |
|---|---|---|
| tree-data.json | 1943524 | `12be53e1d05af88b` |
| node-pool.json | 11734824 | `c81c7dceafbf18f2` |
| knowledge-edges.json | 1138695 | `e6f4d5e73bce16b8` |
| questions.json | 1403138 | `90d9dce9b9604a91` |
| evolution-events.json | 3773 | `4319cbdffa2994bb` |
| version-chains.json | 2157 | `0b6a4924654c3c0b` |

并用 `GET /api/data?file=node-pool.json` 复核服务端实际吐出的数据：`http 200 · 11734824 bytes · 与磁盘逐字节相等 · sha256 c81c7dce…` ⇒ **实测打在本批真正写进 `data/` 的那份数据上**，不是批前快照、也不是另造样本。

## 实测结果（12/12）

| 项 | 断言 | 结果 | 实测读数 |
|---|---|---|---|
| T0 | 应用加载无未捕获异常 | ✅ PASS | `pageExceptions=0 · consoleErrors=0 · title="Knowledge OS v3.0"` |
| T0b | 节点库导航可点击 | ✅ PASS | `nav=clicked:6`（`.header-nav-item` 共 6 个） |
| T1 | **tab 分支** `aop_aproxy` 取的是 tab 正文 | ✅ PASS | 锚点 3/3（`AopProxy` / `InvocationHandler` / `proceed()`）· 页签元素 0 可见 / 0 总 · **命中 `rootContent` 开头 = true** · bodyLen 229 |
| T2 | **root 分支** `asplit_bias_acquire` 保留 root 且未丢标题行 | ✅ PASS | 锚点 2/2（`线程进入同步代码块` / `偏向锁的入口事件`）· 命中 root 开头 = true · bodyLen 41 |
| T3 | **tie 分支** `demo_lock` | ✅ PASS | 锚点 2/2（`MySQL 锁机制` / `MyISAM / MEMORY 采用表级锁`）· 命中 root 开头 = true · bodyLen 196 |
| T4 | 空 tabs 卡不渲染空页签外壳 | ✅ PASS | 页签外壳 0 · 空面板 0 · `#card-content-body` 存在 · 走此路径的空 tabs 卡共 **1358** 张（本批 802 + 既有 556） |
| T5 | 节点库卡片预览有标题 + 正文、无 `undefined` | ✅ PASS | `aop_aproxy`(标题 15 字 / 预览 103 字) · `asplit_bias_acquire`(9 / 40) · `demo_lock`(9 / 103) · `undefined=false` |
| T6 | 刷新后 T1–T3 复现 | ✅ PASS | 刷新后三路锚点仍 3/3、2/2、2/2，root 开头全部命中 · `nav=clicked:6` · 刷新后 `pageExceptions=0` |
| T7 | 邻卡未被误伤 | ✅ PASS | 样本 5/候选 707，逐张 `rootHit=true`：`demo_acid`(tabs=4, bodyLen 1226) · `k_java_type_13961f0829a4b13a`(1, 120) · `k_java_type_3f228f7655fb94df`(1, 537) · `k_dict_qttpkbhf`(2, 156) · `concept_cardinality`(2, 76) |

汇总：`PASS 12 / 12` · `未捕获页面异常 pageExceptions = 0 · consoleErrors = 0`。

## T7 改写说明（重要，请复核）

**原始断言不可判定。** 起草版写的是「每张页签按钮数 = `card.tabs.length`」。实测取证发现：

- `defaultExplanationSelection()`（`src/knowledge/explanationIndex.ts:106-120`）**无论有没有 tab 都 `return { kind: Root }`**；
- 全 `src` 里不存在「卡内页签条」组件（`.explanation-card` 内 `class` 含 `tab` 且非 `table` 的元素实测为 **0**）。

⇒ 读态解释卡**根本不渲染页签按钮**，「页签按钮数」恒为 0，原断言对任何卡都成立（无判别力），因此不能作为证据。

**替代断言（更严，非放宽）**：现场抽 5 张**未被本批触碰、且仍带非空 tabs** 的邻卡（逐张取证 `tabs.length` 与 `rootContent`，不预设名单；且要求 label 全库唯一，避免点开同名卡），逐张断言**解释卡正文逐字命中该卡 `rootContent`**（即读态确实在渲染它自己的 root，本批未溢出到邻卡）。实测 5/5 `rootHit=true`。

## 量具返工记录（诚实性）

首跑 10/12，两个 FAIL 都是**探针的量具缺陷，不是应用缺陷**，已修后复跑至 12/12，未改任何期望值：

1. **T5** 首跑 FAIL：卡片视图按钮是 `button[title="卡片视图"]`（文案是 `▦`，不含「卡片」二字），按文本找找不到 ⇒ 改按 `title` 定位；并在 T5 结束后切回 `button[title="表格视图"]`，否则后续 T7 取不到表格行。
2. **T7/T3** 首跑 FAIL：拿 `rootContent` 原文去比对渲染文本，忽略了 `MarkdownView` 会渲染掉 `**粗体**`、`#` 标题、`<!-- 注释 -->`、列表符号 `- ` 及空格 ⇒ 增加归一化（去 HTML 注释 → 去行首列表符号 → 去 `*#>\`|` → 去全部空白）后两侧一致。
3. 附带修正：按 label **子串**匹配表格行会点开同名另一张卡（如 `Array`、`ACID`）⇒ 改为首列**精确匹配**。

## 为什么必须实测（不能只看 JSON）— 结论

1. 解释卡**确实在渲染 `rootContent`**（三路分支锚点全部命中，且正文开头逐字等于 `rootContent`），没有去读已清空的 `tabs[0].content`；
2. `tabs: []` **确实走空回退**（1358 张卡共同路径，无空页签外壳、无空面板、0 异常）；
3. 三路「取哪一侧」在 UI 上可分：T1 取 tab 侧（正文含 `InvocationHandler` / `proceed()`，这类内容只存在于原 tab）、T2 保留 root 且标题行未丢、T3 取平手下的 root。

## 派生发现（不在本批范围）

`defaultExplanationSelection` 恒返回 Root + 无卡内页签条 ⇒ 全库 **1644 张**「tabs 非空但 `rootContent` 为空」的卡在解释卡读态是**空白**的。本批 802 张已全部把内容搬进 root（该项实测 **0/802**），剩余 1644 张是既有现象，建议单独立项。
