"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { BaseDrawer, BaseDrawerProps, useDrawerContext } from "./BaseDrawer";

export { useDrawerContext } from "./BaseDrawer";

export type EntityDrawerShellProps = Omit<BaseDrawerProps, "open" | "onClose"> & {
  isOpen?: boolean;
  onClose?: () => void;
};

function EntityDrawerShell({
  isOpen = true,
  onClose,
  context,
  ...rest
}: EntityDrawerShellProps) {
  const router = useRouter();

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  }, [onClose, router]);

  return <BaseDrawer open={!!isOpen} onClose={handleClose} context={context} {...rest} />;
}

// Export both as named and default for compatibility
export { EntityDrawerShell };
export default EntityDrawerShell;
