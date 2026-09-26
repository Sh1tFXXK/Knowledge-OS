/**
 * 只读部署标记的单元测试：构建期判定规则 + 未注入时的默认值。
 *
 * 运行：node --experimental-transform-types --test scripts/read-only-flag.test.mjs
 * 或：  npm test
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { READ_ONLY_ENV_KEY, resolveReadOnlyDeployment } from './deploy/read-only-flag.mjs';
import { READ_ONLY_DEPLOYMENT } from '../src/knowledge/deploymentMode.ts';

test('未设置任何标记 ⇒ 可写（本地构建）', () => {
  assert.equal(resolveReadOnlyDeployment({}), false);
  assert.equal(resolveReadOnlyDeployment({ PATH: '/usr/bin' }), false);
});

test('显式 KNOWLEDGE_OS_READ_ONLY=1 ⇒ 只读（不依赖 VERCEL）', () => {
  assert.equal(resolveReadOnlyDeployment({ [READ_ONLY_ENV_KEY]: '1' }), true);
  assert.equal(resolveReadOnlyDeployment({ [READ_ONLY_ENV_KEY]: 'true' }), true);
  assert.equal(resolveReadOnlyDeployment({ [READ_ONLY_ENV_KEY]: ' 1 ' }), true);
  assert.equal(resolveReadOnlyDeployment({ [READ_ONLY_ENV_KEY]: 'TRUE' }), true);
});

test('显式 KNOWLEDGE_OS_READ_ONLY=0 ⇒ 可写，且压过 VERCEL=1（逃生口）', () => {
  assert.equal(resolveReadOnlyDeployment({ [READ_ONLY_ENV_KEY]: '0', VERCEL: '1' }), false);
  assert.equal(resolveReadOnlyDeployment({ [READ_ONLY_ENV_KEY]: 'false', VERCEL: '1' }), false);
});

test('未设标记时回落 VERCEL=1：Vercel 侧构建 ⇒ 只读', () => {
  assert.equal(resolveReadOnlyDeployment({ VERCEL: '1' }), true);
  assert.equal(resolveReadOnlyDeployment({ VERCEL: '0' }), false);
});

test('无法识别的取值视为未设置', () => {
  assert.equal(resolveReadOnlyDeployment({ [READ_ONLY_ENV_KEY]: 'yes' }), false);
  assert.equal(resolveReadOnlyDeployment({ [READ_ONLY_ENV_KEY]: '' }), false);
  assert.equal(resolveReadOnlyDeployment({ [READ_ONLY_ENV_KEY]: 'yes', VERCEL: '1' }), true);
  assert.equal(resolveReadOnlyDeployment({ [READ_ONLY_ENV_KEY]: '', VERCEL: '1' }), true);
});

test('客户端常量在未注入时默认可写（node 单测/脚本环境）', () => {
  assert.equal(READ_ONLY_DEPLOYMENT, false);
});