# T3-P2 UI 实测报告

- 目标：MyBatis 宿主 → 「视图」tab → 4 个插件点 atom 仍可见（**不能只看 JSON**）
- 方法：`npm run build` → `vite preview`（只读真数据）→ 无头 Chromium CDP
- 生成：2026-09-14T15:34:16.085Z

| # | 断言 | 结果 | 详情 |
|---|---|---|---|
| U1 | DOM 中 [data-tree-node-id] = 3212（全树，折叠仅靠 CSS） | ✅ PASS | 实测 3212（首帧等满 3212） |
| U2 | 4 个被卸节点在 DOM 中 0 残留 | ✅ PASS | 残留 [] |
| U3 | 宿主 tree_java_fw_mybatis 仍在 DOM | ✅ PASS | hostPresent=true |
| U4 | 可点中宿主行「Mybatis」 | ✅ PASS | picked=true |
| U5 | **4 个插件点 atom 在维度视图里全部可见**（卸树后走池渲染） | ✅ PASS | 命中 4/4 —— Executor（插件点） · StatementHandler（插件点） · ParameterHandler（插件点） · ResultSetHandler（插件点） |
| U6 | atom 总数 ≥ 4（网格确实渲染出卡片） | ✅ PASS | dc-atom-card=5 · dc-atom-label=4 |
| U7 | 刷新后 DOM 仍 3212 ∧ 4 个被卸节点仍 0 残留 ∧ 宿主仍在 | ✅ PASS | rows=3212（等满 3212） removed=0 host=true |
| U8 | 刷新后重走一遍：4 个 atom 仍全部可见 | ✅ PASS | picked=true · 命中 4/4 |
| U9 | /api/data 面：树 3212 ∧ asplit_=0 ∧ 4 个被卸 id 不存在 ∧ 宿主 children=11 | ✅ PASS | count=3212 asplit=0 removed=0 hostChildren=11 |
| U10 | 全过程 0 未捕获异常 | ✅ PASS | 0 |

## 结论

```
UI_VERIFY_PASS 10/10
```

## 关键洞察

维度原子走**池**查表（`GridSection.tsx` 用 `nodePool[atom.nodeId]`），与树挂载无关 ⇒
4 个插件点退出树挂载后，宿主 Mybatis 的「视图」里 `mybatis_plugin_grid` 网格**照旧完整渲染**。
这是「卸树留池」合法性的唯一无法由数据断言替代的证据。
