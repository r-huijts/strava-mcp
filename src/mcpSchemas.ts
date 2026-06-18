import { z } from 'zod';

/**
 * Zod schema for positive integers that also accepts string representations.
 * MCP clients may send numeric values as strings, so this schema coerces
 * string inputs like "42" to the number 42, then validates as a positive integer.
 *
 * Generates JSON Schema: {"anyOf": [{"type":"integer","exclusiveMinimum":0}, {"type":"string","pattern":"^\\d+$"}]}
 * This ensures strict MCP clients accept both forms.
 */
export const McpPositiveIntSchema = z
  .union([z.number().int().positive(), z.string().regex(/^\d+$/)])
  .transform((val) => (typeof val === 'string' ? Number(val) : val))
  .refine((val) => val > 0, { message: 'Must be a positive integer' });

/**
 * Zod schema for booleans that also accepts string representations.
 * MCP clients may send boolean values as strings, so this schema coerces
 * "true"/"false" strings to their boolean equivalents.
 *
 * Generates JSON Schema: {"anyOf": [{"type":"boolean"}, {"type":"string","pattern":"^(true|false)$"}]}
 * This ensures strict MCP clients only accept valid boolean strings.
 */
export const McpBooleanSchema = z
  .union([z.boolean(), z.string().regex(/^(true|false)$/i)])
  .transform((val) => {
    if (typeof val === 'boolean') return val;
    return val.toLowerCase() === 'true';
  });
