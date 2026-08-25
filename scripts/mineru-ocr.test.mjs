import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  createMineruOcrService,
  resolveMineruCommand,
} from './import/mineru-ocr.mjs';

test('MinerU command prefers the project-local environment', async () => {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'knowledge-os-mineru-command-'));
  const command = process.platform === 'win32'
    ? path.join(projectRoot, '.venv-mineru', 'Scripts', 'mineru.exe')
    : path.join(projectRoot, '.venv-mineru', 'bin', 'mineru');
  await fs.mkdir(path.dirname(command), { recursive: true });
  await fs.writeFile(command, '');
  try {
    assert.equal(resolveMineruCommand(projectRoot, {}), command);
    assert.equal(
      resolveMineruCommand(projectRoot, { KNOWLEDGE_OS_MINERU_COMMAND: 'custom-mineru' }),
      'custom-mineru',
    );
  } finally {
    await fs.rm(projectRoot, { recursive: true, force: true });
  }
});

test('MinerU service returns normalized Markdown and removes temporary files', async () => {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'knowledge-os-mineru-service-'));
  let temporaryRoot = null;
  const runProcess = async ({ args, env }) => {
    assert.match(env.NO_PROXY, /127\.0\.0\.1/);
    assert.match(env.no_proxy, /localhost/);
    if (args[0] === '--version') return { stdout: 'mineru 3.4.4', stderr: '' };
    const inputPath = args[args.indexOf('-p') + 1];
    const outputDirectory = args[args.indexOf('-o') + 1];
    assert.equal(args[args.indexOf('-m') + 1], 'ocr');
    assert.equal(args[args.indexOf('-l') + 1], 'ch');
    temporaryRoot = path.dirname(inputPath);
    const resultDirectory = path.join(outputDirectory, 'source', 'auto');
    await fs.mkdir(resultDirectory, { recursive: true });
    await fs.writeFile(path.join(resultDirectory, 'source.md'), [
      '# 扫描文档',
      '',
      '这是 MinerU 识别出的正文，长度足以通过导入检查。',
      '',
      '![](images/figure.png)',
    ].join('\n'));
    return { stdout: '', stderr: '' };
  };
  const service = createMineruOcrService({
    projectRoot,
    runtimeEnv: {
      KNOWLEDGE_OS_MINERU_COMMAND: 'fake-mineru',
      KNOWLEDGE_OS_MINERU_BACKEND: 'pipeline',
    },
    runProcess,
  });

  try {
    const capability = await service.capabilities();
    assert.equal(capability.available, true);
    assert.equal(capability.version, 'mineru 3.4.4');

    const result = await service.extract({ buffer: Buffer.from('%PDF-test') });
    assert.equal(result.provider, 'mineru');
    assert.match(result.markdown, /扫描文档/);
    assert.match(result.markdown, /> 图像见原始 PDF/);
    await assert.rejects(fs.access(temporaryRoot));
  } finally {
    await fs.rm(projectRoot, { recursive: true, force: true });
  }
});
