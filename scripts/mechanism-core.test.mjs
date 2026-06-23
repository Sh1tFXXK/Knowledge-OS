import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const repoRoot = process.cwd();
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-os-mechanism-'));

const sourceFiles = [
  'src/mechanism/core.ts',
  'src/mechanism/lens.ts',
  'src/mechanism/innodbStructureExample.ts',
  'src/mechanism/mysqlUpdateExample.ts',
];

try {
  for (const relativePath of sourceFiles) {
    const sourcePath = path.resolve(repoRoot, relativePath);
    const source = fs.readFileSync(sourcePath, 'utf8');
    const transpiled = ts.transpileModule(source, {
      fileName: sourcePath,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        strict: true,
      },
    });

    const outputName = path.basename(relativePath, '.ts');
    fs.writeFileSync(path.join(outDir, `${outputName}.js`), transpiled.outputText, 'utf8');
  }

  const require = createRequire(import.meta.url);
  const core = require(path.join(outDir, 'core.js'));
  const lens = require(path.join(outDir, 'lens.js'));
  const innodb = require(path.join(outDir, 'innodbStructureExample.js'));
  const sample = require(path.join(outDir, 'mysqlUpdateExample.js'));

  const frames = core.runProcess(sample.mysqlUpdateModel, sample.mysqlUpdateProcess);

  assert.equal(
    frames.length,
    sample.mysqlUpdateProcess.steps.length,
    'each process step must derive exactly one visible frame',
  );

  assert.deepEqual(
    frames.map((frame) => frame.stepIndex),
    sample.mysqlUpdateProcess.steps.map((_, index) => index),
    'frames must preserve process order without storing a separate timeline model',
  );

  assert.equal(
    frames[0].source.id,
    sample.MYSQL_UPDATE_ENTITIES.sqlUpdate,
    'the first frame must start at the SQL object',
  );
  assert.equal(
    frames[0].target.id,
    sample.MYSQL_UPDATE_ENTITIES.queryExecutor,
    'the first frame must enter the executor object',
  );

  const mutateFrame = frames.find((frame) => frame.stepId === 'mysql.update.step.mutate-record');
  assert.ok(mutateFrame, 'record mutation frame missing');
  assert.ok(
    mutateFrame.entityVisuals.some((visual) =>
      visual.entityId === sample.MYSQL_UPDATE_ENTITIES.clusteredRecord &&
      visual.tone === core.VisualTone.Mutated
    ),
    'record changes must be represented as a frame visual, not as stored model data',
  );

  const releaseFrame = frames.at(-1);
  assert.ok(releaseFrame, 'release frame missing');
  assert.ok(
    releaseFrame.entityVisuals.some((visual) =>
      visual.entityId === sample.MYSQL_UPDATE_ENTITIES.rowLock &&
      visual.tone === core.VisualTone.Released
    ),
    'lock release must be represented as a frame visual',
  );

  const depths = core.deriveTraversalDepths(
    sample.mysqlUpdateModel,
    sample.MYSQL_UPDATE_ENTITIES.sqlUpdate,
    new Set([
      core.RelationKind.RoutesTo,
      core.RelationKind.Caches,
      core.RelationKind.Contains,
    ]),
  );
  const depthByEntity = new Map(depths.map((item) => [item.entityId, item.depth]));

  assert.equal(
    depthByEntity.get(sample.MYSQL_UPDATE_ENTITIES.clusteredRecord),
    4,
    'structural depth must be derived from traversal, not stored on the entity',
  );

  const graphFrame = lens.projectGraphFrame(sample.mysqlUpdateModel, mutateFrame);
  assert.equal(
    graphFrame.nodes.length,
    sample.mysqlUpdateModel.entities.length,
    'graph lens must project the same model entities',
  );
  assert.equal(
    graphFrame.relations.length,
    sample.mysqlUpdateModel.relations.length,
    'graph lens must project the same model relations',
  );
  assert.ok(
    graphFrame.nodes.some((node) =>
      node.entity.id === sample.MYSQL_UPDATE_ENTITIES.clusteredRecord &&
      node.visual?.tone === core.VisualTone.Mutated &&
      node.active
    ),
    'graph lens must expose the current frame visual without mutating the entity',
  );
  assert.ok(
    graphFrame.relations.some((relation) =>
      relation.relation.id === sample.MYSQL_UPDATE_RELATIONS.executorWritesRecord &&
      relation.visual?.tone === core.VisualTone.Mutated &&
      relation.active
    ),
    'graph lens must expose the active write relation',
  );

  const timeline = lens.projectTimeline(frames);
  assert.deepEqual(
    timeline.items.map((item) => item.stepId),
    frames.map((frame) => frame.stepId),
    'timeline lens must mirror process order instead of owning a separate sequence',
  );
  assert.equal(
    timeline.items.at(-1).tone,
    core.VisualTone.Released,
    'timeline lens must read tone from frame visuals',
  );

  const sceneFrame = lens.projectSceneFrame(
    sample.mysqlUpdateModel,
    mutateFrame,
    {
      origin: sample.MYSQL_UPDATE_ENTITIES.sqlUpdate,
      traversalKinds: new Set([
        core.RelationKind.RoutesTo,
        core.RelationKind.Caches,
        core.RelationKind.Contains,
      ]),
    },
  );
  const sceneRecord = sceneFrame.objects.find(
    (object) => object.entity.id === sample.MYSQL_UPDATE_ENTITIES.clusteredRecord,
  );
  assert.equal(
    sceneRecord?.position.x,
    720,
    'scene lens must derive x-position from traversal depth',
  );
  assert.equal(
    sceneFrame.pulse?.sourceId,
    sample.MYSQL_UPDATE_ENTITIES.queryExecutor,
    'scene pulse must start at the current frame source',
  );
  assert.equal(
    sceneFrame.pulse?.targetId,
    sample.MYSQL_UPDATE_ENTITIES.clusteredRecord,
    'scene pulse must end at the current frame target',
  );

  const innodbFrames = core.runProcess(
    innodb.innodbStructureModel,
    innodb.innodbStructureProcess,
  );
  assert.equal(
    innodbFrames.length,
    innodb.innodbStructureProcess.steps.length,
    'InnoDB structure map must derive one frame per step',
  );
  assert.ok(
    innodb.innodbStructureModel.entities.some((entity) =>
      entity.id === innodb.INNODB_STRUCTURE_ENTITIES.doublewriteFiles
    ),
    'InnoDB structure map must include doublewrite files from the reference diagram',
  );
  assert.ok(
    innodb.innodbStructureModel.entities.some((entity) =>
      entity.id === innodb.INNODB_STRUCTURE_ENTITIES.undoTablespaces
    ),
    'InnoDB structure map must include undo tablespaces from the reference diagram',
  );
  assert.ok(
    innodb.innodbStructureModel.entities.some((entity) =>
      entity.id === innodb.INNODB_STRUCTURE_ENTITIES.redoLog
    ),
    'InnoDB structure map must include redo log from the reference diagram',
  );

  const innodbDepths = core.deriveTraversalDepths(
    innodb.innodbStructureModel,
    innodb.INNODB_STRUCTURE_ENTITIES.innodb,
    new Set([core.RelationKind.Contains]),
  );
  const innodbDepthByEntity = new Map(innodbDepths.map((item) => [item.entityId, item.depth]));
  assert.equal(
    innodbDepthByEntity.get(innodb.INNODB_STRUCTURE_ENTITIES.row),
    5,
    'InnoDB physical hierarchy must derive tablespace -> segment -> extent -> page -> row',
  );

  const innodbUndoFrame = innodbFrames.find((frame) => frame.stepId === 'innodb.structure.step.undo-redo');
  assert.ok(innodbUndoFrame, 'InnoDB undo/redo frame missing');
  assert.ok(
    innodbUndoFrame.relationVisuals.some((visual) =>
      visual.relationId === innodb.INNODB_STRUCTURE_RELATIONS.undoStoresRollbacks &&
      visual.tone === core.VisualTone.Guarded
    ),
    'undo relation must be highlighted as the rollback/read-consistency guard',
  );

  const coreSource = fs.readFileSync(path.resolve(repoRoot, 'src/mechanism/core.ts'), 'utf8');
  assert.doesNotMatch(coreSource, /\bState\b|\bstate\b/, 'mechanism core must not define state as a model primitive');
  assert.doesNotMatch(coreSource, /\bLayer\b|\blayer\b/, 'mechanism core must not define layer as a model primitive');
  assert.doesNotMatch(coreSource, /\bView\b|\bview\b/, 'mechanism core must not define view as a model primitive');

  const lensSource = fs.readFileSync(path.resolve(repoRoot, 'src/mechanism/lens.ts'), 'utf8');
  assert.match(lensSource, /projectGraphFrame/, 'graph lens adapter missing');
  assert.match(lensSource, /projectTimeline/, 'timeline lens adapter missing');
  assert.match(lensSource, /projectSceneFrame/, 'scene lens adapter missing');
  assert.doesNotMatch(lensSource, /localStorage|sessionStorage|document\.|window\./, 'lens adapters must stay pure');

  console.log('mechanism core checks passed');
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}
