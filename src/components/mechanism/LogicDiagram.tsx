import { useMemo } from 'react';
import type { EntityId, SceneLensFrame } from '../../mechanism';
import { toneClassName } from './toneClassName';

const NODE_WIDTH = 164;
const NODE_HEIGHT = 58;
const X_SCALE = 1.08;
const ROW_GAP = 78;

interface LogicDiagramProps {
  frame: SceneLensFrame;
  selectedEntityId?: EntityId | null;
  onSelectEntity?: (entityId: EntityId) => void;
}

interface LogicNodePosition {
  entityId: EntityId;
  x: number;
  y: number;
}

export default function LogicDiagram({
  frame,
  selectedEntityId = null,
  onSelectEntity,
}: LogicDiagramProps) {
  const layout = useMemo(() => buildLayout(frame), [frame]);

  return (
    <div className="mechanism-diagram-scroll">
      <div
        className="mechanism-logic-diagram"
        style={{ width: layout.width, height: layout.height }}
      >
        <svg
          className="mechanism-logic-edges"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          aria-hidden="true"
        >
          <defs>
            <marker
              id="mechanism-logic-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L8,4 L0,8 z" fill="context-stroke" />
            </marker>
          </defs>

          {frame.connections.map((connection) => {
            const source = layout.byEntity.get(connection.relation.source);
            const target = layout.byEntity.get(connection.relation.target);
            if (!source || !target) return null;

            const route = connectionRoute(source, target);
            const toneClass = toneClassName(connection.visual?.tone);

            return (
              <g key={connection.relation.id} className={`mechanism-logic-edge ${toneClass}`}>
                <path d={route.path} markerEnd="url(#mechanism-logic-arrow)" />
                {connection.visual ? (
                  <text x={route.labelX} y={route.labelY} textAnchor="middle">
                    {connection.relation.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>

        {frame.objects.map((object) => {
          const position = layout.byEntity.get(object.entity.id);
          if (!position) return null;

          return (
            <button
              key={object.entity.id}
              type="button"
              className={`mechanism-logic-node ${toneClassName(object.visual?.tone)} ${selectedEntityId === object.entity.id ? 'is-selected' : ''}`}
              style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
              aria-pressed={selectedEntityId === object.entity.id}
              onClick={() => onSelectEntity?.(object.entity.id)}
            >
              <strong>{object.entity.label}</strong>
              <span>{object.entity.note}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function buildLayout(frame: SceneLensFrame) {
  const xs = frame.objects.map((object) => object.position.x);
  const minX = Math.min(0, ...xs);
  const maxX = Math.max(0, ...xs);
  const byEntity = new Map<EntityId, LogicNodePosition>();
  const objectsByColumn = new Map<number, typeof frame.objects[number][] >();

  frame.objects.forEach((object) => {
    const column = objectsByColumn.get(object.position.x) ?? [];
    column.push(object);
    objectsByColumn.set(object.position.x, column);
  });

  let maxRows = 0;
  for (const [columnX, objects] of objectsByColumn) {
    objects.sort((left, right) => left.position.y - right.position.y);
    maxRows = Math.max(maxRows, objects.length);

    objects.forEach((object, rowIndex) => {
      byEntity.set(object.entity.id, {
        entityId: object.entity.id,
        x: 72 + (columnX - minX) * X_SCALE,
        y: 54 + rowIndex * ROW_GAP,
      });
    });
  }

  return {
    byEntity,
    width: Math.max(980, 144 + (maxX - minX) * X_SCALE + NODE_WIDTH),
    height: Math.max(600, 108 + maxRows * ROW_GAP),
  };
}

function connectionRoute(source: LogicNodePosition, target: LogicNodePosition) {
  const sourceCenterY = source.y + NODE_HEIGHT / 2;
  const targetCenterY = target.y + NODE_HEIGHT / 2;

  if (source.x === target.x) {
    const isDownward = target.y > source.y;
    const startY = isDownward ? source.y + NODE_HEIGHT : source.y;
    const endY = isDownward ? target.y : target.y + NODE_HEIGHT;
    const x = source.x + NODE_WIDTH / 2;
    const loopX = source.x + NODE_WIDTH + 38;

    return {
      path: `M ${x} ${startY} C ${loopX} ${startY}, ${loopX} ${endY}, ${x} ${endY}`,
      labelX: loopX,
      labelY: (startY + endY) / 2 - 7,
    };
  }

  const isForward = target.x > source.x;
  const x1 = isForward ? source.x + NODE_WIDTH : source.x;
  const x2 = isForward ? target.x : target.x + NODE_WIDTH;
  const direction = isForward ? 1 : -1;
  const curve = Math.max(36, Math.abs(x2 - x1) * 0.42);

  return {
    path: `M ${x1} ${sourceCenterY} C ${x1 + direction * curve} ${sourceCenterY}, ${x2 - direction * curve} ${targetCenterY}, ${x2} ${targetCenterY}`,
    labelX: (x1 + x2) / 2,
    labelY: (sourceCenterY + targetCenterY) / 2 - 7,
  };
}
