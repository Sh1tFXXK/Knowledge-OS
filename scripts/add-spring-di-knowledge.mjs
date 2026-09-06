import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

// 读取数据文件
const nodePool = JSON.parse(fs.readFileSync(path.join(dataDir, 'node-pool.json'), 'utf-8'));
const treeData = JSON.parse(fs.readFileSync(path.join(dataDir, 'tree-data.json'), 'utf-8'));
const questions = JSON.parse(fs.readFileSync(path.join(dataDir, 'questions.json'), 'utf-8'));

// 生成唯一ID
function generateId(prefix = 'k') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

// 创建Spring依赖注入方式的知识节点
const springDiMethodsNode = {
  id: generateId('k'),
  label: "Spring 依赖注入方式",
  role: "concept",
  dimensions: ["spring", "java", "ioc"],
  card: {
    nodeId: null,
    title: "Spring 依赖注入方式",
    tabs: [
      {
        id: "overview",
        label: "概述",
        content: "Spring框架提供了多种依赖注入（DI）的方式，用于将依赖对象注入到目标Bean中。主要包括：\n\n1. **构造函数注入** - 通过构造函数参数注入依赖\n2. **Setter注入** - 通过setter方法注入依赖\n3. **字段注入** - 直接在字段上使用@Autowired或@Resource注解\n4. **接口注入** - 通过实现特定接口来注入依赖（较少使用）\n\n不同的注入方式适用于不同的场景，需要根据实际需求选择合适的方式。"
      }
    ],
    rootContent: "Spring框架提供了多种依赖注入（DI）的方式，用于将依赖对象注入到目标Bean中。"
  },
  tags: ["Spring", "依赖注入", "IoC", "DI"]
};
springDiMethodsNode.card.nodeId = springDiMethodsNode.id;

// 构造函数注入
const constructorInjectionNode = {
  id: generateId('k'),
  label: "构造函数注入",
  role: "concept",
  dimensions: ["spring", "java", "ioc"],
  card: {
    nodeId: null,
    title: "构造函数注入",
    tabs: [
      {
        id: "def",
        label: "定义",
        content: "通过构造函数参数注入依赖，是最常用的注入方式之一。"
      },
      {
        id: "example",
        label: "示例",
        content: "```java\npublic class UserService {\n    private UserDao userDao;\n    \n    public UserService(UserDao userDao) {\n        this.userDao = userDao;\n    }\n}\n```"
      },
      {
        id: "pros",
        label: "优点",
        content: "- 依赖对象在对象创建时就已经注入\n- 可以声明依赖为final，保证不可变\n- 适合必填依赖\n- 利于单元测试"
      }
    ],
    rootContent: "构造函数注入通过构造函数参数注入依赖，是最常用的注入方式之一。依赖对象在对象创建时就已经注入，可以声明依赖为final保证不可变，适合必填依赖。"
  },
  tags: ["Spring", "构造函数注入", "依赖注入"]
};
constructorInjectionNode.card.nodeId = constructorInjectionNode.id;

// Setter注入
const setterInjectionNode = {
  id: generateId('k'),
  label: "Setter注入",
  role: "concept",
  dimensions: ["spring", "java", "ioc"],
  card: {
    nodeId: null,
    title: "Setter注入",
    tabs: [
      {
        id: "def",
        label: "定义",
        content: "通过setter方法注入依赖，灵活性高。"
      },
      {
        id: "example",
        label: "示例",
        content: "```java\npublic class UserService {\n    private UserDao userDao;\n    \n    public void setUserDao(UserDao userDao) {\n        this.userDao = userDao;\n    }\n}\n```"
      },
      {
        id: "pros",
        label: "优点",
        content: "- 依赖可选\n- 可以在对象创建后修改依赖\n- 适合可选依赖"
      }
    ],
    rootContent: "Setter注入通过setter方法注入依赖，灵活性高。依赖可选，可以在对象创建后修改依赖，适合可选依赖。"
  },
  tags: ["Spring", "Setter注入", "依赖注入"]
};
setterInjectionNode.card.nodeId = setterInjectionNode.id;

// 字段注入
const fieldInjectionNode = {
  id: generateId('k'),
  label: "字段注入",
  role: "concept",
  dimensions: ["spring", "java", "ioc"],
  card: {
    nodeId: null,
    title: "字段注入（注解方式）",
    tabs: [
      {
        id: "def",
        label: "定义",
        content: "直接在字段上使用@Autowired或@Resource注解进行依赖注入。"
      },
      {
        id: "example",
        label: "示例",
        content: "```java\npublic class UserService {\n    @Autowired\n    private UserDao userDao;\n}\n```"
      },
      {
        id: "pros-cons",
        label: "优缺点",
        content: "**优点**：\n- 代码简洁\n- 减少样板代码\n\n**缺点**：\n- 不适合final字段\n- 难以进行单元测试\n- 违反单一职责原则"
      }
    ],
    rootContent: "字段注入直接在字段上使用@Autowired或@Resource注解。代码简洁但不适合final字段，难以进行单元测试。"
  },
  tags: ["Spring", "字段注入", "依赖注入", "@Autowired"]
};
fieldInjectionNode.card.nodeId = fieldInjectionNode.id;

