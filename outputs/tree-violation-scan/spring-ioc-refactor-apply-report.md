# SPRING-IOC-REFACTOR · APPLY 报告

- 时间：2026-09-22T11:12:40.638Z
- 数据目录：`E:\project\Knowledge-OS\data`
- 裁决：IoC 解释卡正文（9220 字八股整段）拆解融合入库——按事实归属融进现有节点卡，已覆盖不重复

## 源门禁

| 项 | 说明 | 结果 | 读数 |
|---|---|---|---|
| G1 | IoC容器八股正文在位（rootContent >9000 字且含原文标记，防重复执行） | PASS | len=9220 |
| G2 | 「本质」def 为八股碎片在位（含原文「程序猿」标记） | PASS | rootLen=32 |
| G3 | ApplicationContext 尚无「对比补充」tab（id=vs-beanfactory） | PASS | tabs=def |
| G4 | 自动装配 rootContent 缺失（card.tabs 已有 4 个全内容 tab，正文槽空） | PASS | typeof=undefined tabs=4 |
| G5 | 生命周期 stages tab 为旧段落格式在位（含失效插图引用「下图展示了」） | PASS | marker=下图展示了 |
| G6 | 依赖注入方式 overview 第 4 条仍写「（较少使用）」 | PASS | marker=较少使用 |
| G7 | 6 个目标实体全部在位 | PASS | spring_ioc=true 569_fqwfp2=true appcontext=true 872_rsqoiy=true 066_ds8pn6=true 852_lhoemy=true |

## 预检

| 项 | 说明 | 结果 | 读数 |
|---|---|---|---|
| P1 | IoC容器 rootContent 已拆解（<2000 字、不再含八股标记「单例bean是线程安全的吗」「自动装配有哪些局限性」） | PASS | len=547 |
| P2 | IoC容器 def tab 已重写且不含八股标记 | PASS | len=214 |
| P3 | 「本质」def 结构化且含 3 条作用 + 4 条优点；rootContent 同步 | PASS | markers=作用3+优点4 |
| P4 | ApplicationContext 新 tab 在位且含「手动注册 / 自动注册」对比 | PASS | tab=vs-beanfactory |
| P5 | 自动装配 rootContent 已补（含五种模式 + @Autowired 过程 + 局限） | PASS | len=522 |
| P6 | 生命周期 stages 为编号列表、无失效插图引用、BeanPostProcessor 措辞已更正 | PASS | steps=1..9 |
| P7 | 依赖注入方式 overview 接口注入注记已订正 | PASS | marker=Spring 4 起已废弃 |
| P8 | 全池 diff：改动实体恰为声明的 6 个，0 新增 0 删除 | PASS | ~ k_1784453158872_rsqoiy ~ k_1785225243066_ds8pn6 ~ k_java_fw_spring_ioc ~ k_1788681463569_fqwfp2 ~ k_1788687205852_lhoemy ~ spring_appcontext |
| P9 | 计数：树 / 池 / 边 数量全不变（内容级批，0 结构改动） | PASS | 树 3222→3222 池 3866→3866 边 4156→4156 |
| P10 | 演化事件文件零改动（2026-09-15 裁决） | PASS | 字节 3773 逐字节相等 |

## 计数

- 前：树 3222 / 池 3866 / 边 4156
- 后：树 3222 / 池 3866 / 边 4156（内容级批：0 新建节点 / 0 树改动 / 0 边改动）
- 演化事件：**未写入**（2026-09-15 裁决）—— 落盘前后逐字节比对**相等**

## 操作日志

- IoC容器 rootContent 9220 字 → 547 字导览正文；def tab 重写
- 「本质」def 八股碎片 → 结构化「IoC 的作用 / 优点」；rootContent 对齐
- ApplicationContext 新增 tab「与 BeanFactory 的对比补充」（创建方式 + 后处理器注册差异）
- 自动装配补 rootContent 正文 522 字（蒸馏自其既有 4 tab，无新事实）
- 生命周期 stages 段落 → 编号 9 步列表；删失效插图引用「下图展示了」；BeanPostProcessor 措辞由「bean 实现」更正为「容器注册」（事实修正，报告披露）
- 依赖注入方式 overview：接口注入注记「较少使用」→「自 Spring 4 起已废弃」
- 不动作（已覆盖，诚实融合）：作用域 5 种+线程安全（含 ThreadLocal 段）/ BeanFactory / IoC 原理 / 通用层 控制反转·依赖注入 / Spring Beans（bean 定义·inner bean·元数据）
- ⚠️ 不写 evolution-events.json —— 2026-09-15 裁决（git + batch-manifests 承载）

## 事实修正披露

- 生命周期 stages 重排时，原文「如果 bean 实现了 BeanPostProcessor 接口」更正为「容器注册的 BeanPostProcessor」——BeanPostProcessor 是容器级后置处理器，不是每个 Bean 实现一次的接口；同卡 def tab 的扩展点表述（BeanFactoryPostProcessor、BeanPostProcessor 等）原本就是正确的。
- 原文「接口注入从 Spring 4 开始已被废弃」落为依赖注入方式 overview 第 4 条注记（原为「较少使用」）。
