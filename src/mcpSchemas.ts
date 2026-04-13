import { z } from 'zod';

/**
 * Zod schema for positive integers that also accepts string representations.
 * MCP clients may send numeric values as strings, so this schema coerces
 * string inputs like "42" to the number 42, then validates as a positive integer.
 */
export const McpPositiveIntSchema = z
  .union([z.number(), z.string()])
  .transform((val) => (typeof val === 'string' ? Number(val) : val))
  .pipe(z.number().int().positive());

/**
 * Zod schema for booleans that also accepts string representations.
 * MCP clients may send boolean values as strings, so this schema coerces
 * "true"/"false" strings to their boolean equivalents.
 */
export const McpBooleanSchema = z
  .union([z.boolean(), z.string()])
  .transform((val) => {
    if (typeof val === 'boolean') return val;
    const lower = val.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
    throw new Error(`Invalid boolean string: "${val}"`);
  });
