import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const sourcePath = path.resolve('src/core/explanation-index/indexCanvasCamera.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const canvasSourcePath = path.resolve('src/core/explanation-index/IndexCanvas.tsx');
const canvasSource = fs.readFileSync(canvasSourcePath, 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
  fileName: sourcePath,
});
const module = { exports: {} };
vm.runInNewContext(output.outputText, {
  exports: module.exports,
  module,
  require,
}, { filename: sourcePath });

const {
  READABLE_SCALE,
  canvasContentAspectRatio,
  clampCanvasScale,
  fitCanvasContent,
  fitReadableCanvasContent,
  focusCanvasTarget,
  positionCanvasOverviewLabels,
  shouldShowCanvasOverviewLabels,
  zoomCanvasAtPoint,
} = module.exports;

test('content aspect ratio excludes the overview padding', () => {
  assert.equal(canvasContentAspectRatio({ width: 380, height: 767 }), 276 / 663);
});

test('overview labels give every matrix cell clipped text while keeping group names readable', () => {
  const labels = positionCanvasOverviewLabels(
    [
      { id: 'owner', label: '计算机科学', kind: 'group', x: 0, y: 0, width: 3900, height: 9000, priority: 200 },
      { id: 'group', label: '算法', kind: 'group', x: 1800, y: 2400, width: 1600, height: 1200, priority: 120 },
      { id: 'wrapped', label: '数据库理论', kind: 'node', x: 400, y: 1200, width: 430, height: 300, priority: 20 },
      { id: 'tiny', label: '细小节点', kind: 'node', x: 20, y: 20, width: 224, height: 64, priority: 20 },
    ],
    { offsetX: 52, offsetY: 52, scale: 0.07 },
    { width: 380, height: 767 },
  );

  assert.equal(labels.map((label) => label.id).sort().join(','), 'group,owner,tiny,wrapped');
  const tiny = labels.find((label) => label.id === 'tiny');
  assert.equal(tiny.presentation, 'cell');
  assert.equal(tiny.label, '细小节点');
  assert.ok(tiny.fontSize >= 3);
  assert.equal(labels.find((label) => label.id === 'wrapped').label, '数据库理论');
  assert.equal(labels.some((label) => label.label.includes('…')), false);
  const groupLabels = labels.filter((label) => label.presentation === 'badge');
  assert.ok(groupLabels.every((label) => label.width >= 72));
  assert.equal(
    groupLabels[0].top + groupLabels[0].height <= groupLabels[1].top
      || groupLabels[1].top + groupLabels[1].height <= groupLabels[0].top
      || groupLabels[0].left + groupLabels[0].width <= groupLabels[1].left
      || groupLabels[1].left + groupLabels[1].width <= groupLabels[0].left,
    true,
  );
});

test('overview labels relocate nested group titles instead of dropping them', () => {
  const labels = positionCanvasOverviewLabels(
    [
      { id: 'outer', entityId: 'outer-node', label: 'Outer', kind: 'group', x: 0, y: 0, width: 2200, height: 1600, priority: 200 },
      { id: 'inner', entityId: 'inner-node', label: 'Inner', kind: 'group', x: 0, y: 0, width: 1600, height: 1200, priority: 180 },
    ],
    { offsetX: 52, offsetY: 52, scale: 0.1 },
    { width: 420, height: 320 },
  );

  assert.equal(labels.length, 2);
  assert.equal(labels.every((label) => label.presentation === 'badge'), true);
  assert.equal(
    labels[0].top + labels[0].height <= labels[1].top
      || labels[1].top + labels[1].height <= labels[0].top
      || labels[0].left + labels[0].width <= labels[1].left
      || labels[1].left + labels[1].width <= labels[0].left,
    true,
  );
});

test('overview labels keep the node title when a group badge cannot fit', () => {
  const labels = positionCanvasOverviewLabels(
    [
      { id: 'group', entityId: 'shared-node', label: 'Group', kind: 'group', x: 0, y: 0, width: 500, height: 120, priority: 200 },
      { id: 'node', entityId: 'shared-node', label: 'Node title', kind: 'node', x: 0, y: 0, width: 224, height: 64, priority: 200 },
    ],
    { offsetX: 20, offsetY: 20, scale: 0.05 },
    { width: 320, height: 240 },
  );

  assert.equal(labels.length, 1);
  assert.equal(labels[0].id, 'node');
  assert.equal(labels[0].presentation, 'cell');
});

test('overview labels remain active until native canvas text is readable', () => {
  assert.equal(shouldShowCanvasOverviewLabels(0.46), true);
  assert.equal(shouldShowCanvasOverviewLabels(READABLE_SCALE - 0.01), true);
  assert.equal(shouldShowCanvasOverviewLabels(READABLE_SCALE), false);
});