// 循环依赖问题
const circularDependencyNode = {
  id: generateId('k'),
  label: "Spring 循环依赖问题",
  role: "problem",
  dimensions: ["spring", "java", "ioc"],
  card: {
    nodeId: null,
    title: "Spring 循环依赖问题",
    tabs: [
      {
        id: "def",
        label: "定义",
        content: "循环依赖是指两个或多个Bean相互依赖，形成一个环形的依赖关系。"
      },
      {
        id: "types",
        label: "处理方式",
        content: "Spring容器对不同类型循环依赖的处理能力：\n\n1. **构造函数循环依赖**：无法处理，会抛出BeanCurrentlyInCreationException\n2. **Setter循环依赖（单例）**：可以处理，Spring通过三级缓存解决\n3. **prototype作用域循环依赖**：无法处理"
      }
    ],
    rootContent: "Spring循环依赖是指两个或多个Bean相互依赖形成环形关系。Spring通过三级缓存可以解决单例Setter循环依赖，但无法处理构造函数循环依赖和prototype作用域循环依赖。"
  },
  tags: ["Spring", "循环依赖", "三级缓存"]
};
circularDependencyNode.card.nodeId = circularDependencyNode.id;

// 添加节点到node-pool
nodePool[springDiMethodsNode.id] = springDiMethodsNode;
nodePool[constructorInjectionNode.id] = constructorInjectionNode;
nodePool[setterInjectionNode.id] = setterInjectionNode;
nodePool[fieldInjectionNode.id] = fieldInjectionNode;
nodePool[circularDependencyNode.id] = circularDependencyNode;

console.log('✓ 已创建5个知识节点');


// 查找节点
function findNodeInTree(tree, targetId) {
  if (tree.id === targetId) return tree;
  if (tree.children) {
    for (const child of tree.children) {
      const found = findNodeInTree(child, targetId);
      if (found) return found;
    }
  }
  return null;
}

const springIocNode = findNodeInTree(treeData, 'tree_java_fw_spring_ioc');
if (springIocNode) {
  springIocNode.children.push({
    id: `tree_${springDiMethodsNode.id}`,
    name: "依赖注入方式",
    count: 0,
    nodeRef: springDiMethodsNode.id,
    children: [
      {
        id: `tree_${constructorInjectionNode.id}`,
        name: "构造函数注入",
        count: 0,
        nodeRef: constructorInjectionNode.id,
        children: []
      },
      {
        id: `tree_${setterInjectionNode.id}`,
        name: "Setter注入",
        count: 0,
        nodeRef: setterInjectionNode.id,
        children: []
      },
      {
        id: `tree_${fieldInjectionNode.id}`,
        name: "字段注入",
        count: 0,
        nodeRef: fieldInjectionNode.id,
        children: []
      },
      {
        id: `tree_${circularDependencyNode.id}`,
        name: "循环依赖问题",
        count: 0,
        nodeRef: circularDependencyNode.id,
        children: []
      }
    ]
  });
  console.log('✓ 已将节点挂载到Spring IoC容器');
} else {
  console.warn('⚠ 未找到Spring IoC容器节点');
}

