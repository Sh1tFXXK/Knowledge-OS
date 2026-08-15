import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  importJavaSource,
  resolveJavaSourceLocation,
  runJavaSourceIntrospector,
} from './import/java-source-importer.mjs';

async function findJdkHome() {
  const executableName = process.platform === 'win32' ? 'java.exe' : 'java';
  const configured = [
    process.env.KNOWLEDGE_OS_JAVA_HOME,
  ].filter(Boolean);
  const jdksDirectory = path.join(os.homedir(), '.jdks');
  const installed = await fs.readdir(jdksDirectory, { withFileTypes: true })
    .then((entries) => entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(jdksDirectory, entry.name))
      .sort((left, right) => right.localeCompare(left, undefined, { numeric: true })))
    .catch(() => []);
  for (const candidate of [...configured, ...installed, process.env.JAVA_HOME].filter(Boolean)) {
    try {
      await fs.access(path.join(candidate, 'bin', executableName));
      const release = await fs.readFile(path.join(candidate, 'release'), 'utf8');
      const featureVersion = Number.parseInt(
        release.match(/^JAVA_VERSION="(\d+)/m)?.[1] ?? '0',
        10,
      );
      if (featureVersion >= 17) return candidate;
    } catch {
      // Continue to the next configured JDK.
    }
  }
  return '';
}

async function writeJavaFixture(root) {
  const sourceRoot = path.join(root, 'source');
  await fs.mkdir(path.join(sourceRoot, 'demo', 'api'), { recursive: true });
  await fs.mkdir(path.join(sourceRoot, 'demo', 'impl'), { recursive: true });
  await fs.writeFile(path.join(sourceRoot, 'demo', 'api', 'Service.java'), [
    'package demo.api;',
    '',
    '/** Executes a unit of application work. */',
    'public interface Service {',
    '    /**',
    '     * Finds a value by one or more identifiers.',
    '     * @param ids identifiers to inspect',
    '     * @return the matching value',
    '     */',
    '    String find(String... ids);',
    '}',
  ].join('\n'), 'utf8');
  await fs.writeFile(path.join(sourceRoot, 'demo', 'api', 'Result.java'), [
    'package demo.api;',
    '',
    '/** Immutable service result. */',
    'public record Result(String value) {}',
  ].join('\n'), 'utf8');
  await fs.writeFile(path.join(sourceRoot, 'demo', 'impl', 'BaseService.java'), [
    'package demo.impl;',
    '',
    '/** Shared service behavior. */',
    'public abstract class BaseService {',
    '    protected String normalize(String value) { return value.trim(); }',
    '}',
  ].join('\n'), 'utf8');
  await fs.writeFile(path.join(sourceRoot, 'demo', 'impl', 'UserService.java'), [
    'package demo.impl;',
    '',
    'import demo.api.Service;',
    'import java.io.Serializable;',
    '',
    '/** Resolves user records. */',
    'public final class UserService extends BaseService implements Service, java.io.Serializable {',
    '    /** Returns the first identifier after normalization. */',
    '    @Override',
    '    public String find(String... ids) { return normalize(ids[0]); }',
    '',
    '    public static class Builder extends BaseService {}',
    '}',
  ].join('\n'), 'utf8');
  await fs.writeFile(path.join(sourceRoot, 'demo', 'impl', 'NestedTypes.java'), [
    'package demo.impl;',
    '',
    'public class NestedTypes {',
    '    static class Node {}',
    '    static class ChildNode extends Node {}',
    '}',
  ].join('\n'), 'utf8');
  return sourceRoot;
}

function fileHash(value) {
  return createHash('sha256').update(value).digest('hex');
}

test('Java source introspector parses uncompiled source declarations and Javadoc', async (context) => {
  const javaHome = await findJdkHome();
  if (!javaHome) return context.skip('No full JDK is available');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'knowledge-os-java-source-'));
  context.after(() => fs.rm(root, { recursive: true, force: true }));
  const sourceRoot = await writeJavaFixture(root);
  const location = resolveJavaSourceLocation(sourceRoot, javaHome);
  const result = runJavaSourceIntrospector({
    javaExecutable: location.javaExecutable,
    sourcePath: location.sourcePath,
  });
  const types = new Map(result.types.map((type) => [type.className, type]));

  assert.equal(result.sourceFiles, 5);
  assert.equal(result.diagnostics.length, 0);
  assert.equal(types.get('demo.api.Service')?.kind, 'interface');
  assert.equal(types.get('demo.api.Result')?.kind, 'record');
  assert.equal(types.get('demo.impl.BaseService')?.kind, 'abstract_class');
  assert.equal(types.get('demo.impl.UserService.Builder')?.kind, 'class');
  assert.deepEqual(
    types.get('demo.impl.NestedTypes.ChildNode')?.relations,
    [{ targetClassName: 'demo.impl.NestedTypes.Node', kind: 'extends' }],
  );
  assert.match(types.get('demo.api.Service')?.documentation?.description ?? '', /application work/);

  const serviceMethod = types.get('demo.api.Service')?.members.find(
    (member) => member.name === 'find',
  );
  assert.equal(serviceMethod?.varArgs, true);
  assert.deepEqual(serviceMethod?.parameterTypes, ['String...']);
  assert.match(serviceMethod?.documentation?.description ?? '', /one or more identifiers/);
  assert.deepEqual(
    types.get('demo.impl.UserService')?.relations,
    [
      { targetClassName: 'demo.impl.BaseService', kind: 'extends' },
      { targetClassName: 'demo.api.Service', kind: 'implements' },
      { targetClassName: 'java.io.Serializable', kind: 'implements' },
    ],
  );
});

