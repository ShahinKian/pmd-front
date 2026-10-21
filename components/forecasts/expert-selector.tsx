"use client";

import { useMemo, useState } from "react";
import { Search, UserRound } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export interface ExpertOption {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
}

export function ExpertSelector({
  experts,
  selectedIds,
  onChange,
  disabled = false,
}: {
  experts: ExpertOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return experts;
    return experts.filter((expert) =>
      `${expert.firstName} ${expert.lastName} ${expert.specialty}`.includes(q),
    );
  }, [experts, query]);

  return (
    <div className="expert-panel">
      <div className="expert-toolbar">
        <div>
          <strong>کارشناسان برنامه</strong>
          <div className="muted relation-help">{selectedIds.length} کارشناس انتخاب شده</div>
        </div>
        {!disabled ? (
          <div className="expert-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجوی کارشناس"
            />
          </div>
        ) : null}
      </div>

      <div className="expert-grid">
        {filtered.map((expert) => {
          const checked = selectedIds.includes(expert.id);
          return (
            <div className={`expert-card ${checked ? "selected" : ""}`} key={expert.id}>
              <div className="expert-avatar"><UserRound size={19} /></div>
              <div className="expert-info">
                <strong>{expert.firstName} {expert.lastName}</strong>
                <span>{expert.specialty || "بدون تخصص ثبت‌شده"}</span>
              </div>
              <Switch
                checked={checked}
                disabled={disabled}
                onCheckedChange={(next) =>
                  onChange(
                    next
                      ? [...selectedIds, expert.id]
                      : selectedIds.filter((id) => id !== expert.id),
                  )
                }
              />
            </div>
          );
        })}
      </div>
      {filtered.length === 0 ? <div className="relation-empty">کارشناسی پیدا نشد.</div> : null}
    </div>
  );
}
