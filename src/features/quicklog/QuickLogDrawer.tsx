"use client";

import { useState } from "react";
import { EntityDrawerShell } from "@/components/drawers/EntityDrawerShell";
import { QuickLogForm } from "@/features/quicklog/QuickLogForm";
import { Mic } from "lucide-react";

type QuickLogDrawerProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Si viene con cuenta, ocultamos controles de cuenta */
  accountId?: string;
  /** Título opcional */
  title?: string;
};

export default function QuickLogDrawer({
  open,
  onOpenChange,
  accountId,
  title = "🧠 SANTA BRAIN",
}: QuickLogDrawerProps) {
  const [voiceRequested, setVoiceRequested] = useState(false);

  return (
    <EntityDrawerShell
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={title}
      subtitle="Registrar nueva acción"
      footer={null}
    >
      <QuickLogForm
        accountId={accountId}
        showAccountControls={!accountId}
        voiceOpen={voiceRequested}
        onVoiceOpenChange={setVoiceRequested}
        compact
        onSaved={() => onOpenChange(false)}
        onCancel={() => onOpenChange(false)}
      />
    </EntityDrawerShell>
  );
}
