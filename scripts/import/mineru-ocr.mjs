import { spawn } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export const MINERU_OCR_PROVIDER = 'mineru';
export const DEFAULT_MINERU_BACKEND = 'pipeline';
export const MINERU_PARSE_METHOD = Object.freeze({
  Auto: 'auto',
  Text: 'txt',
  Ocr: 'ocr',
});
const DEFAULT_TIMEOUT_MS = 2 * 60 * 60 * 1000;
const MAX_PROCESS_OUTPUT_BYTES = 2 * 1024 * 1024;

function configuredTimeout(runtimeEnv) {
  const value = Number(runtimeEnv.KNOWLEDGE_OS_MINERU_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  return Number.isFinite(value) && value >= 10_000 ? value : DEFAULT_TIMEOUT_MS;
}

function mineruProcessEnvironment(runtimeEnv) {
  const bypassHosts = new Set(
    String(runtimeEnv.NO_PROXY ?? runtimeEnv.no_proxy ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
  bypassHosts.add('127.0.0.1');
  bypassHosts.add('localhost');
  bypassHosts.add('::1');
  const noProxy = [...bypassHosts].join(',');
  return {
    ...runtimeEnv,
    NO_PROXY: noProxy,
    no_proxy: noProxy,
  };
}

function projectMineruCommand(projectRoot) {
  return process.platform === 'win32'
    ? path.join(projectRoot, '.venv-mineru', 'Scripts', 'mineru.exe')
    : path.join(projectRoot, '.venv-mineru', 'bin', 'mineru');
}

export function resolveMineruCommand(projectRoot, runtimeEnv = process.env) {
  const configured = String(runtimeEnv.KNOWLEDGE_OS_MINERU_COMMAND ?? '').trim();
  if (configured) return configured;
  const projectCommand = projectMineruCommand(projectRoot);
  return fs.existsSync(projectCommand) ? projectCommand : 'mineru';
}

function appendProcessOutput(current, chunk) {
  if (current.length >= MAX_PROCESS_OUTPUT_BYTES) return current;
  return `${current}${String(chunk)}`.slice(0, MAX_PROCESS_OUTPUT_BYTES);
}

function stopProcess(child) {
  if (child.exitCode !== null || child.killed) return;
  if (process.platform === 'win32' && child.pid) {
    const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
      windowsHide: true,
      stdio: 'ignore',
    });
    killer.unref();
    return;
  }
  child.kill('SIGTERM');
}

export function runMineruProcess({
  command,
  args,
  cwd,
  env,
  signal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    let child;
    try {
      child = spawn(command, args, {
        cwd,
        env,
        windowsHide: true,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      reject(error);
      return;
    }

    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      if (error) reject(error);
      else resolve(value);
    };
    const abort = () => {
      stopProcess(child);
      finish(new Error('MinerU OCR 已取消'));
    };
    const timer = setTimeout(() => {
      stopProcess(child);
      finish(new Error(`MinerU OCR 超时（${Math.round(timeoutMs / 60_000)} 分钟）`));
    }, timeoutMs);

    child.stdout?.on('data', (chunk) => { stdout = appendProcessOutput(stdout, chunk); });
    child.stderr?.on('data', (chunk) => { stderr = appendProcessOutput(stderr, chunk); });
    child.on('error', (error) => finish(error));
    child.on('close', (code) => {
      if (code === 0) {
        finish(null, { stdout, stderr });
        return;
      }
      const detail = stderr.trim() || stdout.trim() || `退出码 ${code}`;
      finish(new Error(`MinerU OCR 失败：${detail.slice(-2_000)}`));
    });
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
  });
}

async function collectMarkdownFiles(directory) {
  const entries = await fsp.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectMarkdownFiles(target));
    else if (entry.isFile() && entry.name.toLocaleLowerCase().endsWith('.md')) files.push(target);
  }
  return files;
}

