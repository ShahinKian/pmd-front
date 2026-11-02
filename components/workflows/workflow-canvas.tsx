"use client";

import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  GitBranch,
  GripVertical,
  Loader2,
  Save,
  Split,
  Trash2,
  Workflow,
  RotateCcw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import StatusAlert from "@/components/ui/status-alert";
import { apiClient, apiErrorMessage } from "@/lib/http/client";
import type { RoleResponse } from "@/lib/auth/types";
import { roleLabel } from "@/lib/auth/role-labels";
import {
  WorkflowNodeType,
  workflowNodeTypeLabels,
  type WorkflowDefinition,
  type WorkflowNode,
  type WorkflowTransition,
} from "@/lib/workflows/types";
import WorkflowFlowNode from "@/components/workflows/workflow-flow-node";
import {
  buildAutoLayout,
  getNodePosition,
  withNodePosition,
  type DesignerPosition,
} from "@/lib/workflows/designer";

interface WorkflowCanvasProps {
  definition: WorkflowDefinition;
  roles: RoleResponse[];
  definitions: WorkflowDefinition[];
  draft: boolean;
  onChanged: () => Promise<void> | void;
}

interface PendingNode {
  position: DesignerPosition;
  type: WorkflowNodeType;
}

interface PendingConnection {
  source: string;
  target: string;
}

const nodeTypes = { workflowNode: WorkflowFlowNode };

type ActionDefinition = { key: string; label: string };
const legacyActions: Record<string, string> = {
  Submitted: "submit", Approved: "approve", Rejected: "reject", ReturnForEdit: "return-for-edit",
};
function normalizedAction(value: string | null): string {
  return value ? (legacyActions[value] ?? value) : "";
}



const conditionFields = [
  {key:"programType",label:"نوع برنامه",values:[["10","زنده"],["20","ضبطی"]]},
  {key:"networkId",label:"شناسه شبکه"},
  {key:"networkGroupId",label:"شناسه گروه"},
  {key:"planId",label:"شناسه برنامه"},
  {key:"durationMinutes",label:"مدت برنامه (دقیقه)"},
  {key:"hasExpert",label:"دارای کارشناس",values:[["true","بله"],["false","خیر"]]},
  {key:"productionMethod",label:"نحوه تولید"},
  {key:"occasion",label:"مناسبت"},
] as const;
type ConditionRule={field:string;operator:string;value:string;join:string};
function readGenericRules(json:string|null):{rules:ConditionRule[];trueOutcome:string;falseOutcome:string}{
  try{
    const x=JSON.parse(json||"{}").genericRules;
    if(x?.rules?.length)return {rules:x.rules,trueOutcome:x.trueOutcome||"yes",falseOutcome:x.falseOutcome||"no"};
  }catch{}
  return {rules:[{field:"programType",operator:"eq",value:"10",join:"and"}],trueOutcome:"yes",falseOutcome:"no"};
}
function rulesMetadata(base:string|null,form:FormData):string{
  let meta:Record<string,unknown>={};
  try{meta=JSON.parse(base||"{}");}catch{}
  const fields=form.getAll("ruleField").map(String);
  const operators=form.getAll("ruleOperator").map(String);
  const values=form.getAll("ruleValue").map(String);
  const joins=form.getAll("ruleJoin").map(String);
  meta.genericRules={
    rules:fields.map((field,i)=>({field,operator:operators[i],value:values[i],join:joins[i]||"and"})),
    trueOutcome:String(form.get("trueOutcome")||"yes"),
    falseOutcome:String(form.get("falseOutcome")||"no"),
  };
  return JSON.stringify(meta);
}

const palette = [
  { type: WorkflowNodeType.Process, label: "فرآیند", icon: Workflow, hint: "مرحله اجرایی توسط یک نقش" },
  { type: WorkflowNodeType.Condition, label: "شرط", icon: Split, hint: "انشعاب بر اساس Outcome" },
  { type: WorkflowNodeType.Decision, label: "تصمیم سیستمی", icon: GitBranch, hint: "تصمیم توسط Decision Handler" },
  { type: WorkflowNodeType.SubProcess, label: "زیر‌فرآیند", icon: RotateCcw, hint: "اجرای یک Workflow دیگر" },
];

function nodePayload(node: WorkflowNode, metadataJson = node.metadataJson) {
  return {
    key: node.key,
    name: node.name,
    type: node.type,
    description: node.description,
    assignedRole: node.assignedRole,
    isStart: node.isStart,
    allowBacktrack: node.allowBacktrack,
    sortOrder: node.sortOrder,
    decisionKey: node.decisionKey,
    subWorkflowDefinitionId: node.subWorkflowDefinitionId,
    metadataJson,
  };
}

