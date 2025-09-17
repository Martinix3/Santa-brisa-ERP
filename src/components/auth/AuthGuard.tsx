
"use client";

import React from 'react';

// Authentication is disabled, so this guard simply renders its children.
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
