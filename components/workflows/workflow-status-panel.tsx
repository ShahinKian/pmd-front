import { CheckCircle2, GitBranch, ShieldCheck, UserRoundCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function WorkflowStatusPanel({
  workflowName,
  currentStage,
  responsibleRole,
  completed = false,
  hint,
}: {
  workflowName?: string | null;
  currentStage?: string | null;
  responsibleRole?: string | null;
  completed?: boolean;
  hint?: string | null;
}) {
  const cards = [
    { label: "فرآیند", value: workflowName || "گردش‌کار برنامه", icon: GitBranch },
    {
      label: "مرحله جاری",
      value: completed ? "پایان فرآیند" : currentStage || "در انتظار تعیین مرحله",
      icon: completed ? CheckCircle2 : ShieldCheck,
    },
    {
      label: "مسئول مرحله",
      value: completed ? "تکمیل شده" : responsibleRole || "—",
      icon: UserRoundCheck,
    },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-l from-white via-indigo-50/60 to-violet-50/70 shadow-sm dark:border-indigo-950 dark:from-card dark:via-indigo-950/20 dark:to-violet-950/20">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100/80 px-5 py-4 dark:border-indigo-900/60">
        <div>
          <h2 className="font-extrabold text-card-foreground">وضعیت گردش‌کار</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-card-foreground [overflow-wrap:anywhere]">{hint || "آخرین وضعیت ثبت‌شده در فرآیند"}</p>
        </div>
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
          completed
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
            : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
        )}>
          {completed ? <CheckCircle2 className="size-4" /> : <span className="size-2 animate-pulse rounded-full bg-current" />}
          {completed ? "تکمیل‌شده" : "در جریان"}
        </span>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-3">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="group rounded-xl border border-white/80 bg-white/85 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-background/70">
            <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              <Icon className="size-[18px]" />
            </div>
            <div className="text-xs font-semibold text-card-foreground">{label}</div>
            <div className="mt-1 whitespace-pre-wrap text-sm font-bold leading-6 text-card-foreground [overflow-wrap:anywhere]">{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
