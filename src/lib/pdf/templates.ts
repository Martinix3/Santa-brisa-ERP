
import React from 'react';
// This is a stub file to satisfy the typechecker for tests.
// Replace with your actual PDF template implementation.

export function selectTemplate(name: string, data: any, theme: any): React.ReactElement | null {
  console.log(`[PDF Stub] Rendering template "${name}" with data:`, data);

  if (typeof document !== 'undefined') {
    // A minimal React element that can be rendered
    const Document = ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children);
    return React.createElement(Document, null, `PDF Template for: ${name}`);
  }
  
  // Return a non-JSX object for server-side test environment (like Vitest)
  return {
    type: 'Document' as any,
    props: {},
    key: null,
  };
}
