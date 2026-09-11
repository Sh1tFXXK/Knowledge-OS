import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

const pool = JSON.parse(fs.readFileSync(path.join(dataDir, 'node-pool.json'), 'utf8'));
const questions = JSON.parse(fs.readFileSync(path.join(dataDir, 'questions.json'), 'utf8'));

// ============ 序列化知识拆分融合 ============
// 树结构已存在（java > 序列化 > 实现 Serializable 接口 / 序列化对象 / 反序列化对象），
// 但四个节点卡片全部为空。将用户提供的序列化教程按职责拆分融合：

const SER = 'k_1787818794698_9mccgx';           // 序列化（父）
const IFACE = 'k_1789032923900_eg5g5j';          // 实现 Serializable 接口
const W = 'k_1789033016897_n3sb52';              // 序列化对象
const R = 'k_1789033106723_46xsvp';              // 反序列化对象

// 1. 序列化（父节点）：概念总览——是什么、为什么、用途
pool[SER] = {
  ...pool[SER],
  label: '序列化',
  role: 'group',
  dimensions: ['java'],
  tags: ['序列化', 'Serializable', 'java'],
  card: {
    nodeId: SER,
    title: '序列化',
    tabs: [{
      id: 'def', label: '定义',
      content: '**Java 序列化**：将对象转换为字节流的过程——以便将对象保存到磁盘、在网络上传输或存入内存，之后再**反序列化**把字节流还原为对象。\n\n**实现方式**：通过 `java.io.Serializable` 接口——该接口没有任何方法，只是一个**标记接口**，用于标识类可以被序列化。\n\n**用途**：使对象可以在不同计算机之间移动和共享，对**分布式系统、数据存储、跨平台通信**非常有用。\n\n子节点：实现 Serializable 接口（条件与标记语义）、序列化对象（ObjectOutputStream）、反序列化对象（ObjectInputStream）。',
    }],
    rootContent: 'Java 序列化：对象 ↔ 字节流。通过标记接口 java.io.Serializable 实现，用于持久化、网络传输与跨平台共享。',
  },
};

// 2. 实现 Serializable 接口：序列化条件 + transient + Employee 示例类
pool[IFACE] = {
  ...pool[IFACE],
  label: '实现 Serializable 接口',
  role: 'concept',
  dimensions: ['java'],
  tags: ['Serializable', '标记接口', 'transient', 'java'],
  parentId: SER,
  card: {
    nodeId: IFACE,
    title: '实现 Serializable 接口',
    tabs: [{
      id: 'def', label: '定义',
      content: '**Serializable 是标记接口**：没有任何方法，只用于标识类可被序列化。检验一个类能否序列化，只需查看它有没有实现 `java.io.Serializable`。\n\n**序列化成功的两个条件**：\n1. 该类必须实现 `java.io.Serializable` 接口\n2. 该类的所有属性必须是可序列化的；不可序列化的属性必须标注 `transient`（短暂）\n\n**transient 的效果**：被修饰的字段不进入字节流——序列化时被跳过，反序列化后为类型默认值（如 int 为 0）。\n\n### 示例类\n```java\npublic class Employee implements java.io.Serializable {\n    public String name;\n    public String address;\n    public transient int SSN;   // 不参与序列化\n    public int number;\n    public void mailCheck() {\n        System.out.println("Mailing a check to " + name + " " + address);\n    }\n}\n```',
    }],
    rootContent: 'Serializable 标记接口 + 两个序列化条件；transient 字段不参与序列化，反序列化后为默认值。',
  },
};

// 3. 序列化对象：ObjectOutputStream + writeObject + SerializeDemo
pool[W] = {
  ...pool[W],
  label: '序列化对象',
  role: 'concept',
  dimensions: ['java'],
  tags: ['ObjectOutputStream', 'writeObject', '序列化', 'java'],
  parentId: SER,
  card: {
    nodeId: W,
    title: '序列化对象',
    tabs: [{
      id: 'def', label: '定义',
      content: '**ObjectOutputStream**：高层次数据流，用来序列化对象。核心方法：\n\n```java\npublic final void writeObject(Object x) throws IOException\n```\n\n序列化一个对象并将其发送到输出流。（该类还包含写各种数据类型的众多方法，writeObject 是唯一的对象方法。）\n\n### SerializeDemo\n```java\nimport java.io.*;\npublic class SerializeDemo {\n    public static void main(String[] args) {\n        Employee e = new Employee();\n        e.name = "Reyan Ali";\n        e.address = "Phokka Kuan, Ambehta Peer";\n        e.SSN = 11122333;\n        e.number = 101;\n        try {\n            FileOutputStream fileOut = new FileOutputStream("/tmp/employee.ser");\n            ObjectOutputStream out = new ObjectOutputStream(fileOut);\n            out.writeObject(e);\n            out.close();\n            fileOut.close();\n            System.out.printf("Serialized data is saved in /tmp/employee.ser");\n        } catch (IOException i) { i.printStackTrace(); }\n    }\n}\n```\n\n**约定**：序列化到文件的扩展名为 `.ser`。',
    }],
    rootContent: '序列化对象：ObjectOutputStream.writeObject() 把对象写入输出流；文件按约定用 .ser 扩展名。',
  },
};

