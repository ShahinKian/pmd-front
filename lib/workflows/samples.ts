import { apiClient } from "@/lib/http/client";
import type { WorkflowDefinition } from "@/lib/workflows/types";

interface SampleNode {
  key: string;
  name: string;
  type: number;
  description?: string | null;
  assignedRole?: string | null;
  isStart?: boolean;
  allowBacktrack?: boolean;
  sortOrder: number;
  decisionKey?: string | null;
  subWorkflowDefinitionId?: string | null;
  x: number;
  y: number;
}

interface SampleTransition {
  from: string;
  to: string;
  name: string;
  outcome?: string | null;
  priority: number;
}

interface WorkflowSample {
  name: string;
  description: string;
  nodes: SampleNode[];
  transitions: SampleTransition[];
}

interface CreatedNode {
  id: string;
}

function designerMetadata(x: number, y: number) {
  return JSON.stringify({
    designer: {
      position: { x, y },
    },
  });
}

async function createWorkflowSample(sample: WorkflowSample): Promise<WorkflowDefinition> {
  const definition = await apiClient.post<WorkflowDefinition>("/workflows", {
    name: sample.name,
    description: sample.description,
  });

  const workflowId = definition.data.id;
  const created = new Map<string, string>();

  for (const node of sample.nodes) {
    const response = await apiClient.post<CreatedNode>("/workflows/" + workflowId + "/nodes", {
      key: node.key,
      name: node.name,
      type: node.type,
      description: node.description ?? null,
      assignedRole: node.assignedRole ?? null,
      isStart: node.isStart ?? false,
      allowBacktrack: node.allowBacktrack ?? false,
      sortOrder: node.sortOrder,
      decisionKey: node.decisionKey ?? null,
      subWorkflowDefinitionId: node.subWorkflowDefinitionId ?? null,
      metadataJson: designerMetadata(node.x, node.y),
    });

    created.set(node.key, response.data.id);
  }

  for (const transition of sample.transitions) {
    const fromNodeId = created.get(transition.from);
    const toNodeId = created.get(transition.to);

    if (!fromNodeId || !toNodeId) {
      throw new Error("Workflow sample contains an invalid node reference.");
    }

    await apiClient.post("/workflows/" + workflowId + "/transitions", {
      fromNodeId,
      toNodeId,
      name: transition.name,
      outcome: transition.outcome ?? null,
      priority: transition.priority,
    });
  }

  return definition.data;
}

export const forecastWorkflowSampleName = "فرآیند پیش‌بینی - نمونه";

export function createForecastWorkflowSample() {
  return createWorkflowSample({
    name: forecastWorkflowSampleName,
    description:
      "تهیه‌کننده پیش‌بینی را ارسال می‌کند و مدیر گروه می‌تواند آن را تأیید، برای ویرایش برگرداند یا رد کند.",
    nodes: [
      {
        key: "producer-submit",
        name: "ثبت و ارسال پیش‌بینی توسط تهیه‌کننده",
        type: 1,
        description: "تهیه‌کننده پیش‌بینی را تکمیل و برای مدیر گروه ارسال می‌کند.",
        assignedRole: "Providers",
        isStart: true,
        sortOrder: 1,
        x: 900,
        y: 260,
      },
      {
        key: "group-manager-review",
        name: "بررسی مدیر گروه",
        type: 2,
        description: "مدیر گروه درباره تأیید، برگشت برای ویرایش یا رد پیش‌بینی تصمیم می‌گیرد.",
        assignedRole: "NetworkGroupManager",
        allowBacktrack: true,
        sortOrder: 2,
        x: 560,
        y: 260,
      },
      {
        key: "forecast-approved",
        name: "تأیید نهایی پیش‌بینی",
        type: 1,
        description: "پیش‌بینی توسط مدیر گروه تأیید شده است.",
        sortOrder: 3,
        x: 180,
        y: 120,
      },
      {
        key: "forecast-rejected",
        name: "رد نهایی پیش‌بینی",
        type: 1,
        description: "پیش‌بینی توسط مدیر گروه رد شده است.",
        sortOrder: 4,
        x: 180,
        y: 420,
      },
    ],
    transitions: [
      {
        from: "producer-submit",
        to: "group-manager-review",
        name: "ارسال به مدیر گروه",
        outcome: "submit",
        priority: 0,
      },
      {
        from: "group-manager-review",
        to: "forecast-approved",
        name: "تأیید",
        outcome: "approve",
        priority: 0,
      },
      {
        from: "group-manager-review",
        to: "producer-submit",
        name: "برگشت برای ویرایش",
        outcome: "return-for-edit",
        priority: 1,
      },
      {
        from: "group-manager-review",
        to: "forecast-rejected",
        name: "رد",
        outcome: "reject",
        priority: 2,
      },
    ],
  });
}

export const programProfileWorkflowSampleName = "فرآیند شناسنامه برنامه - نمونه";

