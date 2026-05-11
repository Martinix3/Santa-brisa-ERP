#!/bin/bash
# Automatically add force-dynamic to all async page components

find src/app/\(app\) -name "page.tsx" -type f | while read file; do
  # Check if file has "export default async function" and doesn't already have "force-dynamic"
  if grep -q "export default async function" "$file" && ! grep -q "export const dynamic" "$file"; then
    # Find the last import line number
    last_import=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1)
    if [ -n "$last_import" ]; then
      # Insert force-dynamic after last import
      sed -i "" "${last_import}a\\
\\
export const dynamic = 'force-dynamic';
" "$file"
      echo "Added force-dynamic to: $file"
    fi
  fi
done
