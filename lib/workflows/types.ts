export enum WorkflowNodeType {
  Process = 1,
  Condition = 2,
  Decision = 3,
  SubProcess = 4,
}

export enum WorkflowDefinitionStatus {
  Draft = 0,
  Active = 1,
  Archived = 2,
}

export enum WorkflowInstanceStatus {
  Running = 1,
  WaitingForSubWorkflow = 2,
  Completed = 3,
  Cancelled = 4,
}

export enum WorkflowStepStatus {
  Active = 1,
  Completed = 2,
  Cancelled = 3,
}

export interface WorkflowNode {
  id: string;
  key: string;
  name: string;
  type: WorkflowNodeType;
  description: string | null;
  assignedRole: string | null;
  isStart: boolean;
  allowBacktrack: boolean;
  sortOrder: number;
  decisionKey: string | null;
  subWorkflowDefinitionId: string | null;
  metadataJson: string | null;
}

export interface WorkflowTransition {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  name: string | null;
  outcome: string | null;
  priority: number;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string | null;
  version: number;
  status: WorkflowDefinitionStatus;
  createdAt: string;
  activatedAt: string | null;
  nodes: WorkflowNode[];
  transitions: WorkflowTransition[];
}

export interface WorkflowFormType {
  id: string;
  key: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface WorkflowAssignment {
  id: string;
  formTypeId: string;
  formTypeKey: string;
  formTypeName: string;
  networkId: number | null;
  workflowDefinitionId: string;
  isEnabled: boolean;
  updatedAt: string;
}

export interface WorkflowInstance {
  id: string;
  workflowDefinitionId: string;
  workflowName: string;
  businessKey: string | null;
  status: WorkflowInstanceStatus;
  currentNodeId: string | null;
  currentNodeName: string | null;
  parentInstanceId: string | null;
  startedAt: string;
  completedAt: string | null;
  steps: Array<{
    id: string;
    nodeId: string;
    nodeName: string;
    status: WorkflowStepStatus;
    sequence: number;
    startedAt: string;
    completedAt: string | null;
    completedByUserId: string | null;
    outcome: string | null;
    description: string | null;
    isReentry: boolean;
  }>;
  variables: Record<string, string | null>;
}

export const workflowNodeTypeLabels: Record<number, string> = {
  1: "فرآیند",
  2: "شرط",
  3: "نقطه تصمیم",
  4: "زیر‌فرآیند",
};

export const workflowStatusLabels: Record<number, string> = {
  0: "پیش‌نویس",
  1: "فعال",
  2: "بایگانی",
};
