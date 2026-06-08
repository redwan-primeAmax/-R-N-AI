
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  performanceHint?: string;
}

export class ExtensionValidator {
  /**
   * Validates an extension project structure and code
   * This is a purely algorithmic check, no AI involved.
   */
  static validate(files: Record<string, string>, manifest: any): ValidationResult {
    const issues: ValidationIssue[] = [];

    // 1. Basic Manifest Validation
    if (!manifest) {
      issues.push({ type: 'error', message: 'manifest.json is missing or invalid' });
    } else {
      if (!manifest.id) issues.push({ type: 'error', message: 'Manifest missing "id"' });
      if (!manifest.name) issues.push({ type: 'error', message: 'Manifest missing "name"' });
      if (!manifest.version) issues.push({ type: 'error', message: 'Manifest missing "version"' });
      if (!manifest.type) issues.push({ type: 'warning', message: 'Manifest missing "type" (defaults to widget)' });
    }

    // 2. Entry point validation
    const indexFile = files['index.js'];
    if (!indexFile) {
      issues.push({ type: 'error', message: 'index.js (entry point) is missing' });
    } else {
      // Basic Syntax Check using Function constructor (does not execute code if we don't call it)
      try {
        // Strip exports just for validation check since Function doesn't like them
        const checkableCode = indexFile.replace(/export\s+/g, '');
        new Function(checkableCode);
      } catch (e: any) {
        issues.push({ 
          type: 'error', 
          message: `Syntax error in index.js: ${e.message}`,
          line: this.extractLineNumber(e)
        });
      }

      // Pattern matching for security/best practices
      this.checkPatterns(indexFile, issues);
    }

    // 3. Permissions cross-check
    if (manifest?.permissions) {
      const perms = manifest.permissions;
      if (perms.includes('ai') && !indexFile?.includes('api.ai')) {
        issues.push({ type: 'info', message: 'Extension has "ai" permission but doesn\'t seem to use api.ai' });
      }
    }

    return {
      isValid: !issues.some(i => i.type === 'error'),
      issues
    };
  }

  private static checkPatterns(code: string, issues: ValidationIssue[]) {
    // Check for direct DOM manipulation (discouraged, use api.ui if possible)
    if (code.includes('document.getElementById') || code.includes('document.querySelector')) {
      issues.push({ 
        type: 'warning', 
        message: 'Direct DOM manipulation detected. Use api.ui methods for better compatibility and safety.' 
      });
    }

    // Check for potential infinite loops (very basic check)
    if (code.match(/while\s*\(\s*true\s*\)\s*\{[^\}]*break/)) {
      // Seems okay because of break
    } else if (code.match(/while\s*\(\s*true\s*\)/)) {
        issues.push({ type: 'warning', message: 'Potential infinite while(true) loop detected.' });
    }

    // Check for restricted globals
    if (code.includes('window.open')) {
      issues.push({ type: 'warning', message: 'window.open() might be blocked in some environments (iframes).' });
    }

    if (code.includes('eval(')) {
      issues.push({ type: 'error', message: 'Use of eval() is strictly forbidden for security reasons.' });
    }

    // Performance hints
    if (code.length > 500000) {
      issues.push({ type: 'warning', message: 'Script is very large (>500KB), which may cause performance issues during load.' });
    }
  }

  private static extractLineNumber(error: any): number | undefined {
    // Very simple line number extraction from error message if available
    const match = error.message.match(/line (\d+)/i) || (error.stack && error.stack.match(/:(\d+):\d+/));
    return match ? parseInt(match[1]) : undefined;
  }
}
