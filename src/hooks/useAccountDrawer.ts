"use client";

import { useState, useCallback } from "react";
import type { Account } from "@/domain/ssot";

export function useAccountDrawer() {
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openDrawer = useCallback((account: Account) => {
    setSelectedAccount(account);
    setIsOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
    // Delay clearing account to allow animation to complete
    setTimeout(() => setSelectedAccount(null), 300);
  }, []);

  return {
    selectedAccount,
    isOpen,
    openDrawer,
    closeDrawer
  };
}
