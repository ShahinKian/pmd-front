import { apiClient } from "@/lib/http/client";
import type { WorkflowDefinition, WorkflowNode } from "./types";

export class WorkflowCopyError extends Error {
  constructor(public workflowId: string) {
    super("کپی کامل نشد. پیش‌نویس ناقص ایجاد شده است؛ آن را بررسی و تکمیل کنید.");
  }
}

export async function copyWorkflow(sourceId: string, name: string): Promise<string> {
  if (!name.trim()) throw new Error("نام فرآیند الزامی است.");
  const { data: source } = await apiClient.get<WorkflowDefinition>(`/workflows/${sourceId}`);
  const sourceIds = new Set(source.nodes.map(node => node.id));
  if (source.transitions.some(edge => !sourceIds.has(edge.fromNodeId) || !sourceIds.has(edge.toNodeId))) {
    throw new Error("اتصال نامعتبر در فرآیند اصلی وجود دارد.");
  }
  const { data: target } = await apiClient.post<WorkflowDefinition>("/workflows", {
    name: name.trim(), description: source.description,
  });
  try {
    const ids = new Map<string, string>();
    for (const node of source.nodes) {
      const { id, ...payload } = node;
      const { data: created } = await apiClient.post<WorkflowNode>(`/workflows/${target.id}/nodes`, {
        ...payload,
        subWorkflowDefinitionId: node.subWorkflowDefinitionId === source.id ? target.id : node.subWorkflowDefinitionId,
      });
      ids.set(id, created.id);
    }
    for (const edge of source.transitions) {
      await apiClient.post(`/workflows/${target.id}/transitions`, {
        fromNodeId: ids.get(edge.fromNodeId), toNodeId: ids.get(edge.toNodeId),
        name: edge.name, outcome: edge.outcome, priority: edge.priority,
      });
    }
    return target.id;
  } catch {
    // The existing API has no delete/transaction endpoint. Keep the draft discoverable.
    throw new WorkflowCopyError(target.id);
  }
}