function normalizeMineruMarkdown(markdown) {
  return String(markdown ?? '')
    .replace(/!\[([^\]]*)\]\((?!https?:|data:)[^)]+\)/gi, (_match, alt) => (
      alt.trim() ? `> 图像：${alt.trim()}` : '> 图像见原始 PDF'
    ))
    .replace(/<img\b[^>]*>/gi, '> 图像见原始 PDF')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function readMineruMarkdown(outputDirectory) {
  const markdownFiles = await collectMarkdownFiles(outputDirectory);
  if (markdownFiles.length === 0) {
    throw new Error('MinerU 没有生成 Markdown 结果');
  }
  const candidates = await Promise.all(markdownFiles.map(async (filePath) => ({
    filePath,
    markdown: await fsp.readFile(filePath, 'utf8'),
  })));
  candidates.sort((left, right) => right.markdown.length - left.markdown.length);
  const markdown = normalizeMineruMarkdown(candidates[0].markdown);
  if (markdown.replace(/\s/g, '').length < 20) {
    throw new Error('MinerU 没有识别出足够的正文');
  }
  return markdown;
}

export function createMineruOcrService({
  projectRoot,
  runtimeEnv = process.env,
  runProcess = runMineruProcess,
} = {}) {
  const resolvedProjectRoot = path.resolve(projectRoot ?? process.cwd());
  const command = resolveMineruCommand(resolvedProjectRoot, runtimeEnv);
  const backend = String(runtimeEnv.KNOWLEDGE_OS_MINERU_BACKEND ?? DEFAULT_MINERU_BACKEND).trim()
    || DEFAULT_MINERU_BACKEND;
  const language = String(runtimeEnv.KNOWLEDGE_OS_MINERU_LANGUAGE ?? 'ch').trim() || 'ch';
  const timeoutMs = configuredTimeout(runtimeEnv);
  const processEnv = mineruProcessEnvironment(runtimeEnv);
  let capabilityPromise;

  const capabilities = async () => {
    if (!capabilityPromise) {
      const directCommand = path.isAbsolute(command) || /[\\/]/.test(command);
      if (directCommand) {
        capabilityPromise = Promise.resolve({
          available: fs.existsSync(command),
          provider: MINERU_OCR_PROVIDER,
          backend,
          version: '',
        });
      } else {
        capabilityPromise = runProcess({
          command,
          args: ['--version'],
          cwd: resolvedProjectRoot,
          env: processEnv,
          timeoutMs: 30_000,
        }).then(({ stdout, stderr }) => ({
          available: true,
          provider: MINERU_OCR_PROVIDER,
          backend,
          version: `${stdout}\n${stderr}`.trim().split(/\r?\n/).find(Boolean) ?? '',
        })).catch(() => ({
          available: false,
          provider: MINERU_OCR_PROVIDER,
          backend,
          version: '',
        }));
      }
    }
    return capabilityPromise;
  };

  const extract = async ({ buffer, signal, method = MINERU_PARSE_METHOD.Ocr }) => {
    if (!Object.values(MINERU_PARSE_METHOD).includes(method)) {
      throw new Error('MinerU PDF 解析方式无效');
    }
    const capability = await capabilities();
    if (!capability.available) {
      throw new Error('扫描 PDF 需要本地 MinerU。请先运行 npm run setup:mineru');
    }
    const temporaryDirectory = await fsp.mkdtemp(path.join(os.tmpdir(), 'knowledge-os-mineru-'));
    const inputPath = path.join(temporaryDirectory, 'source.pdf');
    const outputDirectory = path.join(temporaryDirectory, 'output');
    await fsp.mkdir(outputDirectory, { recursive: true });
    try {
      signal?.throwIfAborted?.();
      await fsp.writeFile(inputPath, buffer);
      const args = ['-p', inputPath, '-o', outputDirectory, '-b', backend];
      if (backend === 'pipeline' || backend.startsWith('hybrid-')) {
        args.push('-m', method);
      }
      if (backend === 'pipeline') {
        args.push('-l', language);
      }
      await runProcess({
        command,
        args,
        cwd: resolvedProjectRoot,
        env: processEnv,
        signal,
        timeoutMs,
      });
      return {
        provider: MINERU_OCR_PROVIDER,
        backend,
        markdown: await readMineruMarkdown(outputDirectory),
      };
    } finally {
      await fsp.rm(temporaryDirectory, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 200,
      });
    }
  };

  return { capabilities, extract };
}
