"use client";

import { useEffect, useId, useState } from "react";
import { Maximize2, Minus, Plus, RefreshCw } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export default function MermaidDiagram({
  workflowId,
  revisionKey,
}: {
  workflowId: string;
  revisionKey?: string | number;
}) {
  const rawId = useId();
  const { resolvedTheme } = useTheme();
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);

  async function renderDiagram(signal?: AbortSignal) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/workflows/${workflowId}/diagram`, {
        credentials: "same-origin",
        cache: "no-store",
        signal,
      });
      if (!response.ok) throw new Error("DIAGRAM_FETCH");
      const code = await response.text();
      if (!code.trim()) {
        setSvg("");
        return;
      }

      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: resolvedTheme === "dark" ? "dark" : "default",
        flowchart: { htmlLabels: true, curve: "basis" },
      });

      const id = `workflow_mermaid_${rawId.replace(/[^a-zA-Z0-9_]/g, "")}_${Date.now()}`;
      const rendered = await mermaid.render(id, code);
      setSvg(rendered.svg);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError("رندر نمودار فرآیند انجام نشد.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void renderDiagram(controller.signal);
    return () => controller.abort();
  }, [workflowId, revisionKey, resolvedTheme]);

  function openFullscreen() {
    const html = `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>Workflow</title><style>body{margin:0;padding:24px;font-family:Arial;background:#fff}.wrap{min-width:max-content}</style></head><body><div class="wrap">${svg}</div></body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <div className="font-semibold text-default-800">نمای شماتیک فرآیند</div>
          <div className="mt-1 text-xs text-default-500">نمودار Mermaid مستقیماً از تعریف Workflow در backend ساخته می‌شود.</div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setZoom((value) => Math.max(0.5, value - 0.1))} title="کوچک‌نمایی">
            <Minus className="h-4 w-4" />
          </Button>
          <span className="min-w-12 text-center text-xs text-default-500">{Math.round(zoom * 100)}٪</span>
          <Button variant="ghost" size="icon" onClick={() => setZoom((value) => Math.min(2.5, value + 0.1))} title="بزرگ‌نمایی">
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => void renderDiagram()} title="بازخوانی">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={openFullscreen} disabled={!svg} title="تمام صفحه">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="min-h-[360px] overflow-auto p-6">
        {loading ? <div className="flex min-h-[300px] items-center justify-center text-default-500">در حال ساخت نمودار...</div> : null}
        {error ? <div className="flex min-h-[300px] items-center justify-center text-destructive">{error}</div> : null}
        {!loading && !error && !svg ? (
          <div className="flex min-h-[300px] items-center justify-center text-default-500">برای نمایش نمودار ابتدا گره‌های فرآیند را تعریف کنید.</div>
        ) : null}
        {svg ? (
          <div
            className="origin-top-right transition-transform [&_svg]:max-w-none"
            style={{ transform: `scale(${zoom})`, width: `${100 / zoom}%` }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : null}
      </div>
    </div>
  );
}
