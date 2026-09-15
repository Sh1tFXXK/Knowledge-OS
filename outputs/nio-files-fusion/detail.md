# NIO-FILES-FUSION（D 批）· plan 之二：逐方法 diff / 导览审计 / Δ 重算

> 生成时间：2026-09-15T20:04:30.066Z · **所有数字由脚本计算得出（T3 纪律）** · 脚本**不写 data/**

> **角色命名**（★ 与裁决书对齐，本报告起不再使用 A/B —— 首版报告 A/B 与裁决书相反）：
> `SURVIVOR` = 留存方 · `DONOR` = 捐赠方 · `GUIDE` = 待删导览 · `BEST` = 本批不动

## ✅ 前置断言通过

## 1. 方法口径复核（22 vs 23）

- DONOR 去重方法名（机械口径）= **49**
- 同行程多调用掩盖的方法名 = **1** 个：`poll`
- 计入口径 **50** · 与 SURVIVOR 重叠 **27** · 独有 = **22**（机械）/ **23**（计入掩盖）

> 机械口径（每行只取首个方法名）会漏掉同行第二个调用；`maskedNames` 即被漏掉的名单，必须显式报出而不是悄悄取一个。

## 2. ★ 27 个重叠方法逐方法 diff

- 重叠方法 **27** 个
- 判据命中：DONOR 有 SURVIVOR 缺的**签名** **6** 个 · DONOR 有 SURVIVOR 无的**说明**（高可信）**4** 个 · **括注变体**（双侧都有括注，机械无法定性）**1** 个 · SURVIVOR 独有签名 **2** 个
- 判据全清（可直接保留 SURVIVOR）**17** 个

> ⚠️ **本表的口径已修正过**：首版「括注」抽取直接扫整段正文，把 `` `static void delete(Path path)` `` 的**形参表**当成括注 ⇒
> 几乎每个方法都「双侧有括注」，把 `delete`「（不存在抛异常）」这类**真增量**误判成「同义变体」，`addNote` 被人为压到 0。
> 现行为：先剥掉反引号代码跨度再抽括注。

| 方法 | SURVIVOR 签 | DONOR 行 | 缺签名 | 缺说明(高可信) | 括注变体 | SURVIVOR 独有签名 | 值 |
|---|---|---|---|---|---|---|---|
| `copy` | 1 | 3 | 2 | 0 | 0 | 0 | 补签名 |
| `move` | 1 | 1 | 0 | 0 | 0 | 0 | 等价 · 保持 |
| `delete` | 1 | 1 | 0 | 1 | 0 | 0 | 补说明 |
| `deleteIfExists` | 1 | 1 | 0 | 1 | 0 | 0 | 补说明 |
| `exists` | 1 | 1 | 0 | 0 | 0 | 0 | 等价 · 保持 |
| `isDirectory` | 1 | 1 | 0 | 0 | 0 | 0 | 等价 · 保持 |
| `isRegularFile` | 1 | 1 | 0 | 0 | 0 | 0 | 等价 · 保持 |
| `isReadable` | 1 | 1 | 0 | 0 | 0 | 0 | 等价 · 保持 |
| `isWritable` | 1 | 1 | 0 | 0 | 0 | 0 | 等价 · 保持 |
| `isExecutable` | 1 | 1 | 0 | 0 | 0 | 0 | 等价 · 保持 |
| `size` | 1 | 1 | 0 | 0 | 0 | 0 | 等价 · 保持 |
| `getLastModifiedTime` | 1 | 1 | 0 | 0 | 0 | 0 | 等价 · 保持 |
| `readAllBytes` | 1 | 1 | 0 | 0 | 0 | 0 | 等价 · 保持 |
| `readAllLines` | 2 | 2 | 0 | 0 | 0 | 0 | 等价 · 保持 |
| `write` | 2 | 2 | 0 | 0 | 0 | 0 | 等价 · 保持 |
| `list` | 1 | 1 | 0 | 1 | 0 | 0 | 补说明 |
| `newDirectoryStream` | 1 | 3 | 2 | 0 | 0 | 0 | 补签名 |
| `createDirectory` | 1 | 1 | 0 | 0 | 0 | 0 | 等价 · 保持 |
| `createDirectories` | 1 | 1 | 0 | 1 | 1 | 0 | 人工核对括注 |
| `createTempFile` | 1 | 1 | 1 | 0 | 0 | 1 | 补签名 |
| `createTempDirectory` | 1 | 1 | 1 | 0 | 0 | 1 | 补签名 |
| `newInputStream` | 1 | 1 | 0 | 0 | 0 | 0 | 等价 · 保持 |
| `newOutputStream` | 1 | 1 | 0 | 0 | 0 | 0 | 等价 · 保持 |
| `newBufferedReader` | 1 | 2 | 1 | 1 | 0 | 0 | 补签名 + 补说明 |
| `newBufferedWriter` | 1 | 2 | 1 | 0 | 0 | 0 | 补签名 |
| `createFile` | 1 | 1 | 0 | 0 | 0 | 0 | 等价 · 保持 |
| `probeContentType` | 1 | 1 | 0 | 0 | 0 | 0 | 等价 · 保持 |

### 需补的签名全文

- **`copy`**
  - DONOR → SURVIVOR 缺：`copy(InputStream,Path,CopyOption...)`
  - DONOR → SURVIVOR 缺：`copy(Path,OutputStream)`
- **`newDirectoryStream`**
  - DONOR → SURVIVOR 缺：`newDirectoryStream(Path,String)`
  - DONOR → SURVIVOR 缺：`newDirectoryStream(Path,DirectoryStream.Filter<?superPath>)`
- **`createTempFile`**
  - DONOR → SURVIVOR 缺：`createTempFile(String,String,FileAttribute<?>...)`
  - ⚠️ SURVIVOR 独有（不可丢）：`createTempFile(Path,String,String,FileAttribute<?>...)`
- **`createTempDirectory`**
  - DONOR → SURVIVOR 缺：`createTempDirectory(String,FileAttribute<?>...)`
  - ⚠️ SURVIVOR 独有（不可丢）：`createTempDirectory(Path,String,FileAttribute<?>...)`
- **`newBufferedReader`**
  - DONOR → SURVIVOR 缺：`newBufferedReader(Path,Charset)`
- **`newBufferedWriter`**
  - DONOR → SURVIVOR 缺：`newBufferedWriter(Path,Charset,OpenOption...)`

### 需补的说明全文 / 括注变体（人工核对）

- **`delete`**
  - DONOR 原文：`delete(Path path)：删除文件或空目录（不存在抛异常）`
  - SURVIVOR 原文：删除文件。 /  / `static void delete(Path path)`
  - DONOR 括注：（不存在抛异常） · SURVIVOR 括注：（无）
- **`deleteIfExists`**
  - DONOR 原文：`deleteIfExists(Path path)：删除（不存在返回 false，不抛异常）`
  - SURVIVOR 原文：如果文件存在则删除。 /  / `static boolean deleteIfExists(Path path)`
  - DONOR 括注：（不存在返回 false，不抛异常） · SURVIVOR 括注：（无）
- **`list`**
  - DONOR 原文：`list(Path dir)：返回目录下直接条目的 Stream<Path>（不递归）`
  - SURVIVOR 原文：列出目录中的条目。 /  / `static Stream<Path> list(Path dir)`
  - DONOR 括注：（不递归） · SURVIVOR 括注：（无）
- **`createDirectories`**
  - DONOR 原文：`createDirectories(Path dir, FileAttribute<?>... attrs)：创建多级目录（含父目录）`
  - SURVIVOR 原文：创建多级目录（包括所有不存在的父目录）。 /  / `static Path createDirectories(Path dir, FileAttribute<?>... attrs)`
  - DONOR 括注：（含父目录） · SURVIVOR 括注：（包括所有不存在的父目录）
- **`newBufferedReader`**
  - DONOR 原文：`newBufferedReader(Path path)：打开 BufferedReader（默认 UTF-8）` · `newBufferedReader(Path path, Charset cs)：指定编码打开 BufferedReader`
  - SURVIVOR 原文：打开缓冲读取器。 /  / `static BufferedReader newBufferedReader(Path path)`
  - DONOR 括注：（默认 UTF-8） · SURVIVOR 括注：（无）

## 3. 独有方法的归属分类（方案① 全原子前必须知道哪些不是 Files 的方法）

- 独有方法 **23**（= 机械口径 22 + 被同行掩盖 1）
- 按**接收者**归属：Files 静态方法 **19** + **非 Files 归属 4**

**非 Files 归属（★ 若原子化成 Files 的 tab 会指向错误宿主）**：

- `FileSystem.newWatchService` ← - FileSystem.newWatchService()：创建监听服务
- `Path.register` ← - Path.register(WatchService watcher, WatchEvent.Kind<?>... events)：注册监听
- `watchService.take` ← - 通过 watchService.take()/poll() 获取变更事件
- `watchService.poll` ← - 通过 watchService.take()/poll() 获取变更事件

**Files 静态方法**：

`notExists` · `isSymbolicLink` · `isHidden` · `createSymbolicLink` · `createLink` · `readString` · `writeString` · `walk` · `walkFileTree` · `setLastModifiedTime` · `getOwner` · `setOwner` · `getAttribute` · `setAttribute` · `readAttributes` · `isSameFile` · `getFileStore` · `getPosixFilePermissions` · `setPosixFilePermissions`

**被同行掩盖、须补回**：`poll`

## 4. GUIDE「常见用法」内容形态审计（裁决书给的前置条件）

- 正文 **2131** 字 / 38 行 · 分节标题 7 · 引言行 1 · 方法条目 **30** 行 / 去重 **29** 个方法名

| 闸门 | 结果 | 计数 | 判据 |
|---|---|---|---|
| 用法片段门（卸载前须先抽出） | ✅ 通过 | 0 | 未发现 `Xxx.method(实参)` 调用、try/catch、语句分号 ⇒ 全部是「签名：一句话」声明式条目 |
| 落点门（是否含独有信息） | ⛔ 需人工 | 5 | 5 条说明两侧语料均无逐字落点 ⇒ 须人工确认是否同义改写（同义改写不构成信息增量，但机械判据不能替你定性） |

**综合可删性：⚠️ 待人工确认**

**无逐字落点的 5 条（须人工确认是否同义改写）**：

- 说明「检查是否为目录」 ← - static boolean isDirectory(Path path, LinkOption... options)：检查是否为目录
- 说明「检查是否为常规文件」 ← - static boolean isRegularFile(Path path, LinkOption... options)：检查是否为常规文件
- 说明「将字节写入文件」 ← - static Path write(Path path, byte[] bytes, OpenOption... options)：将字节写入文件
- 说明「将文本行写入文件」 ← - static Path write(Path path, Iterable<? extends CharSequence> lines, OpenOption... options)：将文本行写入文件
- 说明「打开可查找的字节通道」 ← - static SeekableByteChannel newByteChannel(Path path, OpenOption... options)：打开可查找的字节通道

**格式异常行（`-` 后缺空格）**：

- -static Path copy(Path source, Path target, CopyOption... options)：复制文件

## 5. 悬空引用扫描（删 DONOR/GUIDE 前的安全门）

| 角色 | 池内他处引用 | 树内他处引用 | 边表引用 | 安全 | 父边 |
|---|---|---|---|---|---|
| Files工具类 | 0 | 0 | 1 | ✅ | `treebind:tree_java_common_libraries:tree_nio_files_util` |
| 常见用法 | 0 | 0 | 1 | ✅ | `treebind:tree_java_nio_file_files:tree_1787916227408_nkaljw` |

> 口径：**结构化逐字段比对**（`source`/`target`/`nodeRef`），不是在 JSON 字符串里数 id 出现次数 ——
> 后者会把「实体 id 作为键」算成一次引用，导致「被他处引用」恒为 1 的假阳性。

## 6. DONOR 非方法资产（方案① 未涉及，须另定落点）

- 保节 **8** 个 · 前言 **1** 行 · 裸小标题 **3** 个 · 枚常量 **11** · 视图类引用 **5** · 说明 **2**
- 枚常量中 SURVIVOR 现有正文已提到名字的 **2** 个 · 未提到的 **9** 个

**前言行**：

- java.nio.file.Files 是 NIO.2 提供的文件操作工具类，包含大量静态方法，是 java.io.File 的增强替代。

**裸小标题（既非【】，也非 bullet —— 机械盘点最容易漏的一类）**：

- `CopyOption：`
- `OpenOption：`
- `属性视图：`

**枚常量**：

- StandardCopyOption.REPLACE_EXISTING：覆盖已存在的目标
- StandardCopyOption.COPY_ATTRIBUTES：复制文件属性 ⚠️ SURVIVOR 未提及其名
- StandardCopyOption.ATOMIC_MOVE：原子移动（move 专用） ⚠️ SURVIVOR 未提及其名
- LinkOption.NOFOLLOW_LINKS：不跟随符号链接 ⚠️ SURVIVOR 未提及其名
- StandardOpenOption.READ：读模式 ⚠️ SURVIVOR 未提及其名
- StandardOpenOption.WRITE：写模式 ⚠️ SURVIVOR 未提及其名
- StandardOpenOption.APPEND：追加模式
- StandardOpenOption.TRUNCATE_EXISTING：截断已有文件 ⚠️ SURVIVOR 未提及其名
- StandardOpenOption.CREATE：不存在则创建 ⚠️ SURVIVOR 未提及其名
- StandardOpenOption.CREATE_NEW：不存在则创建，已存在抛异常 ⚠️ SURVIVOR 未提及其名
- StandardOpenOption.DELETE_ON_CLOSE：关闭时删除 ⚠️ SURVIVOR 未提及其名

**视图类引用**：

- BasicFileAttributeView：基本属性（所有平台）
- DosFileAttributeView：DOS 属性（Windows）
- PosixFileAttributeView：POSIX 属性（Unix/Linux，含权限）
- AclFileAttributeView：ACL 权限
- FileOwnerAttributeView：所有者

**说明条目**：

- 监听事件：ENTRY_CREATE、ENTRY_DELETE、ENTRY_MODIFY、OVERFLOW
- 可用于热部署、文件同步、配置变更监听等场景

## 7. tab 投影（方案① 全原子）

- SURVIVOR 现 **32** tab（其中方法 tab 29）
- 独有方法 **23** = Files 静态 19 + 非 Files 4（后者 1 个来自同行掩盖补回）

| 口径 | 最终 tab 数 | 说明 |
|---|---|---|
| ①-a 全原子（非 Files 方法也各建 tab） | 55 | 会造出 `newWatchService()`/`register()` 这种指向错误宿主的 tab |
| ①-a + 非方法资产收 1 tab | 56 | |
| ①-b 严格口径（非 Files 方法收 1 个流程 tab） | 51 | 推荐：只给 Files 自己的方法建 tab |
| ①-b + 非方法资产收 1 tab | 52 | |
| ①-b + 资产 tab + WatchService 流程 tab | 53 | 非 Files 方法有归属且不误导 |

- 全库现最大 **36** · 次大 **32** · 当前 >32 tab 的实体 **1** 个

## 8. Δ（按裁决修正：删 DONOR + 删 GUIDE）

- Δ树 **-2** · Δ池 **-2** · Δ边 **-2** —— 删 DONOR（tree −1 / pool −1 / 其 treebind 父边 −1）+ 删 GUIDE（tree −1 / pool −1 / 其 treebind 父边 −1）
- 落定值：树 **3203** · 池 **3850** · 边 **4155**

> 注意：SURVIVOR 本体（池内 1 个实体被改写 + 树节点保留）**不计入 Δ**，只计入「modified」。

## 9. tags 合并

- SURVIVOR：`java.nio.file.Files` · `java` · `jdk` · `常用类库`
- DONOR：`Files工具类` · `java` · `NIO` · `Files` · `工具类` · `文件操作` · `java.nio.file`
- 若合并则新增 **6** 个：`Files工具类` · `NIO` · `Files` · `工具类` · `文件操作` · `java.nio.file`

## 10. 残余决策点（方案① 未覆盖）

### D7 · DONOR 的非方法资产落点（方案①未涉及）

- 枚常量 11 + 视图类引用 5 + 说明 2 + 保节 8 + 裸小标题 4

### D8 · DONOR 的 tags 是否并入 SURVIVOR

- DONOR 独有 tag 6 个

### D9 · 非 Files 归属的方法（WatchService 段落）如何处置

- FileSystem.newWatchService / Path.register / watchService.take / watchService.poll

