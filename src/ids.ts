import { z } from "zod";

/**
 * Helpers for Strava identifiers.
 *
 * Strava is moving Activity and Athlete IDs to 64-bit integers (effective
 * June 1, 2027). JavaScript numbers are exact only up to
 * Number.MAX_SAFE_INTEGER (2^53 - 1), so a larger ID read from the numeric
 * `id` field is silently rounded by JSON.parse. Strava returns the same value
 * as a string in `id_str`, so IDs are carried as decimal strings here.
 */

const UNSAFE_NUMBER_MESSAGE =
    "ID is too large to be passed as a number without losing precision. " +
    "Pass it as a string, exactly as shown in tool output.";

/**
 * Zod schema for an ID supplied to a tool. Accepts a digit string (preferred)
 * or a number, and always yields a string. A number beyond the safe integer
 * range has already been rounded by the time it arrives, so it is rejected
 * rather than used to query the wrong object.
 */
export function stravaIdSchema(description: string) {
    return z
        .union([
            z.string().trim().regex(/^[1-9]\d*$/, "ID must be a positive integer."),
            z.number().int().positive().refine(Number.isSafeInteger, { message: UNSAFE_NUMBER_MESSAGE }),
        ])
        .transform(String)
        .describe(`${description} Pass as a string to preserve precision for 64-bit IDs.`);
}

interface HasStravaId {
    id?: number | string | null;
    id_str?: string | null;
}

/**
 * Resolves the ID of a Strava object, preferring `id_str`.
 * `exact` is false when only a numeric `id` beyond the safe integer range is
 * available, meaning the value has been rounded and must not be used for lookups.
 */
export function resolveStravaId(obj: HasStravaId | null | undefined): { id: string; exact: boolean } | undefined {
    if (!obj) return undefined;
    if (typeof obj.id_str === "string" && obj.id_str !== "") {
        return { id: obj.id_str, exact: true };
    }
    if (obj.id === null || obj.id === undefined) return undefined;
    const exact = typeof obj.id === "string" || Number.isSafeInteger(obj.id);
    return { id: String(obj.id), exact };
}

/** Formats the ID of a Strava object for display, flagging a rounded value. */
export function formatStravaId(obj: HasStravaId | null | undefined, fallback = "N/A"): string {
    const resolved = resolveStravaId(obj);
    if (!resolved) return fallback;
    return resolved.exact ? resolved.id : `${resolved.id} (approximate: exceeds the safe integer range and no id_str was returned)`;
}
