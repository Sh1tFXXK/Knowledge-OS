/**
 * Monthly node/edge counts from git history (read-only).
 * Uses git show piped in-process; sanitizes legacy control chars in JSON strings.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';

function git(cmd, buffer = false) {
  return execSync(cmd, {
    encoding: buffer ? 'buffer' : 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

function sanitizeJson(text) {
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ');
}

function countAt(hash) {
  let nodes = -1;
  let edges = -1;
  try {
    const raw = git(`git show ${hash}:data/node-pool.json`, true).toString('utf8');
    const pool = JSON.parse(sanitizeJson(raw));
    nodes = Array.isArray(pool) ? pool.length : Object.keys(pool).length;
  } catch (e) {
    nodes = `ERR:${String(e.message).slice(0, 50)}`;
  }
  try {
    const raw = git(`git show ${hash}:data/knowledge-edges.json`, true).toString('utf8');
    const obj = JSON.parse(sanitizeJson(raw));
    edges = Array.isArray(obj) ? obj.length : (obj.edges?.length ?? Object.keys(obj).length);
  } catch {
    edges = 'missing';
  }
  return { nodes, edges };
}

const log = git('git log --follow --format=%H%x09%ad%x09%s --date=format:%Y-%m-%d -- data/node-pool.json')
  .toString()
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);

const byMonth = new Map();
for (const line of log) {
  const [hash, date, ...rest] = line.split('\t');
  const month = date.slice(0, 7);
  if (!byMonth.has(month)) byMonth.set(month, []);
  byMonth.get(month).push({ hash, date, subject: rest.join('\t') });
}

console.log('commits per month:');
for (const [m, arr] of [...byMonth.entries()].sort()) {
  console.log(`  ${m}\t${arr.length}\tnewest ${arr[0].date} ${arr[0].subject.slice(0, 60)}`);
}

const picks = [];
for (const [m, arr] of [...byMonth.entries()].sort()) {
  picks.push({ label: `${m}-end`, ...arr[0] });
  if (arr.length > 1) picks.push({ label: `${m}-start`, ...arr[arr.length - 1] });
  if (arr.length >= 6) picks.push({ label: `${m}-mid`, ...arr[Math.floor(arr.length / 2)] });
}

console.log('\ntimeline:');
console.log('label\tdate\tnodes\tedges\thash\tsubject');
const rows = [];
for (const p of picks) {
  const { nodes, edges } = countAt(p.hash);
  const row = {
    label: p.label,
    date: p.date,
    nodes,
    edges,
    hash: p.hash.slice(0, 8),
    subject: p.subject.slice(0, 50),
  };
  rows.push(row);
  console.log([row.label, row.date, row.nodes, row.edges, row.hash, row.subject].join('\t'));
}

console.log('\nAug every 3rd commit:');
const aug = byMonth.get('2026-08') || [];
for (let i = 0; i < aug.length; i += 3) {
  const p = aug[i];
  const { nodes, edges } = countAt(p.hash);
  const row = { label: 'aug-dense', date: p.date, nodes, edges, hash: p.hash.slice(0, 8), subject: p.subject.slice(0, 50) };
  rows.push(row);
  console.log([p.date, nodes, edges, p.hash.slice(0, 8), p.subject.slice(0, 50)].join('\t'));
}

fs.mkdirSync('outputs', { recursive: true });
fs.writeFileSync('outputs/archaeology-timeline.json', JSON.stringify(rows, null, 2));
console.log('\nwrote outputs/archaeology-timeline.json');
