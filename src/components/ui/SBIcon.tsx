// src/components/ui/SBIcon.tsx
"use client";
import * as LucideIcons from 'lucide-react';

export function SBIcon({ name, ...props }: { name: keyof typeof LucideIcons; [key: string]: any }) {
  const Icon = (LucideIcons as any)[name];
  if (!Icon) return null;
  return <Icon {...props} />;
}
