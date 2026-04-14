import { describe, expect, it } from "vitest";
import { McpPositiveIntSchema, McpBooleanSchema } from "../src/mcpSchemas.js";

describe("McpPositiveIntSchema", () => {
  it("accepts a positive integer number", () => {
    expect(McpPositiveIntSchema.parse(1)).toBe(1);
    expect(McpPositiveIntSchema.parse(42)).toBe(42);
  });

  it("accepts a string representation of a positive integer", () => {
    expect(McpPositiveIntSchema.parse("1")).toBe(1);
    expect(McpPositiveIntSchema.parse("100")).toBe(100);
  });

  it("rejects zero", () => {
    expect(() => McpPositiveIntSchema.parse(0)).toThrow();
    expect(() => McpPositiveIntSchema.parse("0")).toThrow();
  });

  it("rejects negative numbers", () => {
    expect(() => McpPositiveIntSchema.parse(-1)).toThrow();
    expect(() => McpPositiveIntSchema.parse("-5")).toThrow();
  });

  it("rejects non-integer numbers", () => {
    expect(() => McpPositiveIntSchema.parse(1.5)).toThrow();
    expect(() => McpPositiveIntSchema.parse("3.14")).toThrow();
  });

  it("rejects non-numeric strings", () => {
    expect(() => McpPositiveIntSchema.parse("abc")).toThrow();
    expect(() => McpPositiveIntSchema.parse("")).toThrow();
  });
});

describe("McpBooleanSchema", () => {
  it("accepts boolean true and false", () => {
    expect(McpBooleanSchema.parse(true)).toBe(true);
    expect(McpBooleanSchema.parse(false)).toBe(false);
  });

  it('accepts string "true" and "false"', () => {
    expect(McpBooleanSchema.parse("true")).toBe(true);
    expect(McpBooleanSchema.parse("false")).toBe(false);
  });

  it("accepts case-insensitive string booleans", () => {
    expect(McpBooleanSchema.parse("True")).toBe(true);
    expect(McpBooleanSchema.parse("FALSE")).toBe(false);
    expect(McpBooleanSchema.parse("TRUE")).toBe(true);
  });

  it("rejects invalid boolean strings", () => {
    expect(() => McpBooleanSchema.parse("yes")).toThrow();
    expect(() => McpBooleanSchema.parse("no")).toThrow();
    expect(() => McpBooleanSchema.parse("1")).toThrow();
    expect(() => McpBooleanSchema.parse("")).toThrow();
  });
});
