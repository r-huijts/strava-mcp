import { describe, expect, it } from "vitest";
import { formatWorkoutFile } from "../src/tools/formatWorkoutFile.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Call execute with zwo format (the only supported format) */
async function execute(workoutText: string) {
    return formatWorkoutFile.execute({ workoutText, format: "zwo" });
}

/** Extract the text content from the result */
function resultText(result: Awaited<ReturnType<typeof execute>>): string {
    return result.content[0].text;
}

// ---------------------------------------------------------------------------
// Tool metadata
// ---------------------------------------------------------------------------

describe("formatWorkoutFile tool metadata", () => {
    it("has the correct name", () => {
        expect(formatWorkoutFile.name).toBe("format-workout-file");
    });

    it("has a description", () => {
        expect(typeof formatWorkoutFile.description).toBe("string");
        expect(formatWorkoutFile.description.length).toBeGreaterThan(0);
    });

    it("has an inputSchema", () => {
        expect(formatWorkoutFile.inputSchema).toBeDefined();
    });
});

// ---------------------------------------------------------------------------
// execute — valid inputs
// ---------------------------------------------------------------------------

describe("formatWorkoutFile execute — valid workout text", () => {
    it("returns XML with SteadyState elements for a single segment", async () => {
        const text = "- Warm-up: 10 min at easy";
        const result = await execute(text);
        expect(result.isError).toBeUndefined();
        expect(resultText(result)).toContain("<SteadyState");
    });

    it("returns well-formed ZWO XML wrapper tags", async () => {
        const text = "- Warm-up: 10 min at easy";
        const xml = resultText(await execute(text));
        expect(xml).toContain("<workout_file>");
        expect(xml).toContain("</workout_file>");
        expect(xml).toContain("<workout>");
        expect(xml).toContain("</workout>");
    });

    it("generates one SteadyState element per segment", async () => {
        const text = [
            "- Warm-up: 10 min at easy",
            "- Interval: 5 min at threshold",
            "- Cool-down: 5 min at very easy",
        ].join("\n");
        const xml = resultText(await execute(text));
        const matches = xml.match(/<SteadyState/g);
        expect(matches).toHaveLength(3);
    });

    it("converts minutes to seconds in the Duration attribute", async () => {
        const text = "- Main: 20 min at easy";
        const xml = resultText(await execute(text));
        expect(xml).toContain('Duration="1200"');
    });

    it("uses seconds directly when unit is sec", async () => {
        const text = "- Sprint: 30 sec at max";
        const xml = resultText(await execute(text));
        expect(xml).toContain('Duration="30"');
    });

    it("maps an FTP percentage target to a decimal Power attribute", async () => {
        const text = "- Interval: 10 min at 75% FTP";
        const xml = resultText(await execute(text));
        expect(xml).toContain('Power="0.75"');
    });

    it("maps 'threshold' zone description to Power='1'", async () => {
        const text = "- Threshold: 8 min at threshold";
        const xml = resultText(await execute(text));
        expect(xml).toContain('Power="1"');
    });

    it("maps 'easy' to Power='0.6'", async () => {
        const text = "- Warm-up: 5 min at easy";
        const xml = resultText(await execute(text));
        expect(xml).toContain('Power="0.6"');
    });

    it("maps 'max' to Power='1.2'", async () => {
        const text = "- Sprint: 20 sec at max";
        const xml = resultText(await execute(text));
        expect(xml).toContain('Power="1.2"');
    });

    it("defaults unknown targets to Power='0.75'", async () => {
        const text = "- Mystery: 5 min at ultrafast";
        const xml = resultText(await execute(text));
        expect(xml).toContain('Power="0.75"');
    });

    it("includes Cadence attribute when cadence is specified in extras", async () => {
        const text = "- Spin: 5 min at easy [Cadence: 95]";
        const xml = resultText(await execute(text));
        expect(xml).toContain('Cadence="95"');
    });

    it("does not include Cadence attribute when no cadence is provided", async () => {
        const text = "- Interval: 5 min at easy";
        const xml = resultText(await execute(text));
        expect(xml).not.toContain("Cadence=");
    });

    it("adds ShowsPower='1' when target contains 'FTP'", async () => {
        const text = "- Effort: 10 min at 85% FTP";
        const xml = resultText(await execute(text));
        expect(xml).toContain('ShowsPower="1"');
    });

    it("does not add ShowsPower for zone descriptions (no FTP keyword)", async () => {
        const text = "- Effort: 10 min at tempo";
        const xml = resultText(await execute(text));
        expect(xml).not.toContain("ShowsPower");
    });

    it("includes notes as textEvent attribute when Notes extra is provided", async () => {
        const text = "- Interval: 5 min at hard [Notes: Push hard here]";
        const xml = resultText(await execute(text));
        expect(xml).toContain('textEvent="Push hard here"');
    });
});

// ---------------------------------------------------------------------------
// execute — empty / invalid inputs
// ---------------------------------------------------------------------------

describe("formatWorkoutFile execute — empty or invalid input", () => {
    it("returns isError=true when no valid segments are found", async () => {
        const result = await execute("This is just some plain text with no segments.");
        expect(result.isError).toBe(true);
    });

    it("error message mentions 'No valid workout segments'", async () => {
        const result = await execute("");
        expect(resultText(result)).toContain("No valid workout segments");
    });

    it("skips lines that don't start with '-'", async () => {
        const text = "Warm-up: 10 min at easy\nInterval: 5 min at threshold";
        const result = await execute(text);
        expect(result.isError).toBe(true);
    });

    it("returns isError=true for a segment with invalid duration format", async () => {
        const text = "- Interval: FAST at easy";
        const result = await execute(text);
        expect(result.isError).toBe(true);
    });

    it("error message for segment with no valid duration returns no-segments error", async () => {
        // The segment line doesn't match the outer regex, so it is silently skipped,
        // resulting in the "No valid workout segments" path rather than a throw.
        const text = "- Interval: FAST at easy";
        const result = await execute(text);
        expect(resultText(result)).toContain("No valid workout segments");
    });
});
