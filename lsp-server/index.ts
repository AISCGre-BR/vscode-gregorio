/**
 * Integration Example: GABC Parser + Semantic Analyzer
 * Demonstrates how to parse and validate GABC files
 */

import { GabcParser } from './parser/gabc-parser';
import { analyzeSemantics, SemanticError } from './validation/semantic-analyzer';

/**
 * Parse and validate a GABC file
 * Returns both parse errors and semantic diagnostics
 */
export function parseAndValidate(gabcContent: string): {
  parseErrors: any[];
  semanticDiagnostics: SemanticError[];
  hasErrors: boolean;
  hasWarnings: boolean;
} {
  // Step 1: Parse the GABC content
  const parser = new GabcParser(gabcContent);
  const document = parser.parse();

  // Step 2: Run semantic analysis
  const semanticDiagnostics = analyzeSemantics(document);

  // Step 3: Combine results
  const parseErrors = document.errors;
  const allErrors = [
    ...parseErrors,
    ...semanticDiagnostics.filter(d => d.severity === 'error')
  ];
  const allWarnings = semanticDiagnostics.filter(d => d.severity === 'warning');

  return {
    parseErrors,
    semanticDiagnostics,
    hasErrors: allErrors.length > 0,
    hasWarnings: allWarnings.length > 0
  };
}

/**
 * Format diagnostics for display
 */
export function formatDiagnostics(diagnostics: SemanticError[]): string {
  if (diagnostics.length === 0) {
    return 'No issues found.';
  }

  const lines: string[] = [];
  
  // Group by severity
  const errors = diagnostics.filter(d => d.severity === 'error');
  const warnings = diagnostics.filter(d => d.severity === 'warning');
  const info = diagnostics.filter(d => d.severity === 'info');

  if (errors.length > 0) {
    lines.push('=== ERRORS ===');
    errors.forEach((err, i) => {
      lines.push(`${i + 1}. [${err.code}] ${err.message}`);
      if (err.range) {
        lines.push(`   at line ${err.range.start.line + 1}, column ${err.range.start.character + 1}`);
      }
    });
    lines.push('');
  }

  if (warnings.length > 0) {
    lines.push('=== WARNINGS ===');
    warnings.forEach((warn, i) => {
      lines.push(`${i + 1}. [${warn.code}] ${warn.message}`);
      if (warn.range) {
        lines.push(`   at line ${warn.range.start.line + 1}, column ${warn.range.start.character + 1}`);
      }
    });
    lines.push('');
  }

  if (info.length > 0) {
    lines.push('=== HINTS ===');
    info.forEach((hint, i) => {
      lines.push(`${i + 1}. [${hint.code}] ${hint.message}`);
      if (hint.range) {
        lines.push(`   at line ${hint.range.start.line + 1}, column ${hint.range.start.character + 1}`);
      }
    });
  }

  return lines.join('\n');
}

// Example usage
if (require.main === module) {
  const exampleGabc = `mode: 6;
%%
(c4) AL(f|vi)le(gwg)lú(h!iwj)ia.(j)`;

  console.log('Parsing and validating GABC...\n');
  const result = parseAndValidate(exampleGabc);

  console.log(formatDiagnostics(result.semanticDiagnostics));
  console.log(`\nSummary: ${result.hasErrors ? 'Has errors' : 'No errors'}, ${result.hasWarnings ? 'Has warnings' : 'No warnings'}`);
}
