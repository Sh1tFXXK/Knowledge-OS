# MySQL 锁机制知识 - 多维视角设计

## 🎯 设计思想

Knowledge OS 使用**多维视角**来组织知识，而不是在答案里列举分类。

### 维度（Dimensions）= 过滤镜头

用户可以切换视角，只看某个维度的知识：

1. **operation-type（操作类型维度）**
   - 共享锁（读锁）
   - 排他锁（写锁）

2. **granularity（粒度维度）**
   - 表级锁
   - 行级锁
   - 页面锁

3. **strategy（策略维度）**
   - 乐观锁
   - 悲观锁

4. **engine（存储引擎维度）**
   - InnoDB 支持的锁
   - MyISAM 支持的锁
   - MEMORY 支持的锁

5. **transaction（事务维度）**
   - 与事务隔离相关的锁

6. **performance（性能维度）**
   - 影响性能的锁特性

## 📊 节点设计

每个锁类型都是独立节点，标注所属维度：

```
锁机制 [transaction, performance]
├─ 共享锁 [operation-type, transaction] 
├─ 排他锁 [operation-type, transaction]
├─ 表级锁 [granularity, performance]
├─ 行级锁 [granularity, transaction, performance]
├─ 页面锁 [granularity]
├─ 乐观锁 [strategy, performance]
├─ 悲观锁 [strategy, transaction]
├─ 意向锁 [transaction]
├─ 间隙锁 [transaction]
└─ Next-Key Lock [transaction]
```

## ❓ 问题设计

问题应该细粒度，关联具体节点：

### 操作类型维度的问题
- "什么是共享锁（读锁）？"→ 关联 shared_lock
- "什么是排他锁（写锁）？"→ 关联 exclusive_lock
- "共享锁和排他锁有什么区别？"→ 关联 shared_lock + exclusive_lock

### 粒度维度的问题
- "什么是表级锁？"→ 关联 table_lock
- "什么是行级锁？"→ 关联 row_lock
- "表级锁和行级锁如何选择？"→ 关联 lock_granularity_comparison

### 策略维度的问题
- "什么是乐观锁？"→ 关联 optimistic_lock
- "什么是悲观锁？"→ 关联 pessimistic_lock
- "乐观锁和悲观锁的使用场景？"→ 关联对比节点

### 综合性问题（总览入口）
- "MySQL 有哪些锁？"→ 关联 lock_mechanism（显示所有子节点）
- "InnoDB 支持哪些锁？"→ 关联 lock_engine_support

## 🔮 视角切换体验

用户在左侧目录树底部的"🔮 多维视图"中切换：

### 切换到"操作类型"视角
关系网络只显示：
- 锁机制 → 共享锁
- 锁机制 → 排他锁
- 共享锁 → 悲观锁
- 排他锁 → 悲观锁

### 切换到"粒度"视角
关系网络只显示：
- 锁机制 → 表级锁
- 锁机制 → 行级锁
- 锁机制 → 页面锁
- 锁粒度对比

### 切换到"性能"视角
关系网络只显示：
- 行级锁 → 高并发
- 表级锁 → 低开销
- 锁粒度对比

## ❌ 错误的做法

```json
{
  "text": "请说一下数据库锁的种类？",
  "answer": "按操作类型分：共享锁、排他锁\n按粒度分：表级锁、行级锁、页面锁\n按策略分：乐观锁、悲观锁"
}
```

这样把所有分类写在一个答案里，无法利用系统的多维视角功能。

## ✅ 正确的做法

```json
// 入口问题
{
  "text": "MySQL 有哪些锁类型？",
  "relatedNodeId": "lock_mechanism",
  "answer": "MySQL 的锁类型可以从多个维度理解。点击左侧目录树的「锁机制」节点，可以看到所有子节点。切换不同的维度视角（操作类型/粒度/策略），可以从不同角度理解锁机制。"
}

// 细粒度问题
{
  "text": "什么是共享锁？",
  "relatedNodeId": "shared_lock",
  "answer": "允许多个事务同时读取同一资源的锁..."
}

{
  "text": "什么是行级锁？",
  "relatedNodeId": "row_lock", 
  "answer": "只锁定表中某一行或某几行的锁..."
}
```

每个问题关联具体节点，用户可以：
1. 点击问题跳转到节点
2. 查看节点的解释卡（定义/机制/边界/来源）
3. 在关系网络中看到该节点的连接
4. 切换维度视角，只看相关的节点

## 🎨 需要添加的自定义维度

除了系统内置的 transaction/storage/performance，我还需要添加：

```typescript
const LOCK_DIMENSIONS: Perspective[] = [
  { id: 'operation-type', name: '操作类型', nameEn: 'Operation Type', color: '#f59e0b' },
  { id: 'granularity', name: '锁粒度', nameEn: 'Granularity', color: '#8b5cf6' },
  { id: 'strategy', name: '锁策略', nameEn: 'Strategy', color: '#ec4899' },
  { id: 'engine', name: '存储引擎', nameEn: 'Storage Engine', color: '#06b6d4' },
];
```

这些维度会显示在左侧目录树底部的"🔮 多维视图"中。
