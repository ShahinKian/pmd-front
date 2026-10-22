import type { Position } from "@xyflow/react";
import type { WorkflowDefinition, WorkflowNode } from "@/lib/workflows/types";

export interface DesignerPosition {
  x: number;
  y: number;
}

interface DesignerMetadata {
  designer?: {
    position?: DesignerPosition;
  };
  [key: string]: unknown;
}

export function readDesignerMetadata(metadataJson: string | null): DesignerMetadata {
  if (!metadataJson) return {};
  try {
    const parsed = JSON.parse(metadataJson);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function getNodePosition(node: WorkflowNode): DesignerPosition | null {
  const metadata = readDesignerMetadata(node.metadataJson);
  const position = metadata.designer?.position;
  if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return null;
  return { x: position.x, y: position.y };
}

export function withNodePosition(metadataJson: string | null, position: DesignerPosition): string {
  const metadata = readDesignerMetadata(metadataJson);
  return JSON.stringify({
    ...metadata,
    designer: {
      ...(metadata.designer ?? {}),
      position: {
        x: Math.round(position.x),
        y: Math.round(position.y),
      },
    },
  });
}

export function buildAutoLayout(definition: WorkflowDefinition): Map<string, DesignerPosition> {
  const result = new Map<string, DesignerPosition>();
  const start = definition.nodes.find((node) => node.isStart) ?? definition.nodes[0];
  if (!start) return result;

  const outgoing = new Map<string, string[]>();
  for (const transition of definition.transitions) {
    const items = outgoing.get(transition.fromNodeId) ?? [];
    items.push(transition.toNodeId);
    outgoing.set(transition.fromNodeId, items);
  }

  const levels = new Map<string, number>();
  const queue: string[] = [start.id];
  levels.set(start.id, 0);

  while (queue.length) {
    const current = queue.shift()!;
    const level = levels.get(current) ?? 0;
    for (const next of outgoing.get(current) ?? []) {
      if (levels.has(next)) continue;
      levels.set(next, level + 1);
      queue.push(next);
    }
  }

  for (const node of definition.nodes) {
    if (!levels.has(node.id)) {
      levels.set(node.id, Math.max(0, ...Array.from(levels.values())) + 1);
    }
  }

  const grouped = new Map<number, WorkflowNode[]>();
  for (const node of definition.nodes) {
    const level = levels.get(node.id) ?? 0;
    const items = grouped.get(level) ?? [];
    items.push(node);
    grouped.set(level, items);
  }

  for (const [level, nodes] of grouped) {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "fa"));
    const totalHeight = Math.max(1, nodes.length - 1) * 170;
    nodes.forEach((node, index) => {
      result.set(node.id, {
        x: 820 - level * 290,
        y: 260 - totalHeight / 2 + index * 170,
      });
    });
  }

  return result;
}
