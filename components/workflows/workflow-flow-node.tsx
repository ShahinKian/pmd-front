"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  CheckCircle2,
  GitBranch,
  RotateCcw,
  Split,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkflowNodeType, workflowNodeTypeLabels, type WorkflowNode } from "@/lib/workflows/types";
import { roleLabel } from "@/lib/auth/role-labels";

export interface WorkflowFlowNodeData extends Record<string, unknown> {
  workflowNode: WorkflowNode;
  draft: boolean;
}

const typeIcon = {
  [WorkflowNodeType.Process]: Workflow,
  [WorkflowNodeType.Condition]: Split,
  [WorkflowNodeType.Decision]: GitBranch,
  [WorkflowNodeType.SubProcess]: RotateCcw,
};

const typeClass = {
  [WorkflowNodeType.Process]: "border-primary/40 bg-primary/5 text-primary",
  [WorkflowNodeType.Condition]: "border-warning/40 bg-warning/5 text-warning",
  [WorkflowNodeType.Decision]: "border-info/40 bg-info/5 text-info",
  [WorkflowNodeType.SubProcess]: "border-success/40 bg-success/5 text-success",
};

export default function WorkflowFlowNode({ data, selected }: NodeProps) {
  const node = (data as WorkflowFlowNodeData).workflowNode;
  const Icon = typeIcon[node.type] ?? Workflow;

  return (
    <div
      className={cn(
        "relative min-w-[220px] max-w-[260px] rounded-2xl border-2 bg-card px-4 py-3 shadow-sm transition-all",
        typeClass[node.type],
        selected && "ring-4 ring-primary/15 shadow-lg",
      )}
      dir="rtl"
    >
      <Handle
        type="target"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-card !bg-primary"
      />

      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-current/10">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate font-semibold text-default-800">{node.name}</div>
            {node.isStart ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> : null}
          </div>
          <div className="mt-1 text-[11px] text-default-500">
            {workflowNodeTypeLabels[node.type]} · {node.key}
          </div>
          {node.assignedRole ? (
            <div className="mt-2 inline-flex rounded-md bg-default-100 px-2 py-1 text-[11px] text-default-600">
              {roleLabel(node.assignedRole)}
            </div>
          ) : null}
        </div>
      </div>

      {node.allowBacktrack ? (
        <div className="mt-3 border-t pt-2 text-[10px] text-info">بازگشت به مراحل قبلی مجاز است</div>
      ) : null}

      <Handle
        type="source"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-card !bg-primary"
      />
    </div>
  );
}