export function createProgramProfileWorkflowSample() {
  return createWorkflowSample({
    name: programProfileWorkflowSampleName,
    description:
      "فرآیند شناسنامه برنامه از تهیه‌کننده شروع می‌شود، پس از تأیید مدیر گروه بر اساس نوع برنامه به ناظر زنده یا ضبطی می‌رود، سپس مدیر پخش و در پایان مدیر طرح و برنامه آن را تأیید می‌کنند.",
    nodes: [
      {
        key: "producer-submit-profile",
        name: "ثبت و ارسال شناسنامه توسط تهیه‌کننده",
        type: 1,
        description: "تهیه‌کننده شناسنامه برنامه را تکمیل و برای مدیر گروه ارسال می‌کند.",
        assignedRole: "Providers",
        isStart: true,
        sortOrder: 1,
        x: 1180,
        y: 330,
      },
      {
        key: "group-manager-profile-review",
        name: "بررسی شناسنامه توسط مدیر گروه",
        type: 2,
        description: "مدیر گروه شناسنامه را تأیید می‌کند یا برای اصلاح به تهیه‌کننده برمی‌گرداند.",
        assignedRole: "NetworkGroupManager",
        allowBacktrack: true,
        sortOrder: 2,
        x: 880,
        y: 330,
      },
      {
        key: "program-type-routing",
        name: "تشخیص نوع برنامه",
        type: 3,
        description: "programType=10 برنامه زنده و programType=20 برنامه ضبطی است.",
        sortOrder: 3,
        decisionKey: "program-type",
        x: 590,
        y: 330,
      },
      {
        key: "live-supervisor-review",
        name: "بررسی ناظر برنامه زنده",
        type: 1,
        description: "برای برنامه‌های زنده با programType=10.",
        assignedRole: "LiveSupervisor",
        sortOrder: 4,
        x: 310,
        y: 150,
      },
      {
        key: "recorded-supervisor-review",
        name: "بررسی ناظر برنامه ضبطی",
        type: 1,
        description: "برای برنامه‌های ضبطی با programType=20.",
        assignedRole: "Supervisor",
        sortOrder: 5,
        x: 310,
        y: 510,
      },
      {
        key: "broadcast-manager-review",
        name: "بررسی مدیر پخش",
        type: 2,
        description: "مدیر پخش شناسنامه را تأیید می‌کند یا برای اصلاح به مدیر گروه برمی‌گرداند.",
        assignedRole: "BroadcastManager",
        allowBacktrack: true,
        sortOrder: 6,
        x: 20,
        y: 330,
      },
      {
        key: "group-manager-correction",
        name: "تصمیم مدیر گروه پس از برگشت مدیر پخش",
        type: 2,
        description: "مدیر گروه یا اصلاح را انجام می‌دهد و مجدداً ارسال می‌کند، یا شناسنامه را به تهیه‌کننده ارجاع می‌دهد.",
        assignedRole: "NetworkGroupManager",
        allowBacktrack: true,
        sortOrder: 7,
        x: 300,
        y: 760,
      },
      {
        key: "plan-manager-final-review",
        name: "تأیید مدیر طرح و برنامه",
        type: 1,
        description: "پس از تأیید مدیر پخش، مدیر طرح و برنامه تأیید نهایی را انجام می‌دهد.",
        assignedRole: "PlanManager",
        sortOrder: 8,
        x: -300,
        y: 330,
      },
      {
        key: "program-profile-final-approved",
        name: "تأیید نهایی شناسنامه برنامه",
        type: 1,
        description: "فرآیند شناسنامه برنامه با تأیید مدیر طرح و برنامه پایان می‌یابد.",
        sortOrder: 9,
        x: -620,
        y: 330,
      },
    ],
    transitions: [
      {
        from: "producer-submit-profile",
        to: "group-manager-profile-review",
        name: "ارسال به مدیر گروه",
        outcome: "submit",
        priority: 0,
      },
      {
        from: "group-manager-profile-review",
        to: "program-type-routing",
        name: "تأیید مدیر گروه",
        outcome: "approve",
        priority: 0,
      },
      {
        from: "group-manager-profile-review",
        to: "producer-submit-profile",
        name: "برگشت به تهیه‌کننده",
        outcome: "return-for-edit",
        priority: 1,
      },
      {
        from: "program-type-routing",
        to: "live-supervisor-review",
        name: "برنامه زنده (10)",
        outcome: "10",
        priority: 0,
      },
      {
        from: "program-type-routing",
        to: "recorded-supervisor-review",
        name: "برنامه ضبطی (20)",
        outcome: "20",
        priority: 1,
      },
      {
        from: "live-supervisor-review",
        to: "broadcast-manager-review",
        name: "ارسال به مدیر پخش",
        outcome: "Reviewed",
        priority: 0,
      },
      {
        from: "recorded-supervisor-review",
        to: "broadcast-manager-review",
        name: "ارسال به مدیر پخش",
        outcome: "Reviewed",
        priority: 0,
      },
      {
        from: "broadcast-manager-review",
        to: "plan-manager-final-review",
        name: "تأیید مدیر پخش",
        outcome: "approve",
        priority: 0,
      },
      {
        from: "broadcast-manager-review",
        to: "group-manager-correction",
        name: "برگشت برای اصلاح",
        outcome: "return-for-edit",
        priority: 1,
      },
      {
        from: "group-manager-correction",
        to: "program-type-routing",
        name: "اصلاح توسط مدیر گروه و ارسال مجدد",
        outcome: "CorrectedByManager",
        priority: 0,
      },
      {
        from: "group-manager-correction",
        to: "producer-submit-profile",
        name: "ارجاع به تهیه‌کننده",
        outcome: "ReturnToProducer",
        priority: 1,
      },
      {
        from: "plan-manager-final-review",
        to: "program-profile-final-approved",
        name: "تأیید نهایی",
        outcome: "approve",
        priority: 0,
      },
    ],
  });
}
