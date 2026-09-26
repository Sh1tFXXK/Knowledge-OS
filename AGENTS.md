# AGENTS.md — 代理工作约定

## UI 不写单元测试，改完自己测

- **UI（组件 / 视图 / 交互层）不新增单元测试**。不为 `.tsx` 视图、交互行为、画布渲染写 `*.test.*`；`npm test` 只留给纯逻辑（`src/knowledge/*`、store 纯函数、数据校验）。
- UI 改动的验收方式：**先写 todolist（每条 = 一个可观察的验收点，随回复同步给用户），然后自己起服务用无头浏览器逐条实测**，测完销毁一次性脚本。固定套路：
  1. `npm run build` + `npx vite preview --port 4192 --host=127.0.0.1`（须带 `CODEBUDDY_SAFE_DELETE_ENABLED=0`；`KNOWLEDGE_OS_DATA_DIR` 指向临时数据目录，**不许打真数据**）；
  2. 无头 Chromium（`%LOCALAPPDATA%\ms-playwright\chromium-1187\chrome-win\chrome.exe`，带 `--headless=new --no-sandbox --disable-gpu --remote-debugging-port=<port>`）+ 原生 WebSocket 走 CDP；屏蔽 `*fonts.googleapis.com*`；
  3. React 18/19 合成事件用 `dispatchEvent(new MouseEvent('click',{bubbles:true}))`，受控 input 用原生 value setter + `input` 事件；`window.confirm` 改写为 `() => true`；
  4. 每条 todolist 项给出断言结果（DOM 数量 / class / 文案），并**刷新后复测一次**验证持久化；
  5. 跑 `npx tsc --noEmit` + `npm run build` + `npm test`，全绿才算完；临时产物（探针脚本、截图、临时数据目录）用后即删。

<!-- agit:begin -->
## Session version control (agit)

Use these rules when the user requests an AgentGit operation or `AGIT_SESSION` or
`AGIT_MERGE_TX` identifies the current managed session. Otherwise continue the
user's task without agit checks, transcript discovery, or session adoption.
The working directory and this file alone do not activate AgentGit.

- Inspect `agit status --json` when the requested operation needs session or workspace state. An adopted session still needs an explicit `<owner/repo>@<branch>` or `AGIT_SESSION`; directory bindings and native runtime IDs do not select it.
- Settle completed phases with `agit commit <owner/repo>@<branch> --milestone "<summary>"` (add `--code` when relevant). Importing a session does not set `AGIT_SESSION` in the calling process.
- If resumed as a merge agent, follow the `AGIT_MERGE_TX` protocol in the agit skill.
- Never rebase or force-push AgentGit history; remove context with `agit revert <owner/repo>@<branch>#n.k`. `@` requires `AGIT_SESSION`.
<!-- agit:end -->
