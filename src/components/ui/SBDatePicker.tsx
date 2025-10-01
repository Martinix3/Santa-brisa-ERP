// src/components/ui/SBDatePicker.tsx
"use client";
import { DayPicker } from "react-day-picker";
import { SBCard } from "./SBCard";

export function SBDatePicker(props:any){
  return <SBCard><div className="p-2"><DayPicker {...props} /></div></SBCard>;
}
