"use strict";
/**
 * Document Validator
 * Orchestrates validation rules and produces diagnostics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentValidator = void 0;
const rules_1 = require("./rules");
class DocumentValidator {
    rules;
    constructor(rules = rules_1.allValidationRules) {
        this.rules = rules;
    }
    /**
     * Validate a parsed document and return all errors
     */
    validate(doc) {
        const allErrors = [];
        // Add parsing errors
        allErrors.push(...doc.errors);
        // Run all validation rules
        for (const rule of this.rules) {
            try {
                const errors = rule.validate(doc);
                allErrors.push(...errors);
            }
            catch (error) {
                console.error(`Error running validation rule ${rule.name}:`, error);
            }
        }
        return allErrors;
    }
    /**
     * Enable or disable specific rules
     */
    setRuleEnabled(ruleName, enabled) {
        if (!enabled) {
            this.rules = this.rules.filter(r => r.name !== ruleName);
        }
        else {
            const rule = rules_1.allValidationRules.find(r => r.name === ruleName);
            if (rule && !this.rules.includes(rule)) {
                this.rules.push(rule);
            }
        }
    }
    /**
     * Get list of all available rules
     */
    getAvailableRules() {
        return rules_1.allValidationRules.map(r => r.name);
    }
}
exports.DocumentValidator = DocumentValidator;
//# sourceMappingURL=validator.js.map