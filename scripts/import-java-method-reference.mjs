import { readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DATA_DIR = resolve('data');

// 父节点：方法
const PARENT_TREE_ID = 'tree_java_syntax_method';
const PARENT_NODE_ID = 'k_java_syntax_method';

// 新子节点：方法引用
const NODE_ID = 'k_java_syntax_method_reference';
const TREE_ID = 'tree_java_syntax_method_reference';
const NODE_LABEL = '方法引用（Method Reference）';
const TREE_NAME = '方法引用';

// ========== 知识内容 ==========

const def = `方法引用通过方法的名字来指向一个方法，使用一对冒号 :: 作为运算符。

方法引用可以使语言的构造更紧凑简洁，减少冗余代码。

当接口已有一个兼容的命名方法时，使用 Lambda 表达式并不是必需的，可以使用方法引用替代 Lambda 传递该方法。

Java 允许使用运算符 :: 的方法引用（与 C++ 的命名空间限定运算符 :: 无关）。

注意：在 Java 中，构造函数不被视为方法，因此 X::X 不存在；构造函数引用是通过 X::new 获取的。`;

const types = `方法引用有 5 种类型：

1. 静态方法引用
   - 语法：Class::static_method
   - 示例：Integer::sum
   - 等效 Lambda：(m, n) -> m + n
   - 引用类的静态方法

2. 绑定方法引用（特定对象的方法引用）
   - 语法：instance::method
   - 示例："LongString"::substring
   - 等效 Lambda：i -> "LongString".substring(i)
   - 引用特定实例对象的方法，对象已绑定

3. 未绑定方法引用（特定类的任意对象的方法引用）
   - 语法：Class::method
   - 示例：String::isEmpty
   - 等效 Lambda：s -> s.isEmpty()
   - 引用类的实例方法，调用时需传入目标对象作为第一个参数

4. 类构造函数引用
   - 语法：Class::new，或更一般的 Class<T>::new
   - 示例：ArrayList<String>::new
   - 等效 Lambda：len -> new ArrayList<String>(len)
   - 引用类的构造函数创建新对象

5. 数组构造函数引用
   - 语法：Type[]::new
   - 示例：String[]::new
   - 等效 Lambda：len -> new String[len]
   - 引用数组的构造函数创建指定长度的数组`;

const usage = `使用场景与规则：

- 方法引用是 Lambda 表达式的一种简写形式，当 Lambda 体仅调用一个已有方法时，可使用方法引用替代
- 方法引用的目标方法必须与函数式接口的抽象方法签名兼容（参数类型、返回类型匹配）
- 方法引用不需要显式声明参数，编译器会根据上下文自动推导
- 构造器引用使用 Class::new 语法，编译器会根据上下文自动选择匹配的构造函数
- 数组构造器引用使用 Type[]::new，接收一个 int 参数表示数组长度

方法引用与 Lambda 的选择：
- Lambda 体只调用一个方法 → 优先使用方法引用，更简洁
- Lambda 体包含多个语句或复杂逻辑 → 使用 Lambda 表达式
- 需要对参数进行额外处理 → 使用 Lambda 表达式`;

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

  const parentTree = findTreeNode(treeData, PARENT_TREE_ID);
  if (!parentTree) throw new Error('Parent method tree node not found');

  // 1. 创建/更新节点
  const existing = nodePool[NODE_ID];
  nodePool[NODE_ID] = {
    ...existing,
    id: NODE_ID,
    label: NODE_LABEL,
    role: 'concept',
    dimensions: ['java', 'java-syntax'],
    tags: ['java', 'java-syntax', '方法引用', 'method-reference', 'lambda', 'java8'],
    card: {
      ...(existing?.card ?? {}),
      nodeId: NODE_ID,
      title: NODE_LABEL,
      tabs: [
        { id: 'def', label: '定义', content: def },
        { id: 'types', label: '五种类型', content: types },
        { id: 'usage', label: '使用规则', content: usage },
      ],
    },
  };

  // 2. 挂载到"方法"节点下
  let childTree = findTreeNode(treeData, TREE_ID);
  if (!childTree) {
    childTree = {
      id: TREE_ID,
      name: TREE_NAME,
      count: 0,
      nodeRef: NODE_ID,
      children: [],
    };
    parentTree.children ??= [];
    parentTree.children.push(childTree);
  }
  childTree.nodeRef = NODE_ID;
  childTree.name = TREE_NAME;

  // 更新父节点 count
  parentTree.count = (parentTree.children ?? []).length;

  // 3. 结构包含边
  upsertEdge(knowledgeEdges, {
    id: `treebind:${PARENT_TREE_ID}:${TREE_ID}`,
    source: PARENT_NODE_ID,
    target: NODE_ID,
    type: 'belongs-to',
    label: 'contains',
    relationKind: 'structure',
    dimensions: ['java'],
  });

  // 4. 语义关系：方法引用 是 方法 的一种使用方式
  upsertEdge(knowledgeEdges, {
    id: 'edge_java_method_ref_is_usage_of_method',
    source: NODE_ID,
    target: PARENT_NODE_ID,
    type: 'is-a',
    label: '方法的引用方式',
    relationKind: 'association',
    dimensions: ['java'],
  });

  // 5. 写入
  await Promise.all([
    writeJsonAtomic('node-pool.json', nodePool),
    writeJsonAtomic('tree-data.json', treeData),
    writeJsonAtomic('knowledge-edges.json', knowledgeEdges),
  ]);

  console.log(`Created node ${NODE_ID} with 3 tabs, mounted under 方法.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
