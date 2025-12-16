/**
 * Document Validator
 * Orchestrates validation rules and produces diagnostics
 */

import { ParsedDocument, ParseError } from '../parser/types';
import { allValidationRules, ValidationRule } from './rules';

export class DocumentValidator {
  private rules: ValidationRule[];

  constructor(rules: ValidationRule[] = allValidationRules) {
    this.rules = rules;
  }

  /**
   * Validate a parsed document and return all errors
   */
  validate(doc: ParsedDocument): ParseError[] {
    const allErrors: ParseError[] = [];

    // Add parsing errors
    allErrors.push(...doc.errors);

    // Run all validation rules
    for (const rule of this.rules) {
      try {
        const errors = rule.validate(doc);
        allErrors.push(...errors);
      } catch (error) {
        console.error(`Error running validation rule ${rule.name}:`, error);
      }
    }

    return allErrors;
  }

  /**
   * Enable or disable specific rules
   */
  setRuleEnabled(ruleName: string, enabled: boolean): void {
    if (!enabled) {
      this.rules = this.rules.filter(r => r.name !== ruleName);
    } else {
      const rule = allValidationRules.find(r => r.name === ruleName);
      if (rule && !this.rules.includes(rule)) {
        this.rules.push(rule);
      }
    }
  }

  /**
   * Get list of all available rules
   */
  getAvailableRules(): string[] {
    return allValidationRules.map(r => r.name);
  }
}
