import { describe, expect, it } from "vitest";
import {
    formatLocalDate,
    formatLocalDateTime,
    formatRouteSummary,
} from "../src/formatters.js";

// ---------------------------------------------------------------------------
// formatLocalDateTime
// ---------------------------------------------------------------------------
describe("formatLocalDateTime", () => {
    it("formats a standard ISO datetime string", () => {
        expect(formatLocalDateTime("2026-03-22T13:48:39")).toBe("03/22/2026, 13:48");
    });

    it("formats midnight correctly", () => {
        expect(formatLocalDateTime("2024-01-01T00:00:00")).toBe("01/01/2024, 00:00");
    });

    it("returns the original string when format is invalid", () => {
        expect(formatLocalDateTime("not-a-date")).toBe("not-a-date");
    });

    it("returns the original string when only a date is provided (no time)", () => {
        // No T separator — regex won't match
        expect(formatLocalDateTime("2026-03-22")).toBe("2026-03-22");
    });

    it("handles end-of-year datetime", () => {
        expect(formatLocalDateTime("2025-12-31T23:59:00")).toBe("12/31/2025, 23:59");
    });

    it("ignores seconds — only captures hours and minutes", () => {
        expect(formatLocalDateTime("2026-06-15T09:05:59")).toBe("06/15/2026, 09:05");
    });
});

// ---------------------------------------------------------------------------
// formatLocalDate
// ---------------------------------------------------------------------------
describe("formatLocalDate", () => {
    it("formats a standard ISO date string", () => {
        expect(formatLocalDate("2026-03-22")).toBe("03/22/2026");
    });

    it("formats a datetime string, stripping the time portion", () => {
        expect(formatLocalDate("2026-03-22T13:48:39")).toBe("03/22/2026");
    });

    it("returns the original string when format is invalid", () => {
        expect(formatLocalDate("invalid")).toBe("invalid");
    });

    it("handles single-digit months and days with zero-padding", () => {
        expect(formatLocalDate("2024-01-05")).toBe("01/05/2024");
    });

    it("handles end-of-year date", () => {
        expect(formatLocalDate("2025-12-31")).toBe("12/31/2025");
    });
});

// ---------------------------------------------------------------------------
// formatRouteSummary
// ---------------------------------------------------------------------------
describe("formatRouteSummary", () => {
    const baseRoute = {
        id: 42,
        name: "Morning Loop",
        distance: 25000,          // 25 km
        elevation_gain: 350.6,
        created_at: "2026-01-10T08:30:00",
        type: 1,                  // Ride
        segments: [{ id: 1 }, { id: 2 }],
        description: null,
    } as any;

    it("includes the route name and id", () => {
        const result = formatRouteSummary(baseRoute);
        expect(result).toContain("Morning Loop");
        expect(result).toContain("#42");
    });

    it("formats distance in km", () => {
        const result = formatRouteSummary(baseRoute);
        expect(result).toContain("25.00 km");
    });

    it("formats elevation gain in meters (rounded)", () => {
        const result = formatRouteSummary(baseRoute);
        expect(result).toContain("351 m");
    });

    it("maps type=1 to 'Ride'", () => {
        const result = formatRouteSummary({ ...baseRoute, type: 1 });
        expect(result).toContain("Ride");
    });

    it("maps type=2 to 'Run'", () => {
        const result = formatRouteSummary({ ...baseRoute, type: 2 });
        expect(result).toContain("Run");
    });

    it("maps type=3 to 'Walk'", () => {
        const result = formatRouteSummary({ ...baseRoute, type: 3 });
        expect(result).toContain("Walk");
    });

    it("maps unknown type to 'Walk'", () => {
        const result = formatRouteSummary({ ...baseRoute, type: 99 });
        expect(result).toContain("Walk");
    });

    it("includes segment count", () => {
        const result = formatRouteSummary(baseRoute);
        expect(result).toContain("Segments: 2");
    });

    it("shows N/A when segments is undefined", () => {
        const result = formatRouteSummary({ ...baseRoute, segments: undefined });
        expect(result).toContain("Segments: N/A");
    });

    it("includes formatted created date", () => {
        const result = formatRouteSummary(baseRoute);
        expect(result).toContain("01/10/2026");
    });

    it("does not include a description line when description is absent", () => {
        const result = formatRouteSummary({ ...baseRoute, description: null });
        expect(result).not.toContain("Description:");
    });

    it("includes description when present and short", () => {
        const route = { ...baseRoute, description: "A nice easy loop." };
        const result = formatRouteSummary(route);
        expect(result).toContain("Description: A nice easy loop.");
    });

    it("truncates description longer than 100 characters and appends '...'", () => {
        const longDesc = "A".repeat(101);
        const result = formatRouteSummary({ ...baseRoute, description: longDesc });
        expect(result).toContain("...");
        // The truncated portion should be exactly 100 A's
        expect(result).toContain("A".repeat(100));
    });

    it("does not append '...' when description is exactly 100 characters", () => {
        const exactDesc = "B".repeat(100);
        const result = formatRouteSummary({ ...baseRoute, description: exactDesc });
        expect(result).not.toContain("...");
    });
});