test('Java source location supports a JDK archive subpath', async (context) => {
  const javaHome = await findJdkHome();
  if (!javaHome) return context.skip('No full JDK is available');
  const sourceArchive = path.join(javaHome, 'lib', 'src.zip');
  try {
    await fs.access(sourceArchive);
  } catch {
    return context.skip('The selected JDK has no src.zip');
  }
  const source = `${javaHome}!java.base/java/lang/String.java`;
  const location = resolveJavaSourceLocation(source, javaHome);
  assert.equal(location.sourcePath, sourceArchive);
  assert.equal(location.internalPrefix, 'java.base/java/lang/String.java');
  const result = runJavaSourceIntrospector({
    javaExecutable: location.javaExecutable,
    sourcePath: location.sourcePath,
    internalPrefix: location.internalPrefix,
  });
  assert.ok(result.types.some((type) => type.className === 'java.lang.String'));
});

test('Java source import writes an isolated typed subtree and is idempotent', async (context) => {
  const javaHome = await findJdkHome();
  if (!javaHome) return context.skip('No full JDK is available');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'knowledge-os-java-import-'));
  context.after(() => fs.rm(root, { recursive: true, force: true }));
  const sourceRoot = await writeJavaFixture(root);
  const dataDir = path.join(root, 'data');
  await fs.mkdir(dataDir, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(dataDir, 'tree-data.json'), JSON.stringify({
      id: 'root',
      name: '知识宇宙',
      nodeRef: 'k_root',
      children: [],
    }, null, 2)),
    fs.writeFile(path.join(dataDir, 'node-pool.json'), JSON.stringify({
      k_root: {
        id: 'k_root',
        label: '知识宇宙',
        tags: [],
        card: { nodeId: 'k_root', title: '知识宇宙', rootContent: '', tabs: [] },
      },
    }, null, 2)),
    fs.writeFile(path.join(dataDir, 'knowledge-edges.json'), '[]'),
  ]);

  const request = {
    source: sourceRoot,
    parentTreeNodeId: 'root',
    projectRoot: root,
    javaHome,
    translate: false,
  };
  const first = await importJavaSource(request);
  assert.equal(first.sourceFiles, 5);
  assert.equal(first.importedTypes, 8);
  assert.equal(first.directTypeRelations, 5);

  const [firstTree, firstPool, firstEdges] = await Promise.all([
    fs.readFile(path.join(dataDir, 'tree-data.json'), 'utf8'),
    fs.readFile(path.join(dataDir, 'node-pool.json'), 'utf8'),
    fs.readFile(path.join(dataDir, 'knowledge-edges.json'), 'utf8'),
  ]);
  const pool = JSON.parse(firstPool);
  const edges = JSON.parse(firstEdges);
  const userServiceNode = Object.values(pool).find(
    (node) => node.tags?.includes('demo.impl.UserService'),
  );
  assert.ok(userServiceNode);
  assert.equal(userServiceNode.relationIndex.rootNodeId, userServiceNode.id);
  assert.match(JSON.stringify(userServiceNode.card), /Returns the first identifier/);
  assert.ok(edges.some((edge) => edge.source === userServiceNode.id && edge.type === 'extends'));
  assert.ok(edges.some((edge) => edge.source === userServiceNode.id && edge.type === 'implements'));

  const second = await importJavaSource(request);
  assert.equal(second.nodeId, first.nodeId);
  const [secondTree, secondPool, secondEdges] = await Promise.all([
    fs.readFile(path.join(dataDir, 'tree-data.json'), 'utf8'),
    fs.readFile(path.join(dataDir, 'node-pool.json'), 'utf8'),
    fs.readFile(path.join(dataDir, 'knowledge-edges.json'), 'utf8'),
  ]);
  assert.equal(fileHash(secondTree), fileHash(firstTree));
  assert.equal(fileHash(secondPool), fileHash(firstPool));
  assert.equal(fileHash(secondEdges), fileHash(firstEdges));
});
