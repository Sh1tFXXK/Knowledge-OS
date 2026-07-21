import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const dataPath = new URL('../data/node-pool.json', import.meta.url);
const currentPool = JSON.parse(readFileSync(dataPath, 'utf8'));
const baselinePool = JSON.parse(
  execFileSync('git', ['show', 'HEAD:data/node-pool.json'], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  }),
);

let restoredTabs = 0;
let restoredTabsWithContent = 0;

for (const [nodeId, baselineNode] of Object.entries(baselinePool)) {
  const currentNode = currentPool[nodeId];
  const baselineTabs = baselineNode?.card?.tabs;
  const currentTabs = currentNode?.card?.tabs;
  if (!Array.isArray(baselineTabs) || !Array.isArray(currentTabs)) continue;

  const currentById = new Map(currentTabs.map((tab) => [tab.id, tab]));
  const baselineIds = new Set(baselineTabs.map((tab) => tab.id));
  const mergedTabs = baselineTabs.map((baselineTab) => {
    const currentTab = currentById.get(baselineTab.id);
    if (currentTab) return currentTab;
    restoredTabs += 1;
    if (baselineTab.content?.trim()) restoredTabsWithContent += 1;
    return baselineTab;
  });

  for (const currentTab of currentTabs) {
    if (!baselineIds.has(currentTab.id)) mergedTabs.push(currentTab);
  }

  currentNode.card.tabs = mergedTabs;
}

writeFileSync(dataPath, `${JSON.stringify(currentPool, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ restoredTabs, restoredTabsWithContent }));
