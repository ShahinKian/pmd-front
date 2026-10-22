"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import DashBoardLayoutProvider from "@/provider/dashboard.layout.provider";

export default function DashboardShell({ children }: { children: ReactNode }) {
  return <DashBoardLayoutProvider>{children}</DashBoardLayoutProvider>;
}

export function Breadcrumb({
  items,
}: {
  items: Array<{ label: string; href?: string }>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm text-default-500 mb-4">
      {items.map((item, index) => (
        <span key={item.label} className="flex items-center gap-1.5">
          {index > 0 ? <ChevronLeft className="h-3.5 w-3.5" /> : null}
          {item.href ? (
            <Link href={item.href} prefetch className="hover:text-primary">
              {item.label}
            </Link>
          ) : (
            <span className="text-default-700">{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}
