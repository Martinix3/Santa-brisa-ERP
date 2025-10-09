#!/usr/bin/env tsx
/**
 * Codemod: data.users → data.teamMembers
 * 
 * Transforma todas las referencias de data.users a data.teamMembers
 * en archivos TypeScript/TSX del proyecto.
 * 
 * Uso:
 *   npx tsx scripts/codemod-users-to-teamMembers.ts [--dry-run] [--verbose]
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TransformResult {
  filePath: string;
  changes: Array<{ line: number; before: string; after: string }>;
  modified: boolean;
}

interface CodemodOptions {
  dryRun: boolean;
  verbose: boolean;
  createBackup: boolean;
}

const args = process.argv.slice(2);
const options: CodemodOptions = {
  dryRun: args.includes('--dry-run'),
  verbose: args.includes('--verbose'),
  createBackup: !args.includes('--no-backup'),
};

console.log(`
🔧 Codemod: data.users → data.teamMembers
═══════════════════════════════════════

Mode: ${options.dryRun ? '🔍 DRY RUN (no changes will be applied)' : '✏️  APPLY CHANGES'}
Backup: ${options.createBackup && !options.dryRun ? '✅ Enabled' : '❌ Disabled'}
Verbose: ${options.verbose ? '✅ On' : '❌ Off'}
`);

/**
 * Encuentra todos los archivos TS/TSX en src/
 */
function findSourceFiles(dir: string): string[] {
  const files: string[] = [];
  
  function walk(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules, .next, etc
        if (!['node_modules', '.next', 'dist', 'build'].includes(entry.name)) {
          walk(fullPath);
        }
      } else if (entry.isFile()) {
        if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
          files.push(fullPath);
        }
      }
    }
  }
  
  walk(dir);
  return files;
}

/**
 * Transforma el contenido de un archivo
 */
function transformFile(content: string, filePath: string): TransformResult {
  const lines = content.split('\n');
  const changes: Array<{ line: number; before: string; after: string }> = [];
  let modified = false;
  
  const transformedLines = lines.map((line, index) => {
    let transformed = line;
    let hasChange = false;
    
    // Patrón 1: data.users (sin optional chaining)
    if (/\bdata\.users\b/.test(transformed)) {
      const before = transformed;
      transformed = transformed.replace(/\bdata\.users\b/g, 'data.teamMembers');
      if (before !== transformed) {
        hasChange = true;
      }
    }
    
    // Patrón 2: data?.users (con optional chaining)
    if (/\bdata\?\.users\b/.test(transformed)) {
      const before = transformed;
      transformed = transformed.replace(/\bdata\?\.users\b/g, 'data?.teamMembers');
      if (before !== transformed) {
        hasChange = true;
      }
    }
    
    if (hasChange) {
      changes.push({
        line: index + 1,
        before: line,
        after: transformed,
      });
      modified = true;
    }
    
    return transformed;
  });
  
  return {
    filePath,
    changes,
    modified,
  };
}

/**
 * Procesa un archivo
 */
function processFile(filePath: string, options: CodemodOptions): TransformResult {
  const content = fs.readFileSync(filePath, 'utf8');
  const result = transformFile(content, filePath);
  
  if (result.modified && !options.dryRun) {
    // Crear backup si está habilitado
    if (options.createBackup) {
      fs.writeFileSync(`${filePath}.bak`, content, 'utf8');
    }
    
    // Aplicar cambios
    const newContent = content.split('\n').map((line, index) => {
      const change = result.changes.find(c => c.line === index + 1);
      return change ? change.after : line;
    }).join('\n');
    
    fs.writeFileSync(filePath, newContent, 'utf8');
  }
  
  return result;
}

/**
 * Genera reporte en Markdown
 */
