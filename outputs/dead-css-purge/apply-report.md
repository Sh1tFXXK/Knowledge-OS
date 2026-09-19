# DEAD-CSS-PURGE · components.css 死规则清理 落盘报告

- 日期：2026-09-19 ｜ 状态：**COMMITTED**
- 关联侦察债：在案债务「死 CSS ~300 行」（旧侦察 4774-5080 行段，行号已漂移，本批用选择器×引用精确重测）

## 实测规模

```
components.css     5717 → 5047 行（删 670 行）
唯一 class            472
确认死 class           65（动态风险 7 个 is-* 保留）
纯死规则              104 条（24 个连续区段）
```

## 判定纪律（双保险 + 双防护）

1. **零引用**：class 在 `src/**.(ts|tsx|js|jsx)` 全文整词零出现
2. **动态排除**：src 存在 `is-${`/`leaf-${`/`knowledge-os-${`/`text-${`/`link-${`/`token-${`/`mmd-svg-${` 动态拼接 → 该前缀下 class 不删（保护 `is-contains/is-title/is-vertical/is-horizontal/is-root/is-column/is-row` 7 个，实际被 `is-${kind}` 等模板引用）
3. **嵌套防护**：死父规则体内如有活 class 嵌套（原生 CSS 嵌套）→ 整条跳过（本批零触发）
4. **混合选择器不裁剪**：活+死类组合规则保留（如 `.supertag-panel-actions button.is-active`，永不匹配、无害），50 处留待后续

## 死块构成（按功能）

- `supertag-*` 面板（161-273 段）——supertag 面板废弃
- `question-bank/question-list/question-item/status-*`（817-905 段）——旧问题库组件（已被 QuestionDatabase 取代）
- `dc-orthogonal-*` / `dc-field-cloud` / `dc-atom-empty`（2650-2939 段）——旧正交矩阵/语义云视图
- `card-meta-details/card-footer`（746-798）——旧卡详情布局
- `explanation-index-tree/explanation-index-node/leaf/parent-surface`（4774-5075 段）——旧树版索引图（已被 unified graph 取代，unified-* class 全部保留）
- 散点小段（1055/1332/2142/2364/4072/4572/5434 等）

## 验证（6 门 + 门禁 + 冒烟）

- G1-G3 规模断言 · G4 花括号平衡守恒（0→0）· G5 删后纯死规则=0 · G6 活体量守恒
- vite build ✅ · tsc --noEmit ✅ · npm test 68/68 ✅
- preview + 无头 Chromium 冒烟：app 挂载 ✅ · 活样式 20 条在册（explanation-card/universe-tree/right-section）✅ · 死样式仅剩已知混合选择器 1 条 ✅

## 追溯

- 脚本：`scripts/dead-css-purge/apply.mjs`（dry-run 默认，`--apply` 落盘）
- 旧侦察：`outputs/dead-css-audit`（行号漂移作废，以本批选择器级重测为准）
