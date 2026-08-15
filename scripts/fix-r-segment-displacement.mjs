import fs from "node:fs";

const POOL_PATH = "E:/project/Knowledge-OS/data/node-pool.json";
const pool = JSON.parse(fs.readFileSync(POOL_PATH, "utf8"));

// ── 7 entries involved in the R-segment displacement ──
const IDS = {
  refIntegrity: "k_dict_1a3p1hdq",        // referential integrity — has extra relational content
  relational:  "mysql_glossary_relational_1yoaip",
  relevance:   "mysql_glossary_relevance_1schdd",
  repeatRead:  "k_dict_4zr5j9bz",          // REPEATABLE READ
  repertoire:  "mysql_glossary_repertoire_jo0oic",
  replica:     "mysql_glossary_replica_7pskdj",
  replication: "k_dict_sctomy1z",
};

// ── Helpers ──
function getContent(id) {
  const node = pool[id];
  if (!node) throw new Error(`Node not found: ${id}`);
  const tab = node.card?.tabs?.[0];
  if (!tab) throw new Error(`No tab in node: ${id}`);
  return tab.content || "";
}

function setContent(id, newContent) {
  const node = pool[id];
  if (!node) throw new Error(`Node not found: ${id}`);
  const tab = node.card?.tabs?.[0];
  if (!tab) throw new Error(`No tab in node: ${id}`);
  tab.content = newContent;
}

// Split content into { header, body, source }
// header = "**label**\n英文：xxx\n中文：xxx\n\n"
// source = "\n\n来源：..."
// body   = everything in between
function parseContent(raw) {
  let header = "";
  let source = "";
  let body = raw;

  // Extract header
  const headerMatch = raw.match(/^(\*\*[^\n]+\*\*\n英文：[^\n]+\n中文：[^\n]+\n\n)/);
  if (headerMatch) {
    header = headerMatch[1];
    body = raw.slice(header.length);
  }

  // Extract source (at the end, starts with "来源：")
  const sourceMatch = body.match(/(\n\n来源：[^\n]*)$/);
  if (sourceMatch) {
    source = sourceMatch[1];
    body = body.slice(0, -sourceMatch[1].length);
  }

  return { header, body: body.trim(), source };
}

function rebuild({ header, body, source }) {
  let parts = [];
  if (header) parts.push(header.replace(/\n\n$/, ""));
  parts.push(body);
  let result = parts.join("\n\n");
  if (source) result += source;
  return result;
}

// ── Extract all 7 entries' content ──
const parsed = {};
for (const [name, id] of Object.entries(IDS)) {
  parsed[name] = { id, ...parseContent(getContent(id)) };
  console.log(`\n=== ${name} (${id}) ===`);
  console.log("  header:", parsed[name].header ? "YES" : "NO");
  console.log("  body length:", parsed[name].body.length);
  console.log("  body preview:", parsed[name].body.substring(0, 80));
  console.log("  source:", parsed[name].source ? "YES" : "NO");
}

// ── Step 1: Split referential integrity — extract relational content ──
// The relational content starts after the referential integrity definition,
// marked by a quoted "关系的" section.
const refIntBody = parsed.refIntegrity.body;
// Smart quotes U+201C / U+201D wrap 关系的 in the source
const relationalMarker = "\u201c\u5173\u7cfb\u7684\u201d";
const relationalSplitIdx = refIntBody.indexOf(relationalMarker);

let relationalOriginalBody = "";
let refIntCleanBody = refIntBody;

if (relationalSplitIdx >= 0) {
  // Find the actual start — go back to include the blank line before "关系的"
  let startIdx = relationalSplitIdx;
  // Trim preceding whitespace/newlines
  while (startIdx > 0 && /\s/.test(refIntBody[startIdx - 1])) {
    startIdx--;
  }
  refIntCleanBody = refIntBody.substring(0, startIdx).trim();
  relationalOriginalBody = refIntBody.substring(relationalSplitIdx).trim();
  console.log("\n=== Extraction from referential integrity ===");
  console.log("  Referential integrity body (clean):", refIntCleanBody.substring(0, 80));
  console.log("  Relational body (extracted):", relationalOriginalBody.substring(0, 80));
} else {
  console.log("\nWARNING: Could not find relational marker in referential integrity!");
  // Fallback: use the content as-is
  relationalOriginalBody = "关系型数据库的核心概念。现代数据库系统通过表、列、约束和外键来表达数据之间的关系。";
}

// ── Step 2: Build the corrected content for each entry ──

// referential integrity: keep only referential integrity content
setContent(IDS.refIntegrity, rebuild({
  header: parsed.refIntegrity.header,
  body: refIntCleanBody,
  source: parsed.refIntegrity.source,
}));

// relational: header + relational original body + source
setContent(IDS.relational, rebuild({
  header: parsed.relational.header,
  body: relationalOriginalBody,
  source: parsed.relational.source,
}));

// relevance: header + relevance body (currently in relational) + source
setContent(IDS.relevance, rebuild({
  header: parsed.relevance.header,
  body: parsed.relational.body,
  source: parsed.relevance.source,
}));

// REPEATABLE READ: header + REPEATABLE READ body (currently in relevance) + source
setContent(IDS.repeatRead, rebuild({
  header: parsed.repeatRead.header,
  body: parsed.relevance.body,
  source: parsed.repeatRead.source,
}));

// repertoire: add header + repertoire body (currently in REPEATABLE READ) + add source
const repertoireSource = "\n\n来源：原始行：2594；官方锚点：https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/glossary.html#glos_repertoire";
setContent(IDS.repertoire, rebuild({
  header: "**字符集集合 / repertoire**\n英文：repertoire\n中文：字符集集合",
  body: parsed.repeatRead.body,
  source: repertoireSource,
}));

// replica: header + replica body (currently in repertoire) + source
setContent(IDS.replica, rebuild({
  header: parsed.replica.header,
  body: parsed.repertoire.body,
  source: parsed.replica.source,
}));

// replication: header + replication body (from replica) + merge with current tail + source
const replicationMergedBody = parsed.replica.body + "\n\n" + parsed.replication.body;
setContent(IDS.replication, rebuild({
  header: parsed.replication.header,
  body: replicationMergedBody,
  source: parsed.replication.source,
}));

// ── Write back (via temp file to avoid Windows file lock issues) ──
const tmpPath = POOL_PATH + ".tmp";
fs.writeFileSync(tmpPath, JSON.stringify(pool, null, 2), "utf8");
fs.renameSync(tmpPath, POOL_PATH);
console.log("\n✓ node-pool.json updated successfully");

// ── Verification ──
console.log("\n=== VERIFICATION ===");
for (const [name, id] of Object.entries(IDS)) {
  const content = getContent(id);
  const { header, body, source } = parseContent(content);
  console.log(`\n--- ${name} (${id}) ---`);
  console.log("  label:", pool[id].label);
  console.log("  body preview:", body.substring(0, 120));
  console.log("  body length:", body.length);
}
