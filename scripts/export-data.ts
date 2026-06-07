import { createInitialAppState } from '../src/knowledge/demoSeed';
import * as fs from 'fs';
import * as path from 'path';

const state = createInitialAppState();
const dataDir = path.resolve(__dirname, '../data');

fs.writeFileSync(path.join(dataDir, 'node-pool.json'), JSON.stringify(state.nodePool, null, 2));
fs.writeFileSync(path.join(dataDir, 'knowledge-edges.json'), JSON.stringify(state.knowledgeEdges, null, 2));
fs.writeFileSync(path.join(dataDir, 'tree-data.json'), JSON.stringify(state.treeData, null, 2));
fs.writeFileSync(path.join(dataDir, 'questions.json'), JSON.stringify(state.questions, null, 2));
fs.writeFileSync(path.join(dataDir, 'inference-responses.json'), JSON.stringify(state.inferenceResponses, null, 2));
fs.writeFileSync(path.join(dataDir, 'subsystems.json'), JSON.stringify(state.subSystems, null, 2));

console.log('Exported!');
console.log('Nodes:', Object.keys(state.nodePool).length);
console.log('Edges:', state.knowledgeEdges.length);
console.log('Questions:', state.questions.length);
