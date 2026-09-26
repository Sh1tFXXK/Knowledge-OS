# STRIP-TAB-FOOTERS · tab 面注入尾注清理 落盘报告

- 日期：2026-09-19 ｜ 状态：**COMMITTED**
- 定位：正文面 strip-injected-artifacts（477545e，287 尾注+418 标题）的同逻辑，**作用域从 rootContent 换 tab**

## 规模实测

```
tab 总数        4073
命中 tab         299
尾注总数         301
受影响实体       296
负对照（含「来源」但非注入形态，保持原样）  47 tab
```

## 变换（逐 tab，仅命中才改）

1. 剥尾注：`/来源：原始行：\d+；官方锚点：https?:\/\/\S+/g` 移除
2. 收空白：仅命中 tab `/ {2,}/g→' '`（不动换行）+ trim，消化剥尾注残留双空格（645 字符）

## 明确不做（防越界，与正文面同纪律）

- 不动 rootContent（正文面已清）
- **不做标题去重**（标题注入只在正文面，tab 面无 `T **T**` 形态）
- 不动合法「来源」散文 / JDK 绝对路径形态（47 tab 负对照保留）

## 验证（6 门全绿）

- G1-G3 命中数与实测一致（299/301/296）
- G4 变换后注入尾注清零
- G5 实体数不变（3845）· G6 rootContent 零改动（只动 tabs）
- npm test 68/68 ✅

## 追溯

- 脚本：`scripts/strip-tab-footers/apply.mjs`
- 姊妹批：正文面 `scripts/plan-strip-injected-artifacts.mjs`（477545e）