// 4. 反序列化对象：ObjectInputStream + readObject + DeserializeDemo + 三个要点
pool[R] = {
  ...pool[R],
  label: '反序列化对象',
  role: 'concept',
  dimensions: ['java'],
  tags: ['ObjectInputStream', 'readObject', '反序列化', 'ClassNotFoundException', 'java'],
  parentId: SER,
  card: {
    nodeId: R,
    title: '反序列化对象',
    tabs: [{
      id: 'def', label: '定义',
      content: '**ObjectInputStream**：高层次数据流，从字节流反序列化对象。核心方法：\n\n```java\npublic final Object readObject() throws IOException, ClassNotFoundException\n```\n\n从流中取出下一个对象并反序列化；返回值为 Object，需要转换成合适的数据类型。\n\n### DeserializeDemo\n```java\nimport java.io.*;\npublic class DeserializeDemo {\n    public static void main(String[] args) {\n        Employee e = null;\n        try {\n            FileInputStream fileIn = new FileInputStream("/tmp/employee.ser");\n            ObjectInputStream in = new ObjectInputStream(fileIn);\n            e = (Employee) in.readObject();\n            in.close();\n            fileIn.close();\n        } catch (IOException i) { i.printStackTrace(); return; }\n        catch (ClassNotFoundException c) { System.out.println("Employee class not found"); c.printStackTrace(); return; }\n        System.out.println("Deserialized Employee...");\n        System.out.println("Name: " + e.name);      // Reyan Ali\n        System.out.println("Address: " + e.address); // Phokka Kuan, Ambehta Peer\n        System.out.println("SSN: " + e.SSN);          // 0 —— transient 未序列化\n        System.out.println("Number: " + e.number);    // 101\n    }\n}\n```\n\n### 三个要点\n1. **ClassNotFoundException**：JVM 反序列化时必须能找到类的字节码，找不到即抛出——try/catch 必须捕获\n2. **返回值转型**：readObject() 返回 Object，需强转（如 `(Employee)`）\n3. **transient 效果**：序列化时 SSN=11122333，但因 transient 未写入流，反序列化后 SSN 为 0',
    }],
    rootContent: '反序列化对象：ObjectInputStream.readObject() 从流还原对象，需强转、需捕获 ClassNotFoundException；transient 字段还原为默认值。',
  },
};

// 5. 通用/对比性问题 → 问题卡（挂在 序列化 节点）
const addQuestion = ({ id, text, kind, answer, relatedNodeId }) => {
  const existing = questions.find((q) => q.id === id || q.text === text);
  if (existing) {
    if (answer && (!existing.answer || existing.answer.length < answer.length)) existing.answer = answer;
    return existing;
  }
  const now = Date.now();
  questions.push({ id, text, answered: true, relatedNodeId, createdAt: now, updatedAt: now, answer, kind, difficulty: 'intermediate' });
};
addQuestion({
  id: 'q_java_serialization_conditions', kind: 'recall',
  text: '一个类的对象要想序列化成功，必须满足什么条件？',
  relatedNodeId: SER,
  answer: '两个条件：\n1. **该类必须实现 `java.io.Serializable` 接口**（标记接口，无任何方法）\n2. **该类的所有属性必须是可序列化的**；如果某个属性不可序列化，则必须用 `transient` 标注（短暂）\n\n想知道一个 Java 标准类是否可序列化，查看该类文档/是否实现 Serializable 即可。',
});
addQuestion({
  id: 'q_java_why_marker_interface', kind: 'mechanism',
  text: '为什么 Serializable 是一个没有方法的标记接口？',
  relatedNodeId: SER,
  answer: 'Serializable 只起**标记**作用：告诉 JVM / ObjectOutputStream 该类允许被序列化。\n\n- 序列化逻辑由 ObjectOutputStream 按**反射 + 对象图遍历**完成，不需要类自己实现任何序列化方法\n- 标记即契约：类设计者显式声明"我同意被序列化"（涉及安全与兼容性决策），而非默认可序列化\n- 同类设计：Cloneable（可克隆）、RandomAccess（支持随机访问）',
});

// === 保存 ===
fs.writeFileSync(path.join(dataDir, 'node-pool.json'), JSON.stringify(pool, null, 2) + '\n');
fs.writeFileSync(path.join(dataDir, 'questions.json'), JSON.stringify(questions, null, 2) + '\n');

// === 验证 ===
for (const [id, name] of [[SER, '序列化'], [IFACE, '实现 Serializable 接口'], [W, '序列化对象'], [R, '反序列化对象']]) {
  const n = pool[id];
  const len = (n.card?.tabs || []).reduce((s, t) => s + (t.content || '').length, 0);
  console.log((len > 100 ? '✓' : '✗') + ' ' + name + ' 卡片 ' + len + ' 字');
}
const newQs = questions.filter((q) => ['q_java_serialization_conditions', 'q_java_why_marker_interface'].includes(q.id));
console.log('✓ 新问题卡:', newQs.map((q) => q.text.slice(0, 25)));
const dangling = questions.filter((q) => q.relatedNodeId && !pool[q.relatedNodeId]);
console.log('✓ 问题卡悬空:', dangling.length);