function graphNodes(definition: WorkflowDefinition, draft: boolean): Node[] {
  const auto = buildAutoLayout(definition);
  return definition.nodes.map((workflowNode) => ({
    id: workflowNode.id,
    type: "workflowNode",
    position: getNodePosition(workflowNode) ?? auto.get(workflowNode.id) ?? { x: 0, y: 0 },
    data: { workflowNode, draft },
    draggable: draft,
  }));
}

function graphEdges(definition: WorkflowDefinition): Edge[] {
  return definition.transitions.map((transition) => ({
    id: transition.id,
    source: transition.fromNodeId,
    target: transition.toNodeId,
    label: transition.name || transition.outcome || "مسیر",
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { strokeWidth: 2 },
    labelStyle: { fontFamily: "Vazirmatn", fontSize: 11 },
    labelBgPadding: [7, 4] as [number, number],
    labelBgBorderRadius: 6,
    data: { transition },
  }));
}

export default function WorkflowCanvas({
  definition,
  roles,
  definitions,
  draft,
  onChanged,
}: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(graphNodes(definition, draft));
  const [edges, setEdges, onEdgesChange] = useEdgesState(graphEdges(definition));
  const { screenToFlowPosition, fitView } = useReactFlow();

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [pendingNode, setPendingNode] = useState<PendingNode | null>(null);
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);
  const { data: availableActions } = useSWR<ActionDefinition[]>("/workflows/actions");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    setNodes(graphNodes(definition, draft));
    setEdges(graphEdges(definition));
  }, [definition, draft, setNodes, setEdges]);

  const selectedNode = useMemo(
    () => definition.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [definition.nodes, selectedNodeId],
  );
  const selectedTransition = useMemo(
    () => definition.transitions.find((transition) => transition.id === selectedEdgeId) ?? null,
    [definition.transitions, selectedEdgeId],
  );
  const activeSubworkflows = useMemo(
    () => definitions.filter((item) => item.id !== definition.id && item.status === 1),
    [definitions, definition.id],
  );

  function selectNode(nodeId: string | null) {
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
    setPendingConnection(null);
  }

  function selectEdge(edgeId: string | null) {
    setSelectedEdgeId(edgeId);
    setSelectedNodeId(null);
    setPendingNode(null);
  }

  function dragStart(event: React.DragEvent, type: WorkflowNodeType) {
    if (!draft) return;
    event.dataTransfer.setData("application/pmd-workflow-node", String(type));
    event.dataTransfer.effectAllowed = "move";
  }

  function dropNode(event: React.DragEvent) {
    event.preventDefault();
    if (!draft) return;
    const raw = event.dataTransfer.getData("application/pmd-workflow-node");
    const type = Number(raw) as WorkflowNodeType;
    if (!Object.values(WorkflowNodeType).includes(type)) return;

    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const tempNode: WorkflowNode = {
      id: "__new__",
      key: "new-step",
      name: "مرحله جدید",
      type,
      description: null,
      assignedRole: null,
      isStart: false,
      allowBacktrack: false,
      sortOrder: definition.nodes.length + 1,
      decisionKey: type === WorkflowNodeType.Decision ? "configure-decision" : null,
      subWorkflowDefinitionId: null,
      metadataJson: withNodePosition(null, position),
    };

    setPendingNode({ type, position });
    setSelectedNodeId("__new__");
    setSelectedEdgeId(null);
    setNodes((current) => [
      ...current.filter((node) => node.id !== "__new__"),
      {
        id: "__new__",
        type: "workflowNode",
        position,
        data: { workflowNode: tempNode, draft: true },
        draggable: true,
      },
    ]);
  }

  function cancelPendingNode() {
    setPendingNode(null);
    setSelectedNodeId(null);
    setNodes((current) => current.filter((node) => node.id !== "__new__"));
  }

  function connect(connection: Connection) {
    if (
      !draft ||
      !connection.source ||
      !connection.target ||
      connection.source === connection.target ||
      connection.source === "__new__" ||
      connection.target === "__new__"
    ) return;
    setPendingConnection({ source: connection.source, target: connection.target });
    setSelectedEdgeId(null);
    setSelectedNodeId(null);
    setEdges((current) => [
      ...current.filter((edge) => edge.id !== "__pending__"),
      {
        id: "__pending__",
        source: connection.source!,
        target: connection.target!,
        type: "smoothstep",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeDasharray: "6 4", strokeWidth: 2 },
        label: "مسیر جدید",
      },
    ]);
  }

  function cancelPendingConnection() {
    setPendingConnection(null);
    setEdges((current) => current.filter((edge) => edge.id !== "__pending__"));
  }

  async function saveNewNode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingNode) return;
    const form = new FormData(event.currentTarget);
    const type = Number(form.get("type")) as WorkflowNodeType;
    const subWorkflowDefinitionId = String(form.get("subWorkflowDefinitionId") ?? "").trim() || null;

    if (type === WorkflowNodeType.SubProcess && !subWorkflowDefinitionId) {
      setMessage({ type: "error", text: "برای زیر‌فرآیند، Workflow مقصد را انتخاب کنید." });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const baseMetadata = withNodePosition(null,pendingNode.position);
      const metadataJson = type===WorkflowNodeType.Decision ? form.get("decisionKey")==="generic-rules"?rulesMetadata(baseMetadata,form):form.get("decisionKey")==="multi-branch"?JSON.stringify({...JSON.parse(baseMetadata),multiBranch:JSON.parse(String(form.get("multiBranchConfig")||"{}"))}):baseMetadata : baseMetadata;
      await apiClient.post("/workflows/" + definition.id + "/nodes", {
        key: "",
        name: String(form.get("name") ?? "").trim(),
        type,
        description: String(form.get("description") ?? "").trim() || null,
        assignedRole: String(form.get("assignedRole") ?? "").trim() || null,
        isStart: form.get("isStart") === "on",
        allowBacktrack: form.get("allowBacktrack") === "on",
        sortOrder: Number(form.get("sortOrder") ?? definition.nodes.length + 1),
        decisionKey: type === WorkflowNodeType.Decision
          ? String(form.get("decisionKey") ?? "").trim()
          : null,
        subWorkflowDefinitionId,
        metadataJson,
      });
      setPendingNode(null);
      setSelectedNodeId(null);
      await onChanged();
      setMessage({ type: "success", text: "مرحله روی Canvas ثبت شد." });
    } catch (error) {
      setMessage({ type: "error", text: apiErrorMessage(error, "ثبت مرحله انجام نشد.") });
    } finally {
      setBusy(false);
    }
  }

  async function saveNode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedNode) return;
    const form = new FormData(event.currentTarget);
    const type = Number(form.get("type")) as WorkflowNodeType;
    const currentGraphNode = nodes.find((node) => node.id === selectedNode.id);
    const positionedMetadata = withNodePosition(
      selectedNode.metadataJson,
      currentGraphNode?.position ?? getNodePosition(selectedNode) ?? { x: 0, y: 0 },
    );
    const metadataJson = type===WorkflowNodeType.Decision ? form.get("decisionKey")==="generic-rules"?rulesMetadata(positionedMetadata,form):form.get("decisionKey")==="multi-branch"?JSON.stringify({...JSON.parse(positionedMetadata),multiBranch:JSON.parse(String(form.get("multiBranchConfig")||"{}"))}):positionedMetadata : positionedMetadata;

    setBusy(true);
    setMessage(null);
    try {
      await apiClient.put("/workflows/" + definition.id + "/nodes/" + selectedNode.id, {
        key: selectedNode.key,
        name: String(form.get("name") ?? "").trim(),
        type,
        description: String(form.get("description") ?? "").trim() || null,
        assignedRole: String(form.get("assignedRole") ?? "").trim() || null,
        isStart: form.get("isStart") === "on",
        allowBacktrack: form.get("allowBacktrack") === "on",
        sortOrder: Number(form.get("sortOrder") ?? selectedNode.sortOrder),
        decisionKey: type === WorkflowNodeType.Decision
          ? String(form.get("decisionKey") ?? "").trim()
          : null,
        subWorkflowDefinitionId: type === WorkflowNodeType.SubProcess
          ? String(form.get("subWorkflowDefinitionId") ?? "").trim() || null
          : null,
        metadataJson,
      });
      await onChanged();
      setMessage({ type: "success", text: "تنظیمات مرحله ذخیره شد." });
    } catch (error) {
      setMessage({ type: "error", text: apiErrorMessage(error, "ویرایش مرحله انجام نشد.") });
    } finally {
      setBusy(false);
    }
  }

  async function saveConnection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingConnection) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage(null);
    try {
      await apiClient.post("/workflows/" + definition.id + "/transitions", {
        fromNodeId: pendingConnection.source,
        toNodeId: pendingConnection.target,
        name: String(form.get("name") ?? "").trim() || null,
        outcome: String(form.get("outcome") ?? "").trim() || null,
        priority: Number(form.get("priority") ?? 0),
      });
      setPendingConnection(null);
      await onChanged();
      setMessage({ type: "success", text: "اتصال جدید ثبت شد." });
    } catch (error) {
      setMessage({ type: "error", text: apiErrorMessage(error, "ثبت اتصال انجام نشد.") });
    } finally {
      setBusy(false);
    }
  }

  async function saveTransition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTransition) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage(null);
    try {
      await apiClient.put("/workflows/" + definition.id + "/transitions/" + selectedTransition.id, {
        fromNodeId: selectedTransition.fromNodeId,
        toNodeId: selectedTransition.toNodeId,
        name: String(form.get("name") ?? "").trim() || null,
        outcome: String(form.get("outcome") ?? "").trim() || null,
        priority: Number(form.get("priority") ?? selectedTransition.priority),
      });
      await onChanged();
      setMessage({ type: "success", text: "تنظیمات اتصال ذخیره شد." });
    } catch (error) {
      setMessage({ type: "error", text: apiErrorMessage(error, "ویرایش اتصال انجام نشد.") });
    } finally {
      setBusy(false);
    }
  }

  async function deleteNode(node: WorkflowNode) {
    if (!draft || !window.confirm("مرحله «" + node.name + "» حذف شود؟ اتصال‌های وابسته هم حذف می‌شوند.")) return;
    setBusy(true);
    try {
      await apiClient.delete("/workflows/" + definition.id + "/nodes/" + node.id);
      setSelectedNodeId(null);
      await onChanged();
    } catch (error) {
      setMessage({ type: "error", text: apiErrorMessage(error, "حذف مرحله انجام نشد.") });
    } finally {
      setBusy(false);
    }
  }

  async function deleteTransition(transition: WorkflowTransition) {
    if (!draft || !window.confirm("این اتصال حذف شود؟")) return;
    setBusy(true);
    try {
      await apiClient.delete("/workflows/" + definition.id + "/transitions/" + transition.id);
      setSelectedEdgeId(null);
      await onChanged();
    } catch (error) {
      setMessage({ type: "error", text: apiErrorMessage(error, "حذف اتصال انجام نشد.") });
    } finally {
      setBusy(false);
    }
  }

  async function persistNodePosition(nodeId: string, position: DesignerPosition) {
    if (!draft || nodeId === "__new__") return;
    const node = definition.nodes.find((item) => item.id === nodeId);
    if (!node) return;

    try {
      await apiClient.put(
        "/workflows/" + definition.id + "/nodes/" + node.id,
        nodePayload(node, withNodePosition(node.metadataJson, position)),
      );
    } catch (error) {
      setMessage({ type: "error", text: apiErrorMessage(error, "ذخیره موقعیت مرحله انجام نشد.") });
    }
  }

  const propertyTitle = pendingNode
    ? "مرحله جدید"
    : selectedNode
      ? "تنظیمات مرحله"
      : pendingConnection
        ? "اتصال جدید"
        : selectedTransition
          ? "تنظیمات اتصال"
          : "ویژگی‌ها";

  return (
    <div className="grid min-h-[720px] gap-4 xl:grid-cols-[220px_minmax(0,1fr)_320px]">
      <aside className="rounded-2xl border bg-card p-4">
        <div className="mb-4">
          <div className="font-semibold text-default-800">جعبه ابزار</div>
          <div className="mt-1 text-xs leading-5 text-default-500">
            نوع مرحله را بکش و روی Canvas رها کن.
          </div>
        </div>

        <div className="space-y-3">
          {palette.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.type}
                draggable={draft}
                onDragStart={(event) => dragStart(event, item.type)}
                className={
                  "group rounded-xl border p-3 transition " +
                  (draft
                    ? "cursor-grab hover:border-primary hover:bg-primary/5 active:cursor-grabbing"
                    : "cursor-not-allowed opacity-50")
                }
              >
                <div className="flex items-start gap-3">
                  <GripVertical className="mt-1 h-4 w-4 text-default-400" />
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-default-100 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-default-700">{item.label}</div>
                    <div className="mt-1 text-[11px] leading-5 text-default-500">{item.hint}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-xl bg-default-50 p-3 text-xs leading-6 text-default-500">
          اتصال مراحل: از نقطه سمت چپ یک مرحله بکش و به نقطه سمت راست مرحله بعدی وصل کن.
        </div>
      </aside>

      <section className="relative overflow-hidden rounded-2xl border bg-default-50">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, node) => selectNode(node.id)}
          onEdgeClick={(_, edge) => selectEdge(edge.id)}
          onPaneClick={() => {
            selectNode(null);
            setPendingNode(null);
            setPendingConnection(null);
            setEdges((current) => current.filter((edge) => edge.id !== "__pending__"));
          }}
          onNodeDragStop={(_, node) => void persistNodePosition(node.id, node.position)}
          onConnect={connect}
          onDrop={dropNode}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
          }}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.3}
          maxZoom={2}
          nodesConnectable={draft}
          nodesDraggable={draft}
          elementsSelectable
          deleteKeyCode={null}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={22} size={1} />
          <Controls position="bottom-left" />
          <MiniMap
            position="bottom-right"
            pannable
            zoomable
            nodeStrokeWidth={3}
            className="!border !border-default-200 !bg-card"
          />
        </ReactFlow>

        {!draft ? (
          <div className="pointer-events-none absolute left-4 top-4 rounded-lg border bg-card/95 px-3 py-2 text-xs text-default-600 shadow-sm">
            نسخه فعال فقط قابل مشاهده است؛ برای ویرایش Revision جدید بسازید.
          </div>
        ) : null}
      </section>

      <aside className="rounded-2xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <div className="font-semibold text-default-800">{propertyTitle}</div>
            <div className="mt-1 text-xs text-default-500">ویرایش بدون reload صفحه</div>
          </div>
          {(selectedNodeId || selectedEdgeId || pendingNode || pendingConnection) ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                cancelPendingNode();
                cancelPendingConnection();
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>

        <div className="max-h-[660px] overflow-y-auto p-4">
          {message ? (
            <StatusAlert
              type={message.type}
              message={message.text}
              dismissible
              onDismiss={() => setMessage(null)}
              className="mb-4"
            />
          ) : null}

          {!selectedNode && !selectedTransition && !pendingNode && !pendingConnection ? (
            <div className="py-12 text-center text-sm leading-7 text-default-500">
              یک مرحله یا اتصال را انتخاب کن تا ویژگی‌های آن اینجا نمایش داده شود.
            </div>
          ) : null}

          {pendingNode ? (
            <NodeForm
              key={"new-" + pendingNode.type}
              node={null}
              initialType={pendingNode.type}
              roles={roles}
              definitions={activeSubworkflows}
              busy={busy}
              onSubmit={saveNewNode}
              onDelete={null}
            />
          ) : null}

          {selectedNode && selectedNode.id !== "__new__" ? (
            <NodeForm
              key={selectedNode.id + selectedNode.metadataJson}
              node={selectedNode}
              initialType={selectedNode.type}
              roles={roles}
              definitions={activeSubworkflows}
              busy={busy}
              onSubmit={saveNode}
              onDelete={draft ? () => void deleteNode(selectedNode) : null}
            />
          ) : null}

          {pendingConnection ? (
            <TransitionForm
              key={pendingConnection.source + pendingConnection.target}
              transition={null}
              actions={availableActions ?? []}
              sourceNode={definition.nodes.find((node) => node.id === pendingConnection.source)}
              busy={busy}
              onSubmit={saveConnection}
              onDelete={null}
            />
          ) : null}

          {selectedTransition ? (
            <TransitionForm
              key={selectedTransition.id}
              transition={selectedTransition}
              actions={availableActions ?? []}
              sourceNode={definition.nodes.find((node) => node.id === selectedTransition.fromNodeId)}
              busy={busy}
              onSubmit={saveTransition}
              onDelete={draft ? () => void deleteTransition(selectedTransition) : null}
            />
          ) : null}
        </div>

        <div className="border-t p-3">
          <Button variant="outline" className="w-full" onClick={() => fitView({ padding: 0.25, duration: 300 })}>
            مرتب‌سازی نمای فعلی
          </Button>
        </div>
      </aside>
    </div>
  );
}