function generateReport(results: TransformResult[], options: CodemodOptions): string {
  const modifiedFiles = results.filter(r => r.modified);
  const totalChanges = modifiedFiles.reduce((sum, r) => sum + r.changes.length, 0);
  
  let report = `# Codemod Report: data.users → data.teamMembers\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  report += `## Summary\n\n`;
  report += `- **Files scanned:** ${results.length}\n`;
  report += `- **Files modified:** ${modifiedFiles.length}\n`;
  report += `- **Total replacements:** ${totalChanges}\n`;
  report += `- **Mode:** ${options.dryRun ? 'DRY RUN (no changes applied)' : 'CHANGES APPLIED'}\n`;
  report += `- **Backup created:** ${options.createBackup && !options.dryRun ? 'Yes (.bak files)' : 'No'}\n\n`;
  
  if (modifiedFiles.length > 0) {
    report += `## Changes by File\n\n`;
    
    for (const result of modifiedFiles) {
      const relativePath = path.relative(path.join(__dirname, '..'), result.filePath);
      report += `### ${relativePath} (${result.changes.length} change${result.changes.length > 1 ? 's' : ''})\n\n`;
      
      for (const change of result.changes) {
        report += `**Line ${change.line}:**\n`;
        report += `\`\`\`diff\n`;
        report += `- ${change.before}\n`;
        report += `+ ${change.after}\n`;
        report += `\`\`\`\n\n`;
      }
    }
  } else {
    report += `## No Changes\n\nNo occurrences of \`data.users\` found in scanned files.\n\n`;
  }
  
  report += `## Next Steps\n\n`;
  
  if (options.dryRun) {
    report += `1. Review the changes above\n`;
    report += `2. Run without \`--dry-run\` to apply changes:\n`;
    report += `   \`\`\`bash\n`;
    report += `   npx tsx scripts/codemod-users-to-teamMembers.ts\n`;
    report += `   \`\`\`\n`;
  } else {
    report += `1. ✅ Verify compilation: \`npx tsc --noEmit\`\n`;
    report += `2. ✅ Review changes: \`git diff src/\`\n`;
    report += `3. ✅ Test the application: \`npm run dev\`\n`;
    report += `4. ✅ Commit changes if all looks good\n\n`;
    
    if (options.createBackup) {
      report += `**Note:** Backup files (.bak) were created. Remove them after verification:\n`;
      report += `\`\`\`bash\n`;
      report += `find src -name "*.bak" -delete\n`;
      report += `\`\`\`\n`;
    }
  }
  
  return report;
}

/**
 * Main
 */
async function main() {
  const srcDir = path.join(__dirname, '..', 'src');
  
  console.log(`📂 Scanning files in: ${srcDir}\n`);
  
  const files = findSourceFiles(srcDir);
  console.log(`📄 Found ${files.length} TypeScript files\n`);
  
  const results: TransformResult[] = [];
  let processedCount = 0;
  
  for (const file of files) {
    processedCount++;
    const result = processFile(file, options);
    results.push(result);
    
    if (options.verbose || result.modified) {
      const status = result.modified ? '✏️ ' : '  ';
      const relativePath = path.relative(srcDir, file);
      const changeInfo = result.modified ? ` (${result.changes.length} change${result.changes.length > 1 ? 's' : ''})` : '';
      console.log(`${status} ${relativePath}${changeInfo}`);
    }
    
    // Progress indicator
    if (!options.verbose && processedCount % 10 === 0) {
      process.stdout.write(`\r⏳ Processing... ${processedCount}/${files.length}`);
    }
  }
  
  if (!options.verbose) {
    console.log(`\n`);
  }
  
  // Generate report
  const reportPath = path.join(__dirname, '..', 'CODEMOD_REPORT.md');
  const report = generateReport(results, options);
  fs.writeFileSync(reportPath, report, 'utf8');
  
  // Summary
  const modifiedFiles = results.filter(r => r.modified);
  const totalChanges = modifiedFiles.reduce((sum, r) => sum + r.changes.length, 0);
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 SUMMARY`);
  console.log(`${'='.repeat(50)}`);
  console.log(`✅ Files scanned:   ${results.length}`);
  console.log(`✏️  Files modified:  ${modifiedFiles.length}`);
  console.log(`🔄 Total changes:   ${totalChanges}`);
  console.log(`📝 Report saved:    ${reportPath}`);
  
  if (options.dryRun && totalChanges > 0) {
    console.log(`\n💡 This was a dry run. Run without --dry-run to apply changes.`);
  } else if (totalChanges > 0) {
    console.log(`\n✅ Changes applied successfully!`);
    console.log(`\n📋 Next steps:`);
    console.log(`   1. Verify: npx tsc --noEmit`);
    console.log(`   2. Review: git diff src/`);
    console.log(`   3. Test:   npm run dev`);
  } else {
    console.log(`\n✨ No changes needed - all references already use teamMembers!`);
  }
  
  console.log('');
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
