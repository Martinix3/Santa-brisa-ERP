// src/features/quicklog/QuickLogDialog.tsx
"use client";
import React, { useEffect } from "react";
import { SBDialog, SBDialogContent } from "@/components/ui";
import { useData } from "@/lib/dataprovider";
import { QuickLogContainer } from './QuickLogContainer';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accountId?: string;
  onSaved: (payload: any, openTask?: boolean) => void;
  defaultTab?: string;
};

export function QuickLogDialog({
  open,
  onOpenChange,
  accountId,
  onSaved,
  defaultTab
}: Props) {
  const { currentUser } = useData();

  useEffect(() => {
    if (open) {
      console.info('[Telemetry] quicklog_opened', { accountId });
    }
  }, [open, accountId]);

  if (!currentUser?.id) {
    return null;
  }

  return (
    <SBDialog open={open} onOpenChange={onOpenChange}>
      <SBDialogContent title="" maxWidth="40rem">
        <div className="h-[600px] -mx-6 -mb-6">
          <QuickLogContainer
            userId={currentUser.id}
            onClose={() => onOpenChange(false)}
          />
        </div>
      </SBDialogContent>
    </SBDialog>
  );
}
