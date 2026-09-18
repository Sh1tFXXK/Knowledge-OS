/**
 * Cline CLI 会话 → claude-code jsonl 转录 转换器（一次性工具）
 * 用法: node convert-cline.mjs <cline-session-id>
 * 输出: ~/.claude/projects/E--project-Knowledge-OS/<uuidv5>.jsonl
 * 确定性: 同一 cline 会话多次转换输出完全一致（uuid 派生自消息 id），
 *         会话继续跑后可重转重导，agit 按 --onto 识别前缀延伸。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const CWD_JSON = 'E:\\project\\Knowledge-OS';
const CLAUDE_VERSION = '2.1.263';
const GIT_BRANCH = 'optimize/performance';

const NS = crypto.createHash('sha1').update('agit-cline-import-ns').digest();
function uuidv5(name) {
  const h = crypto.createHash('sha1').update(NS).update(name).digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const s = h.toString('hex');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
}

const clineId = process.argv[2];
if (!clineId) { console.error('usage: node convert-cline.mjs <cline-session-id>'); process.exit(1); }

const src = `C:/Users/Administrator/.cline/data/sessions/${clineId}/${clineId}.messages.json`;
if (!fs.existsSync(src)) { console.error('not found:', src); process.exit(1); }
const data = JSON.parse(fs.readFileSync(src, 'utf8'));

const sessionId = uuidv5('session:' + clineId);

// cline 的 tool_result content 归一化为 claude 原生形状
function normalizeBlock(b) {
  if (b.type !== 'tool_result') return b;
  const out = { type: 'tool_result', tool_use_id: b.tool_use_id };
  if (typeof b.content === 'string') { out.content = b.content; return out; }
  const items = Array.isArray(b.content) ? b.content : [b.content];
  out.content = items.map(it => {
    if (it && typeof it === 'object' && ('query' in it || 'result' in it)) {
      const head = it.query ? `$ ${it.query}\n` : '';
      const body = it.result ?? '';
      const tail = it.success === false ? '\n[exit: failure]' : '';
      return { type: 'text', text: head + String(body) + tail };
    }
    if (it && typeof it === 'object' && it.type === 'text') return it;
    return { type: 'text', text: JSON.stringify(it) };
  });
  return out;
}

function iso(ts) {
  const d = typeof ts === 'number' ? new Date(ts) : new Date(ts ?? Date.now());
  return isNaN(d) ? new Date().toISOString() : d.toISOString();
}

let parentUuid = null;
const lines = [];
for (const m of data.messages) {
  if (!m || !m.role) continue;
  const uuid = uuidv5(`${clineId}:${m.id}`);
  const blocks = Array.isArray(m.content) ? m.content.map(normalizeBlock) : m.content;
  const content = typeof blocks === 'string' ? blocks : blocks.filter(b => b && b.type);
  const base = {
    parentUuid,
    isSidechain: false,
    uuid,
    timestamp: iso(m.ts),
    userType: 'external',
    entrypoint: 'cli',
    cwd: CWD_JSON,
    sessionId,
    version: CLAUDE_VERSION,
    gitBranch: GIT_BRANCH,
  };
  if (m.role === 'user') {
    lines.push({ ...base, type: 'user', message: { role: 'user', content } });
  } else {
    lines.push({ ...base, type: 'assistant', message: { role: 'assistant', content } });
  }
  parentUuid = uuid;
}

const outDir = 'C:/Users/Administrator/.claude/projects/E--project-Knowledge-OS';
const outFile = path.join(outDir, sessionId + '.jsonl');
fs.writeFileSync(outFile, lines.map(l => JSON.stringify(l)).join('\n') + '\n', 'utf8');
console.log('cline session :', clineId);
console.log('messages      :', data.messages.length, '-> jsonl lines:', lines.length);
console.log('sessionId     :', sessionId);
console.log('written       :', outFile);
console.log('first ts      :', iso(data.messages[0]?.ts), '| last ts:', iso(data.messages[data.messages.length - 1]?.ts));
