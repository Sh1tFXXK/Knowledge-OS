import { readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DATA_DIR = resolve('data');

// Java syntax 分组节点
const SYNTAX_TREE_ID = 'tree_1783867183132_g5tf12';
const SYNTAX_NODE_ID = 'k_1783867183071_xrnl1e';

// 新子文件节点
const NODE_ID = 'k_java_syntax_method';
const TREE_ID = 'tree_java_syntax_method';
const NODE_LABEL = '方法（method）';
const TREE_NAME = '方法';

// ========== 知识内容 ==========

const def = `Java 方法是语句的集合，它们在一起执行一个功能。

- 方法是解决一类问题的步骤的有序组合
- 方法包含于类或对象中
- 方法在程序中被创建，在其他地方被引用

例如 System.out.println() 中，println() 是一个方法，System 是系统类，out 是标准输出对象。

方法的优点：
1. 使程序变得更简短而清晰
2. 有利于程序维护
3. 可以提高程序开发的效率
4. 提高了代码的重用性

命名规则：
- 方法名第一个单词以小写字母开头，后续单词首字母大写（小驼峰），不使用连接符，例如 addPerson
- 下划线可能出现在 JUnit 测试方法名称中用以分隔逻辑组件，典型模式如 testPop_emptyStack`;

const structure = `方法包含一个方法头和一个方法体，完整结构：

修饰符 返回值类型 方法名(参数类型 参数名) {
    方法体
    return 返回值;
}

各组成部分：

1. 修饰符：可选，告诉编译器如何调用该方法，定义方法的访问类型
2. 返回值类型：方法可能返回值。returnValueType 是方法返回值的数据类型；没有返回值时使用关键字 void
3. 方法名：方法的实际名称，方法名和参数表共同构成方法签名
4. 参数类型：参数像占位符，方法被调用时传递值给参数（实参）。参数列表指参数的类型、顺序和个数。参数可选，方法可以不包含任何参数
5. 方法体：包含具体的语句，定义该方法的功能

注意：在一些其他语言中方法指过程和函数——返回非 void 类型的称为函数，返回 void 的称为过程。`;

const invocation = `方法调用：

Java 支持两种调用方法的方式，根据方法是否返回值来选择。

当程序调用一个方法时，程序的控制权交给被调用的方法。当被调用方法的返回语句执行或到达方法体闭括号时，交还控制权给程序。

- 方法返回一个值时，方法调用通常被当做一个值
- 方法返回值是 void 时，方法调用一定是一条语句

main 方法是被 JVM 调用的，除此之外 main 方法和其它方法没什么区别。main 方法头部固定：public static void main(String[] args)，带 String[] 类型参数表示字符串数组。

void 关键字：
- void 类型方法不返回值
- void 方法的调用一定是一个语句，以分号结束`;

const passByValue = `通过值传递参数：

调用方法时需要提供参数，必须按照参数列表指定的顺序提供。

Java 中方法参数传递是值传递（pass by value）：
- 基本类型参数：传递的是值的副本，方法内修改参数不影响实参
- 引用类型参数：传递的是引用地址的副本，方法内通过引用修改对象内容会影响原对象，但重新赋值引用不影响原引用

典型现象：调用 swap 方法交换两个基本类型变量后，实参的值并不会改变，因为传递的只是值的副本。`;

const overload = `方法的重载（Overload）：

一个类中两个方法拥有相同的名字，但有不同的参数列表，称为方法重载。

- Java 编译器根据方法签名判断哪个方法应该被调用
- 方法重载可以让程序更清晰易读，执行密切相关任务的方法应该使用相同的名字
- 重载的方法必须拥有不同的参数列表（参数类型、个数或顺序不同）
- 不能仅仅依据修饰符或者返回类型的不同来重载方法

例如 max(int num1, int num2) 和 max(double num1, double num2) 构成重载，调用时根据传入参数类型自动匹配。`;

const scope = `变量作用域：

变量的范围是程序中该变量可以被引用的部分。

- 方法内定义的变量称为局部变量
- 局部变量的作用范围从声明开始，直到包含它的块结束
- 局部变量必须声明才可以使用
- 方法的参数范围涵盖整个方法，参数实际上是一个局部变量
- for 循环初始化部分声明的变量，作用范围在整个循环
- 循环体内声明的变量，适用范围从声明到循环体结束

可以在一个方法里不同的非嵌套块中多次声明同名局部变量，但不能在嵌套块内两次声明同名局部变量。`;

const special = `特殊方法与特性：

【构造方法（Constructor）】
- 用于创建类的对象的特殊方法，使用 new 关键字创建对象时自动调用，用来初始化对象属性
- 方法名必须与类名相同
- 没有返回类型，连 void 也不能写
- 可以重载（多个构造方法参数列表不同）
- Java 自动提供默认构造方法，访问修饰符与类相同
- 一旦自定义构造方法，默认构造方法失效

【可变参数（Varargs）】
- JDK 1.5 开始支持，传递同类型的可变参数给一个方法
- 声明方式：typeName... parameterName（参数类型后加省略号）
- 一个方法中只能指定一个可变参数
- 可变参数必须是方法的最后一个参数，普通参数必须在它之前声明

【命令行参数】
- 运行程序时传递消息给 main() 函数
- 命令行参数是执行程序时紧跟在程序名字后面的信息
- 通过 main 方法的 String[] args 参数接收

【finalize() 方法】
- 在对象被垃圾收集器回收之前调用，用来清除回收对象
- Java 9 中已被标记为废弃，未来版本将移除
- 推荐使用 try-with-resources 或 java.lang.ref.Cleaner 管理资源
- 关键字 protected 确保该方法不会被类以外的代码调用`;

// ========== 工具函数 ==========

async function readJson(name) {
  return JSON.parse(await readFile(resolve(DATA_DIR, name), 'utf8'));
}

async function writeJsonAtomic(name, data) {
  const target = resolve(DATA_DIR, name);
  const temporary = `${target}.tmp.${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await rename(temporary, target);
}

function upsertEdge(edges, edge) {
  const index = edges.findIndex((candidate) => candidate.id === edge.id);
  if (index >= 0) edges[index] = edge;
  else edges.push(edge);
}

function findTreeNode(root, id) {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findTreeNode(child, id);
    if (found) return found;
  }
  return null;
}

// ========== 主流程 ==========

async function main() {
  const [nodePool, treeData, knowledgeEdges] = await Promise.all([
    readJson('node-pool.json'),
    readJson('tree-data.json'),
    readJson('knowledge-edges.json'),
  ]);

  const syntaxTree = findTreeNode(treeData, SYNTAX_TREE_ID);
  if (!syntaxTree) throw new Error('Java syntax tree node not found');

  // 1. 创建/更新节点
  const existing = nodePool[NODE_ID];
  nodePool[NODE_ID] = {
    ...existing,
    id: NODE_ID,
    label: NODE_LABEL,
    role: 'concept',
    dimensions: ['java', 'java-syntax'],
    tags: ['java', 'java-syntax', '方法', 'method'],
    card: {
      ...(existing?.card ?? {}),
      nodeId: NODE_ID,
      title: NODE_LABEL,
      tabs: [
        { id: 'def', label: '定义与特性', content: def },
        { id: 'structure', label: '方法结构', content: structure },
        { id: 'invocation', label: '方法调用', content: invocation },
        { id: 'passByValue', label: '值传递', content: passByValue },
        { id: 'overload', label: '方法重载', content: overload },
        { id: 'scope', label: '变量作用域', content: scope },
        { id: 'special', label: '特殊方法', content: special },
      ],
    },
  };

  // 2. 挂载到 Java syntax 树下
  let childTree = findTreeNode(treeData, TREE_ID);
  if (!childTree) {
    childTree = {
      id: TREE_ID,
      name: TREE_NAME,
      count: 0,
      nodeRef: NODE_ID,
      children: [],
    };
    syntaxTree.children ??= [];
    syntaxTree.children.push(childTree);
  }
  childTree.nodeRef = NODE_ID;
  childTree.name = TREE_NAME;

  // 3. 结构包含边
  upsertEdge(knowledgeEdges, {
    id: `treebind:${SYNTAX_TREE_ID}:${TREE_ID}`,
    source: SYNTAX_NODE_ID,
    target: NODE_ID,
    type: 'belongs-to',
    label: 'contains',
    relationKind: 'structure',
    dimensions: ['java'],
  });

  // 4. 写入
  await Promise.all([
    writeJsonAtomic('node-pool.json', nodePool),
    writeJsonAtomic('tree-data.json', treeData),
    writeJsonAtomic('knowledge-edges.json', knowledgeEdges),
  ]);

  console.log(`Created node ${NODE_ID} with 7 tabs, mounted under Java syntax.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
