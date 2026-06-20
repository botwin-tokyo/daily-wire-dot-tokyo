/**
 * Structured validation report used by the publishing agent.
 */
import {
  validateNewspaperEdition,
  validateBusinessRules,
  type NewspaperEdition,
} from "../../src/lib/schema";

export interface ValidationReport {
  ok: boolean;
  editionId?: string;
  editionDate?: string;
  editionNumber?: number;
  errors: string[];
}

export function validateEdition(value: unknown): ValidationReport {
  const errors: string[] = [];

  const schemaResult = validateNewspaperEdition(value);
  if (!schemaResult.success) {
    errors.push(...schemaResult.errors);
    return { ok: false, errors };
  }

  const businessResult = validateBusinessRules(schemaResult.data);
  if (!businessResult.ok) {
    errors.push(...businessResult.errors);
  }

  return {
    ok: errors.length === 0,
    editionId: schemaResult.data.editionId,
    editionDate: schemaResult.data.editionDate,
    editionNumber: schemaResult.data.editionNumber,
    errors,
  };
}

export function formatReport(report: ValidationReport): string {
  if (report.ok) {
    return `✅ Valid edition\n   editionId:    ${report.editionId}\n   editionDate:  ${report.editionDate}\n   editionNumber: ${report.editionNumber}`;
  }
  return `❌ Validation failed:\n${report.errors.map((e) => `  - ${e}`).join("\n")}`;
}
