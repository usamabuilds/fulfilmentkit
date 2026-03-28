import { z } from 'zod';
import type { ReportFilterDefinitionMap } from './orders-reports.service';

export function createReportFiltersSchema(
  definitions: ReportFilterDefinitionMap,
): z.ZodType<Record<string, unknown>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  Object.entries(definitions).forEach(([fieldKey, fieldDefinition]) => {
    if (fieldDefinition.type === 'date-range') {
      shape[fieldKey] = z.enum(fieldDefinition.presets as [string, ...string[]]);
      return;
    }

    if (fieldDefinition.type === 'select') {
      const allowedValues = fieldDefinition.options.map((option) => option.value);
      const enumSchema = z.enum(allowedValues as [string, ...string[]]);
      const arraySchema = z
        .array(z.string().transform((value) => value.toLowerCase()).pipe(enumSchema))
        .min(1);
      shape[fieldKey] = fieldKey === 'platform'
        ? z.union([
          z.string().transform((value) => value.toLowerCase()).pipe(enumSchema),
          arraySchema,
        ]).transform((value) => {
          if (Array.isArray(value)) {
            return value;
          }
          return value;
        })
        : enumSchema;
      return;
    }

    if (fieldDefinition.type === 'multi-select') {
      const allowedValues = fieldDefinition.options.map((option) => option.value);
      const enumSchema = z.enum(allowedValues as [string, ...string[]]);
      const baseSchema = z.array(enumSchema).min(1);
      const multiSchema = fieldDefinition.maxSelections ? baseSchema.max(fieldDefinition.maxSelections) : baseSchema;
      const normalizedArraySchema = fieldDefinition.maxSelections
        ? z
          .array(z.string().transform((value) => value.toLowerCase()).pipe(enumSchema))
          .min(1)
          .max(fieldDefinition.maxSelections)
        : z.array(z.string().transform((value) => value.toLowerCase()).pipe(enumSchema)).min(1);
      shape[fieldKey] = fieldKey === 'platform'
        ? z.union([
          z.string().transform((value) => value.toLowerCase()).pipe(enumSchema),
          normalizedArraySchema,
        ]).transform((value) => {
          if (Array.isArray(value)) {
            return value;
          }
          return value;
        })
        : multiSchema;
      return;
    }

    if (fieldDefinition.type === 'number') {
      let schema = z.number();
      if (typeof fieldDefinition.min === 'number') {
        schema = schema.min(fieldDefinition.min);
      }
      if (typeof fieldDefinition.max === 'number') {
        schema = schema.max(fieldDefinition.max);
      }
      shape[fieldKey] = schema;
      return;
    }

    let textSchema = z.string();
    if (typeof fieldDefinition.minLength === 'number') {
      textSchema = textSchema.min(fieldDefinition.minLength);
    }
    if (typeof fieldDefinition.maxLength === 'number') {
      textSchema = textSchema.max(fieldDefinition.maxLength);
    }
    shape[fieldKey] = textSchema;
  });

  return z.object(shape).strict().partial();
}
