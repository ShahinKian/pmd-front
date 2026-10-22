"use client";

import type { ReactNode } from "react";
import { Home } from "lucide-react";
import DashBoardLayoutProvider from "@/provider/dashboard.layout.provider";
import { Breadcrumbs, BreadcrumbItem } from "@/components/ui/breadcrumbs";

export default function DashboardShell({ children }: { children: ReactNode }) {
  return <DashBoardLayoutProvider>{children}</DashBoardLayoutProvider>;
}

export function Breadcrumb({
  items,
}: {
  items: Array<{ label: string; href?: string }>;
}) {
  return (
    <div className="mb-5 rounded-xl border bg-card px-4 py-3 shadow-sm">
      <Breadcrumbs
        variant="default"
        color="default"
        size="sm"
        maxItems={5}
        itemsBeforeCollapse={1}
        itemsAfterCollapse={2}
      >
        {items.map((item, index) => (
          <BreadcrumbItem
            key={item.label + index}
            href={item.href}
            startContent={index === 0 ? <Home className="h-4 w-4" /> : undefined}
            className={index === items.length - 1 ? "font-semibold" : undefined}
          >
            {item.label}
          </BreadcrumbItem>
        ))}
      </Breadcrumbs>
    </div>
  );
}