function NodeForm({
  node,
  initialType,
  roles,
  definitions,
  busy,
  onSubmit,
  onDelete,
}: {
  node: WorkflowNode | null;
  initialType: WorkflowNodeType;
  roles: RoleResponse[];
  definitions: WorkflowDefinition[];
  busy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDelete: (() => void) | null;
}) {
  const [type, setType] = useState<WorkflowNodeType>(node?.type ?? initialType);
  const [isStart, setIsStart] = useState(node?.isStart ?? false);
  const [allowBacktrack, setAllowBacktrack] = useState(node?.allowBacktrack ?? false);
  const {data:serverFields}=useSWR<{key:string;label:string;type:string;source:string;operators:string[]}[]>("/workflows/actions?fields=1");
  const availableFields=serverFields?.length?serverFields.map(f=>({...f,values:f.key==="programType"?[["10","زنده"],["20","ضبطی"]]:f.key==="hasExpert"?[["true","بله"],["false","خیر"]]:undefined})):conditionFields;
  const [genericDecision,setGenericDecision]=useState(node?.decisionKey==="generic-rules"||!node?.decisionKey);
  const [ruleConfig,setRuleConfig]=useState(()=>readGenericRules(node?.metadataJson??null));
  const [multiMode,setMultiMode]=useState(node?.decisionKey==="multi-branch");
  const [branchConfig,setBranchConfig]=useState(()=>{
    try {const v=JSON.parse(node?.metadataJson||"{}").multiBranch;if(v?.branches?.length)return v;}catch{}
    return {branches:[{outcome:"route-1",priority:0,rules:[{field:"programType",operator:"eq",value:"10",join:"and"}]}],defaultOutcome:"fallback"};
  });


  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label className="mb-2 text-default-600">عنوان مرحله *</Label>
        <Input name="name" defaultValue={node?.name ?? ""} required />
      </div>
      <div>
        <div className="text-xs text-default-500">شناسه داخلی مرحله به‌صورت خودکار مدیریت می‌شود.</div>
      </div>
      <div>
        <Label className="mb-2 text-default-600">نوع مرحله *</Label>
        <select
          name="type"
          value={type}
          onChange={(event) => setType(Number(event.target.value) as WorkflowNodeType)}
          className="h-10 w-full rounded-md border border-default-300 bg-background px-3 text-sm"
        >
          {Object.entries(workflowNodeTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <div>
        <Label className="mb-2 text-default-600">نقش مسئول</Label>
        <select
          name="assignedRole"
          defaultValue={node?.assignedRole ?? ""}
          className="h-10 w-full rounded-md border border-default-300 bg-background px-3 text-sm"
        >
          <option value="">بدون نقش مشخص</option>
          {roles.map((role) => <option key={role.id} value={role.name}>{roleLabel(role.name)}</option>)}
        </select>
      </div>
      <div>
        <Label className="mb-2 text-default-600">ترتیب</Label>
        <Input name="sortOrder" type="number" min="0" defaultValue={node?.sortOrder ?? 1} />
      </div>

      {type === WorkflowNodeType.Decision ? (
        <div className="space-y-3 rounded-xl border border-default-200 bg-default-50 p-3">
          <Label>روش تصمیم‌گیری</Label>
          <select className="w-full rounded-md border bg-background p-2 text-sm" value={multiMode?"multi-branch":genericDecision?"generic-rules":"legacy"} onChange={e=>{setMultiMode(e.target.value==="multi-branch");setGenericDecision(e.target.value==="generic-rules")}}>
            <option value="generic-rules">شرط‌های دوخروجی</option><option value="multi-branch">تصمیم چندمسیره</option>
            {node?.decisionKey&&node.decisionKey!=="generic-rules"?<option value="legacy">تصمیم قبلی (حفظ سازگاری)</option>:null}
          </select>
          <input type="hidden" name="decisionKey" value={multiMode?"multi-branch":genericDecision?"generic-rules":node?.decisionKey??""} />
          {multiMode?<div className="space-y-3"><p className="text-xs text-default-500">برای هر مسیر یک شرط و نتیجه تعریف کنید. مسیر پیش‌فرض اجباری است.</p>{branchConfig.branches.map((b:{outcome:string;priority:number;rules:ConditionRule[]},i:number)=><div key={i} className="space-y-2 rounded-lg border bg-card p-3"><Input value={b.outcome} onChange={e=>setBranchConfig((c:typeof branchConfig)=>({...c,branches:c.branches.map((x:typeof b,j:number)=>j===i?{...x,outcome:e.target.value}:x)}))} placeholder="شناسه مسیر (مثلاً live)"/><select className="w-full rounded-md border p-2" value={b.rules[0]?.field||"programType"} onChange={e=>setBranchConfig((c:typeof branchConfig)=>({...c,branches:c.branches.map((x:typeof b,j:number)=>j===i?{...x,rules:[{...x.rules[0],field:e.target.value}]}:x)}))}>{availableFields.map(f=><option key={f.key} value={f.key}>{f.label}</option>)}</select><select className="w-full rounded-md border p-2" value={b.rules[0]?.operator||"eq"} onChange={e=>setBranchConfig((c:typeof branchConfig)=>({...c,branches:c.branches.map((x:typeof b,j:number)=>j===i?{...x,rules:[{...x.rules[0],operator:e.target.value}]}:x)}))}><option value="eq">برابر</option><option value="ne">نابرابر</option><option value="gt">بزرگ‌تر</option><option value="lt">کوچک‌تر</option><option value="contains">شامل</option></select><Input value={b.rules[0]?.value||""} onChange={e=>setBranchConfig((c:typeof branchConfig)=>({...c,branches:c.branches.map((x:typeof b,j:number)=>j===i?{...x,rules:[{...x.rules[0],value:e.target.value}]}:x)}))} placeholder="مقدار"/><button type="button" className="text-xs text-red-600" onClick={()=>setBranchConfig((c:typeof branchConfig)=>({...c,branches:c.branches.filter((_:typeof b,j:number)=>j!==i)}))}>حذف مسیر</button></div>)}<button type="button" className="text-sm text-primary" onClick={()=>setBranchConfig((c:typeof branchConfig)=>({...c,branches:[...c.branches,{outcome:"route-"+(c.branches.length+1),priority:c.branches.length,rules:[{field:"programType",operator:"eq",value:"10",join:"and"}]}]}))}>+ مسیر جدید</button><Label>خروجی پیش‌فرض</Label><Input value={branchConfig.defaultOutcome} onChange={e=>setBranchConfig((c:typeof branchConfig)=>({...c,defaultOutcome:e.target.value}))}/><input type="hidden" name="multiBranchConfig" value={JSON.stringify(branchConfig)}/></div>:genericDecision?<div className="space-y-3">
            {ruleConfig.rules.map((rule,i)=><div key={i} className="space-y-2 rounded-lg border bg-card p-3 shadow-sm">
              {i>0?<select name="ruleJoin" value={rule.join||"and"} onChange={e=>setRuleConfig(c=>({...c,rules:c.rules.map((x,j)=>j===i?{...x,join:e.target.value}:x)}))} className="w-full rounded-md border p-2"><option value="and">و (AND)</option><option value="or">یا (OR)</option></select>:<input type="hidden" name="ruleJoin" value="and"/>}
              <select name="ruleField" className="w-full rounded-md border p-2" value={rule.field} onChange={e=>setRuleConfig(c=>({...c,rules:c.rules.map((x,j)=>j===i?{...x,field:e.target.value,value:""}:x)}))}>{availableFields.map(f=><option key={f.key} value={f.key}>{f.label}</option>)}</select>
              <select name="ruleOperator" className="w-full rounded-md border p-2" value={rule.operator} onChange={e=>setRuleConfig(c=>({...c,rules:c.rules.map((x,j)=>j===i?{...x,operator:e.target.value}:x)}))}><option value="eq">برابر</option><option value="ne">نابرابر</option><option value="gt">بزرگ‌تر از</option><option value="lt">کوچک‌تر از</option><option value="contains">شامل</option></select>
              {availableFields.find(f=>f.key===rule.field&&"values" in f && f.values) ? <select name="ruleValue" className="w-full rounded-md border p-2" value={rule.value} onChange={e=>setRuleConfig(c=>({...c,rules:c.rules.map((x,j)=>j===i?{...x,value:e.target.value}:x)}))}><option value="">انتخاب مقدار</option>{(availableFields.find(f=>f.key===rule.field) as {values:readonly (readonly [string,string])[]}).values.map(v=><option key={v[0]} value={v[0]}>{v[1]}</option>)}</select>:<Input name="ruleValue" value={rule.value} placeholder="مقدار مقایسه" onChange={e=>setRuleConfig(c=>({...c,rules:c.rules.map((x,j)=>j===i?{...x,value:e.target.value}:x)}))} />}
              {ruleConfig.rules.length>1?<button type="button" className="text-xs text-red-600" onClick={()=>setRuleConfig(c=>({...c,rules:c.rules.filter((_,j)=>j!==i)}))}>حذف شرط</button>:null}
            </div>)}
            <button type="button" className="text-sm text-primary" onClick={()=>setRuleConfig(c=>({...c,rules:[...c.rules,{field:"programType",operator:"eq",value:"10",join:"and"}]}))}>+ افزودن شرط</button>
            <p className="text-xs text-default-500">برای این مرحله دو مسیر خروجی با نتیجه‌های «yes» و «no» تعریف کنید. نتیجه واقعی براساس شرط‌ها محاسبه می‌شود.</p>
            <input type="hidden" name="trueOutcome" value="yes"/><input type="hidden" name="falseOutcome" value="no"/>
          </div>:null}
        </div>
      ) : null}

      {type === WorkflowNodeType.SubProcess ? (
        <div>
          <Label className="mb-2 text-default-600">Sub Workflow *</Label>
          <select
            name="subWorkflowDefinitionId"
            defaultValue={node?.subWorkflowDefinitionId ?? ""}
            required
            className="h-10 w-full rounded-md border border-default-300 bg-background px-3 text-sm"
          >
            <option value="">انتخاب Workflow فعال</option>
            {definitions.map((workflow) => (
              <option key={workflow.id} value={workflow.id}>{workflow.name} - v{workflow.version}</option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <Label className="mb-2 text-default-600">توضیح</Label>
        <textarea
          name="description"
          defaultValue={node?.description ?? ""}
          rows={3}
          className="w-full rounded-md border border-default-300 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      <label className="flex items-center justify-between rounded-lg border p-3">
        <span className="text-sm text-default-700">مرحله شروع</span>
        <Switch checked={isStart} onCheckedChange={setIsStart} />
        <input type="hidden" name="isStart" value={isStart ? "on" : ""} />
      </label>
      <label className="flex items-center justify-between rounded-lg border p-3">
        <span className="text-sm text-default-700">بازگشت مجاز</span>
        <Switch checked={allowBacktrack} onCheckedChange={setAllowBacktrack} />
        <input type="hidden" name="allowBacktrack" value={allowBacktrack ? "on" : ""} />
      </label>

      <div className="flex gap-2 pt-2">
        <Button className="flex-1" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          ذخیره
        </Button>
        {onDelete ? (
          <Button type="button" color="destructive" variant="soft" onClick={onDelete} disabled={busy}>
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function TransitionForm({
  transition,
  actions,
  sourceNode,
  busy,
  onSubmit,
  onDelete,
}: {
  transition: WorkflowTransition | null;
  actions: ActionDefinition[];
  sourceNode?: WorkflowNode;
  busy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDelete: (() => void) | null;
}) {
  const isSystemDecision = sourceNode?.type === WorkflowNodeType.Decision;
  const isGenericDecision = isSystemDecision && sourceNode?.decisionKey === "generic-rules";
  const isMultiDecision = isSystemDecision && sourceNode?.decisionKey === "multi-branch";
  const [custom, setCustom] = useState(false);
  const [selectedAction, setSelectedAction] = useState(normalizedAction(transition?.outcome ?? ""));
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label className="mb-2 text-default-600">عنوان مسیر</Label>
        <Input name="name" defaultValue={transition?.name ?? ""} placeholder="مثلاً تأیید" />
      </div>
      <div>
        {isSystemDecision ? (
          <>
            <Label className="mb-2 text-default-600">نتیجه تصمیم سیستمی</Label>
            {isMultiDecision?<Input name="outcome" defaultValue={transition?.outcome??""} placeholder="شناسه خروجی مسیر یا پیش‌فرض" required/>:isGenericDecision?<select name="outcome" defaultValue={transition?.outcome??""} className="w-full rounded-md border bg-background p-2 text-sm" required><option value="">انتخاب نتیجه</option><option value="yes">درست (بله)</option><option value="no">نادرست (خیر)</option></select>:<Input name="outcome" dir="ltr" defaultValue={transition?.outcome ?? ""} placeholder="10" required />}
            <p className="mt-1 text-xs text-default-500">{isGenericDecision?"مسیر درست و نادرست باید هر دو متصل باشند.":"مقدار نتیجه باید با خروجی تصمیم سیستمی برابر باشد."}</p>
          </>
        ) : (
          <>
            <Label className="mb-2 text-default-600">اقدام این مسیر</Label>
            <select
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={custom ? "__custom" : selectedAction}
              onChange={(event) => {
                setCustom(event.target.value === "__custom");
                if (event.target.value !== "__custom") setSelectedAction(event.target.value);
              }}
              required
            >
              <option value="">یک اقدام انتخاب کنید</option>
              {actions.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              {!custom && selectedAction && !actions.some((item) => item.key === selectedAction)
                ? <option value={selectedAction}>{transition?.name || "اقدام اختصاصی"}</option> : null}
              <option value="__custom">اقدام اختصاصی / تعریف جدید</option>
            </select>
            {custom ? (
              <><p className="text-xs text-default-500">عنوان مسیر بالا، نام اقدام اختصاصی خواهد بود. شناسه فنی به‌صورت خودکار ساخته می‌شود.</p><input type="hidden" name="outcome" value="" /></>
            ) : (
              <input type="hidden" name="outcome" value={selectedAction} />
            )}
            <p className="mt-1 text-xs text-default-500">
              کلید فنی اقدام به‌صورت خودکار ذخیره می‌شود و نیازی به وارد کردن Outcome نیست.
            </p>
          </>
        )}
      </div>
      <div>
        <Label className="mb-2 text-default-600">اولویت</Label>
        <Input name="priority" type="number" min="0" defaultValue={transition?.priority ?? 0} />
      </div>

      <div className="flex gap-2 pt-2">
        <Button className="flex-1" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          ذخیره مسیر
        </Button>
        {onDelete ? (
          <Button type="button" color="destructive" variant="soft" onClick={onDelete} disabled={busy}>
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </form>
  );
}
