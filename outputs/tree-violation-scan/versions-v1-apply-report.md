# versions-v1 apply 报告

- 运行时刻：2026-09-15
- 模式：APPLY（已落盘）
- 预检：G1-G9（见上方控制台输出，失败数 0）
- 落盘：data/version-chains.json 新建（2 链 / 6 节点：java-v8→v11→v17、spring-framework-v4.0→v5.0→v6.0）
- 落盘：data/knowledge-edges.json 4161→4163（+2 requires 边：v5.0→java-v8、v6.0→java-v17）
- 自检：S1-S5（既有 4161 条边逐条深比较不变）
- 纪律：未向 evolution-events.json 写入任何操作日志事件（evolution-v2 治理规则）
- 种子裁决：Spring v4.0/v5.0/v6.0（对齐既有事件轨道 2013-12/2017-09）；requires ×2 覆盖多对一（java-v8 被两个版本依赖）