test('zoomed-in canvases keep a group title when its native header is offscreen', () => {
  const labels = positionCanvasOverviewLabels(
    [
      { id: 'group', entityId: 'group-node', label: 'Database', kind: 'group', x: 0, y: 0, width: 2000, height: 1200, priority: 200 },
      { id: 'node', entityId: 'group-node', label: 'Database', kind: 'node', x: 6, y: 6, width: 1988, height: 42, priority: 200 },
    ],
    { offsetX: -1500, offsetY: 40, scale: 1 },
    { width: 420, height: 320 },
  );

  assert.equal(labels.length, 1);
  assert.equal(labels[0].id, 'group');
  assert.equal(labels[0].presentation, 'badge');
});

test('zoomed-in canvases use the native title when its center is visible', () => {
  const labels = positionCanvasOverviewLabels(
    [
      { id: 'group', entityId: 'group-node', label: 'Database', kind: 'group', x: 0, y: 0, width: 2000, height: 1200, priority: 200 },
      { id: 'node', entityId: 'group-node', label: 'Database', kind: 'node', x: 6, y: 6, width: 1988, height: 42, priority: 200 },
    ],
    { offsetX: -800, offsetY: 40, scale: 1 },
    { width: 420, height: 320 },
  );

  assert.equal(labels.length, 0);
});

test('readable fit keeps large index boxes above the floor and starts at the top-left', () => {
  const viewport = { width: 1200, height: 700 };
  const content = { width: 6000, height: 3200 };
  const focusTarget = { id: 'owner', x: 720, y: 460, width: 360, height: 1600 };
  const camera = fitReadableCanvasContent(viewport, content, focusTarget);

  assert.equal(camera.scale, READABLE_SCALE);
  assert.equal(camera.offsetX, 52);
  assert.equal(camera.offsetY, 52);
});

test('overview fit centers and contains a large index inside the viewport padding', () => {
  const viewport = { width: 1400, height: 800 };
  const content = { width: 10000, height: 3600 };
  const padding = 52;
  const camera = fitCanvasContent(viewport, content, padding);
  const left = camera.offsetX;
  const top = camera.offsetY;
  const right = left + content.width * camera.scale;
  const bottom = top + content.height * camera.scale;

  assert.ok(left >= padding - 0.001);
  assert.ok(top >= padding - 0.001);
  assert.ok(right <= viewport.width - padding + 0.001);
  assert.ok(bottom <= viewport.height - padding + 0.001);
});

test('directory changes do not reset the canvas zoom', () => {
  assert.match(canvasSource, /fittedViewportSizeRef\.current/);
  assert.match(canvasSource, /fittedSize\?\.width === viewportSize\.width/);
  assert.match(canvasSource, /onViewportSizeChange\?\.\(nextSize\)/);
  assert.match(canvasSource, /setCamera\(fitCanvasContent\(viewportSize, contentSize\)\)/);
  assert.doesNotMatch(canvasSource, /contentKey/);
});

test('small indexes stay at natural scale and remain centered', () => {
  const camera = fitReadableCanvasContent(
    { width: 1200, height: 800 },
    { width: 660, height: 460 },
  );

  assert.equal(camera.scale, 1);
  assert.equal(camera.offsetX, 270);
  assert.equal(camera.offsetY, 170);
});

test('focus fit centers the selected box without exceeding its zoom cap', () => {
  const viewport = { width: 1600, height: 1000 };
  const target = { id: 'node', x: 920, y: 640, width: 224, height: 64 };
  const camera = focusCanvasTarget(viewport, target);

  assert.equal(camera.scale, 1.35);
  assert.equal(camera.offsetX + target.x * camera.scale, viewport.width / 2);
  assert.equal(camera.offsetY + target.y * camera.scale, viewport.height / 2);
});

test('point zoom preserves the world coordinate below the cursor', () => {
  const camera = { offsetX: -240, offsetY: 90, scale: 0.78 };
  const point = { x: 540, y: 330 };
  const worldBefore = {
    x: (point.x - camera.offsetX) / camera.scale,
    y: (point.y - camera.offsetY) / camera.scale,
  };
  const zoomed = zoomCanvasAtPoint(camera, point.x, point.y, 1.2);
  const worldAfter = {
    x: (point.x - zoomed.offsetX) / zoomed.scale,
    y: (point.y - zoomed.offsetY) / zoomed.scale,
  };

  assert.ok(Math.abs(worldAfter.x - worldBefore.x) < 0.000001);
  assert.ok(Math.abs(worldAfter.y - worldBefore.y) < 0.000001);
});

test('scale clamping stays finite for invalid input', () => {
  assert.equal(clampCanvasScale(Number.POSITIVE_INFINITY), 2.4);
  assert.equal(clampCanvasScale(Number.NEGATIVE_INFINITY), 0.005);
  assert.equal(clampCanvasScale(Number.NaN), 0.005);
});