// 创建问题卡片
const newQuestions = [
  {
    id: generateId('q'),
    text: "Spring有哪几种依赖注入方式？",
    answered: true,
    answer: "Spring主要有以下几种依赖注入方式：\n\n1. **构造函数注入** - 通过构造函数参数注入依赖，适合必填依赖\n2. **Setter注入** - 通过setter方法注入依赖，适合可选依赖\n3. **字段注入** - 直接在字段上使用@Autowired或@Resource注解\n4. **接口注入** - 通过实现特定接口来注入依赖（较少使用）\n\n不同的注入方式各有优缺点，需要根据实际场景选择。",
    kind: "recall",
    difficulty: "basic",
    relatedNodeId: springDiMethodsNode.id,
    updatedAt: Date.now()
  },
  {
    id: generateId('q'),
    text: "构造函数注入有什么优点？",
    answered: true,
    answer: "构造函数注入的主要优点：\n\n1. **依赖明确** - 依赖对象在对象创建时就已经注入\n2. **不可变性** - 可以声明依赖为final，保证不可变\n3. **适合必填依赖** - 如果缺少依赖，对象无法创建\n4. **利于测试** - 单元测试时可以直接通过构造函数传入mock对象\n\n这是Spring官方推荐的注入方式。",
    kind: "definition",
    difficulty: "basic",
    relatedNodeId: constructorInjectionNode.id,
    updatedAt: Date.now()
  },
  {
    id: generateId('q'),
    text: "字段注入有什么缺点？",
    answered: true,
    answer: "字段注入虽然代码简洁，但有以下缺点：\n\n1. **不适合final字段** - 无法声明为final，不能保证不可变性\n2. **难以进行单元测试** - 必须通过反射或Spring容器才能注入依赖，无法直接new对象测试\n3. **违反单一职责原则** - 容易不自觉地添加过多依赖\n4. **隐藏依赖** - 依赖关系不明确，不如构造函数注入直观\n\n尽管字段注入很流行，但Spring官方更推荐构造函数注入。",
    kind: "definition",
    difficulty: "intermediate",
    relatedNodeId: fieldInjectionNode.id,
    updatedAt: Date.now()
  },
  {
    id: generateId('q'),
    text: "Spring如何处理循环依赖问题？",
    answered: true,
    answer: "Spring对不同类型的循环依赖处理能力不同：\n\n**可以处理的情况**：\n- **Setter循环依赖（单例）**：Spring通过三级缓存解决\n  - 一级缓存：完整的单例对象\n  - 二级缓存：早期的半成品对象\n  - 三级缓存：对象工厂\n\n**无法处理的情况**：\n- **构造函数循环依赖**：会抛出BeanCurrentlyInCreationException\n- **prototype作用域循环依赖**：每次都创建新对象，无法缓存\n\n最佳实践是避免循环依赖，通过重构代码解决。",
    kind: "mechanism",
    difficulty: "intermediate",
    relatedNodeId: circularDependencyNode.id,
    updatedAt: Date.now()
  },
  {
    id: generateId('q'),
    text: "@Autowired和@Resource的区别是什么？",
    answered: true,
    answer: "@Autowired和@Resource的主要区别：\n\n| 特性 | @Autowired | @Resource |\n|-----|-----------|----------|\n| 来源 | Spring原生 | JSR-250 |\n| 默认注入方式 | byType（按类型） | byName（按名称） |\n| required属性 | 支持 | 不支持 |\n| 使用位置 | 构造函数、字段、setter | 字段、setter |\n\n**使用建议**：\n- @Autowired配合@Qualifier可以指定bean名称\n- @Resource可以通过name属性指定bean名称\n- Spring项目中优先使用@Autowired\n- 需要JDK标准时使用@Resource",
    kind: "comparison",
    difficulty: "intermediate",
    relatedNodeId: springDiMethodsNode.id,
    updatedAt: Date.now()
  },
  {
    id: generateId('q'),
    text: "如何选择合适的依赖注入方式？",
    answered: true,
    answer: "选择依赖注入方式的建议：\n\n1. **必填依赖** → 使用构造函数注入\n   - 依赖是对象运行的必要条件\n   - 需要保证依赖的不可变性\n   \n2. **可选依赖** → 使用Setter注入\n   - 依赖可以有默认值\n   - 需要在对象创建后修改依赖\n   \n3. **简化开发** → 字段注入（需权衡）\n   - 快速原型开发\n   - 对测试要求不高的场景\n   \n**推荐优先级**：构造函数注入 > Setter注入 > 字段注入\n\nSpring官方推荐使用构造函数注入作为首选方式。",
    kind: "recall",
    difficulty: "intermediate",
    relatedNodeId: springDiMethodsNode.id,
    updatedAt: Date.now()
  }
];

// 添加问题到questions数组
questions.push(...newQuestions);
console.log(`✓ 已创建${newQuestions.length}个问题卡片`);

// 保存文件
fs.writeFileSync(
  path.join(dataDir, 'node-pool.json'),
  JSON.stringify(nodePool, null, 2),
  'utf-8'
);
console.log('✓ 已保存 node-pool.json');

fs.writeFileSync(
  path.join(dataDir, 'tree-data.json'),
  JSON.stringify(treeData, null, 2),
  'utf-8'
);
console.log('✓ 已保存 tree-data.json');

fs.writeFileSync(
  path.join(dataDir, 'questions.json'),
  JSON.stringify(questions, null, 2),
  'utf-8'
);
console.log('✓ 已保存 questions.json');

console.log('\n=== 完成 ===');
console.log(`- 新增知识节点: 5个`);
console.log(`- 新增问题卡片: ${newQuestions.length}个`);
console.log(`- 挂载位置: Spring → IoC容器 → 依赖注入方式`);
