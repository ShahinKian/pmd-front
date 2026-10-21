"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

export function TopicAxesEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: string[];
  onChange: (items: string[]) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const text = draft.trim();
    if (!text || value.includes(text)) return;
    onChange([...value, text]);
    setDraft("");
  }

  return (
    <div className="relation-editor">
      <div className="relation-editor-head">
        <div>
          <strong>محورهای موضوعی</strong>
          <div className="muted relation-help">هر پیش‌بینی می‌تواند چند محور موضوعی داشته باشد.</div>
        </div>
        <span className="relation-count">{value.length} محور</span>
      </div>

      {!disabled ? (
        <div className="relation-add">
          <input
            className="input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="عنوان محور را وارد کنید"
          />
          <button type="button" className="btn btn-primary" onClick={add}>
            <Plus size={17} /> افزودن محور
          </button>
        </div>
      ) : null}

      <div className="relation-list">
        {value.map((item, index) => (
          <div className="relation-item" key={item}>
            <span className="relation-index">{index + 1}</span>
            <span className="relation-title">{item}</span>
            {!disabled ? (
              <button
                type="button"
                className="relation-remove"
                onClick={() => onChange(value.filter((entry) => entry !== item))}
                aria-label="حذف محور"
              >
                <X size={16} />
              </button>
            ) : null}
          </div>
        ))}
        {value.length === 0 ? <div className="relation-empty">هنوز محوری اضافه نشده است.</div> : null}
      </div>
    </div>
  );
}
