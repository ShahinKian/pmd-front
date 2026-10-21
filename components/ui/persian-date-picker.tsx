"use client";

import * as React from "react";
import DatePicker, { type DatePickerRef } from "react-multi-date-picker";
import type DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persianFa from "react-date-object/locales/persian_fa";
import { CalendarDays } from "lucide-react";

interface PersianDatePickerProps {
  value?: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function PersianDatePicker({
  value,
  onChange,
  placeholder = "انتخاب تاریخ",
  disabled = false,
}: PersianDatePickerProps) {
  const pickerRef = React.useRef<DatePickerRef>(null);

  const pickerValue = React.useMemo(() => {
    if (!value) return undefined;
    const date = new Date(value + "T12:00:00");
    return Number.isNaN(date.getTime()) ? undefined : date;
  }, [value]);

  return (
    <DatePicker
      ref={pickerRef}
      value={pickerValue}
      calendar={persian}
      locale={persianFa}
      format="YYYY/MM/DD"
      calendarPosition="bottom-right"
      disabled={disabled}
      onChange={(date: DateObject | null) => {
        if (!date) {
          onChange("");
          return;
        }

        const gregorian = date.toDate();
        const year = gregorian.getFullYear();
        const month = String(gregorian.getMonth() + 1).padStart(2, "0");
        const day = String(gregorian.getDate()).padStart(2, "0");

        onChange(`${year}-${month}-${day}`);
        requestAnimationFrame(() => pickerRef.current?.closeCalendar());
      }}
      render={(displayValue, openCalendar) => (
        <button
          type="button"
          className="date-picker-button"
          onClick={openCalendar}
          disabled={disabled}
        >
          <span className={displayValue ? "" : "muted"}>
            {displayValue || placeholder}
          </span>
          <CalendarDays size={18} />
        </button>
      )}
    />
  );
}
