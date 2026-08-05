import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAX_JAVA_SOURCE_FILES = 5_000;

function normalizeInternalPrefix(value) {
  return value.replaceAll('\\', '/').replace(/^\/+|\/+$/g, '');
}

function javaExecutableAt(javaHome) {
  if (!javaHome) return '';
  return path.join(
    path.resolve(javaHome),
    'bin',
    process.platform === 'win32' ? 'java.exe' : 'java',
  );
}

function inferredJdkRoot(sourcePath) {
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isDirectory()) return '';
  return fs.existsSync(javaExecutableAt(sourcePath)) ? sourcePath : '';
}

export function resolveJavaSourceLocation(sourceOption, javaHomeOption = '') {
  const displayPath = String(sourceOption ?? '').trim();
  if (!displayPath) throw new Error('请输入 Java 源码文件、目录或源码压缩包路径');

  const separator = displayPath.indexOf('!');
  const sourcePrefix = separator >= 0 ? displayPath.slice(0, separator) : displayPath;
  const internalPrefix = separator >= 0
    ? normalizeInternalPrefix(displayPath.slice(separator + 1))
    : '';
  const normalized = path.resolve(sourcePrefix);
  if (!fs.existsSync(normalized)) {
    throw new Error(`Java 源码路径不存在：${normalized}`);
  }

  let sourcePath = normalized;
  const inferredHome = inferredJdkRoot(normalized);
  if (inferredHome && fs.existsSync(path.join(inferredHome, 'lib', 'src.zip'))) {
    sourcePath = path.join(inferredHome, 'lib', 'src.zip');
  }

  const configuredJava = javaExecutableAt(javaHomeOption || inferredHome || process.env.JAVA_HOME);
  const javaExecutable = configuredJava && fs.existsSync(configuredJava)
    ? configuredJava
    : 'java';
  const normalizedKey = process.platform === 'win32'
    ? sourcePath.toLocaleLowerCase()
    : sourcePath;

  return {
    displayPath,
    sourcePath,
    internalPrefix,
    javaExecutable,
    sourceKey: `${normalizedKey}!${internalPrefix}`,
  };
}

export function runJavaSourceIntrospector({
  javaExecutable,
  sourcePath,
  internalPrefix = '',
  maxFiles = MAX_JAVA_SOURCE_FILES,
}) {
  const helperDirectory = path.dirname(fileURLToPath(import.meta.url));
  const helperFiles = [
    'JavaSourceMetadata.java',
    'JavaSourceSupport.java',
    'JavaSourceIntrospector.java',
  ].map((fileName) => path.join(helperDirectory, fileName));
  const helperHash = createHash('sha256');
  for (const helperFile of helperFiles) helperHash.update(fs.readFileSync(helperFile));
  const compiledDirectory = path.join(
    os.tmpdir(),
    `knowledge-os-java-source-${helperHash.digest('hex').slice(0, 16)}`,
  );
  const mainClassFile = path.join(compiledDirectory, 'JavaSourceIntrospector.class');
  if (!fs.existsSync(mainClassFile)) {
    fs.mkdirSync(compiledDirectory, { recursive: true });
    const executableDirectory = path.dirname(javaExecutable);
    const javacExecutable = executableDirectory === '.'
      ? 'javac'
      : path.join(
          executableDirectory,
          process.platform === 'win32' ? 'javac.exe' : 'javac',
        );
    const compilation = spawnSync(javacExecutable, [
      '-encoding',
      'UTF-8',
      '-d',
      compiledDirectory,
      ...helperFiles,
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
      windowsHide: true,
    });
    if (compilation.error) throw compilation.error;
    if (compilation.status !== 0) {
      throw new Error(
        compilation.stderr.trim() || `Java 源码解析器编译失败，状态码 ${compilation.status}`,
      );
    }
  }
  const argumentsList = [
    '--add-modules',
    'jdk.compiler',
    '-cp',
    compiledDirectory,
    'JavaSourceIntrospector',
    '--source',
    sourcePath,
    '--max-files',
    String(maxFiles),
  ];
  if (internalPrefix) argumentsList.push('--prefix', internalPrefix);

  const result = spawnSync(javaExecutable, argumentsList, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 96 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `Java 源码解析器退出，状态码 ${result.status}`);
  }
  const parsed = JSON.parse(result.stdout.replace(/^\uFEFF/, ''));
  if (parsed.diagnostics?.length > 0) {
    throw new Error(`Java 源码语法解析失败：\n${parsed.diagnostics.join('\n')}`);
  }
  return parsed;
}
