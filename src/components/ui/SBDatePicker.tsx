// src/components/ui/SBDatePicker.tsx
"use client";
import { DayPicker } from "react-day-picker";

export function SBDatePicker(props: any) {
  return (
    <div className="sb-card">
      <div className="sb-card__content">
        <DayPicker {...props} />
      </div>
    </div>
  );
}
