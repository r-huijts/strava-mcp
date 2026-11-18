import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { formatStravaId, resolveStravaId, stravaIdSchema } from "../src/ids.js";
import { getActivityById, getAllActivities, getAthleteStats, stravaApi } from "../src/stravaClient.js";
import { getActivityDetailsTool } from "../src/tools/getActivityDetails.js";
import { getAllActivities as getAllActivitiesTool } from "../src/tools/getAllActivities.js";
import { getAthleteProfile } from "../src/tools/getAthleteProfile.js";
import { getRecentActivities as getRecentActivitiesTool } from "../src/tools/getRecentActivities.js";

// The largest signed 64-bit integer. JSON.parse rounds it to 9223372036854775808,
// which String() renders as "9223372036854776000".
const BIG_ID = "9223372036854775807";
const ROUNDED_BIG_ID = "9223372036854776000";

// Parse raw JSON text the way axios does, so numeric IDs are rounded exactly as in production.
const parseLikeAxios = (rawJson: string) => JSON.parse(rawJson);

const summaryActivityJson = (id: string, withIdStr: boolean) => `{
    "id": ${id},
    ${withIdStr ? `"id_str": "${id}",` : ""}
    "name": "Morning Run",
    "distance": 5000,
    "start_date": "2027-06-02T06:00:00Z",
    "type": "Run",
    "sport_type": "Run",
    "moving_time": 1500
}`;

const detailedActivityJson = (id: string) => `{
    "id": ${id},
    "id_str": "${id}",
    "resource_state": 3,
    "athlete": { "id": ${id}, "id_str": "${id}", "resource_state": 1 },
    "name": "Morning Run",
    "distance": 5000,
    "moving_time": 1500,
    "elapsed_time": 1600,
    "total_elevation_gain": 20,
    "type": "Run",
    "sport_type": "Run",
    "start_date": "2027-06-02T06:00:00Z",
    "start_date_local": "2027-06-02T08:00:00Z",
    "timezone": "(GMT+02:00) Africa/Johannesburg",
    "start_latlng": null,
    "end_latlng": null,
    "kudos_count": 0,
    "comment_count": 0,
    "photo_count": 0,
    "map": null,
    "trainer": false,
    "commute": false,
    "manual": false,
    "private": false,
    "flagged": false,
    "gear_id": null,
    "has_heartrate": false,
    "description": null
}`;

const athleteJson = (id: string) => `{
    "id": ${id},
    "id_str": "${id}",
    "resource_state": 3,
    "username": "test",
    "firstname": "Test",
    "lastname": "User",
    "city": null,
    "state": null,
    "country": null,
    "sex": null,
    "premium": false,
    "summit": false,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-02T00:00:00Z",
    "profile_medium": "https://example.com/medium.jpg",
    "profile": "https://example.com/profile.jpg",
    "weight": null,
    "measurement_preference": "meters"
}`;

describe("stravaIdSchema", () => {
    const schema = stravaIdSchema("An ID.");

    it("accepts a digit string and keeps it exact", () => {
        expect(schema.parse(BIG_ID)).toBe(BIG_ID);
    });

    it("accepts a safe number and converts it to a string", () => {
        expect(schema.parse(1234567890)).toBe("1234567890");
        expect(schema.parse(Number.MAX_SAFE_INTEGER)).toBe("9007199254740991");
    });

    it("rejects a number beyond the safe integer range instead of using a rounded ID", () => {
        const result = schema.safeParse(parseLikeAxios(BIG_ID));

        expect(result.success).toBe(false);
        expect(JSON.stringify(result.error?.issues)).toContain("Pass it as a string");
    });

    it("rejects values that are not positive integers", () => {
        for (const value of ["", "abc", "12.5", "-5", "0", "1e3", 0, -5, 12.5]) {
            expect(schema.safeParse(value).success, `value: ${JSON.stringify(value)}`).toBe(false);
        }
    });
});

describe("resolveStravaId / formatStravaId", () => {
    it("prefers id_str over a rounded numeric id", () => {
        const activity = parseLikeAxios(summaryActivityJson(BIG_ID, true));

        expect(String(activity.id)).toBe(ROUNDED_BIG_ID);
        expect(resolveStravaId(activity)).toEqual({ id: BIG_ID, exact: true });
        expect(formatStravaId(activity)).toBe(BIG_ID);
    });

    it("falls back to a safe numeric id when id_str is absent", () => {
        expect(resolveStravaId({ id: 1234567890 })).toEqual({ id: "1234567890", exact: true });
        expect(formatStravaId({ id: 1234567890 })).toBe("1234567890");
    });

    it("flags a rounded numeric id when id_str is absent", () => {
        const activity = parseLikeAxios(summaryActivityJson(BIG_ID, false));

        expect(resolveStravaId(activity)).toEqual({ id: ROUNDED_BIG_ID, exact: false });
        expect(formatStravaId(activity)).toContain("approximate");
    });

    it("returns the fallback when there is no id", () => {
        expect(resolveStravaId(undefined)).toBeUndefined();
        expect(resolveStravaId({})).toBeUndefined();
        expect(formatStravaId({ id: null })).toBe("N/A");
    });
});

describe("64-bit IDs end to end", () => {
    let previousToken: string | undefined;

    beforeEach(() => {
        previousToken = process.env.STRAVA_ACCESS_TOKEN;
        process.env.STRAVA_ACCESS_TOKEN = "test-token";
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        process.env.STRAVA_ACCESS_TOKEN = previousToken;
        vi.restoreAllMocks();
    });

    it("requests an activity by its exact string ID", async () => {
        const get = vi.spyOn(stravaApi, "get").mockResolvedValue({
            data: parseLikeAxios(detailedActivityJson(BIG_ID)),
        } as any);

        const activity = await getActivityById("fake-token", BIG_ID);

        expect(get.mock.calls[0]?.[0]).toBe(`activities/${BIG_ID}`);
        expect(activity.id_str).toBe(BIG_ID);
        expect(activity.athlete.id_str).toBe(BIG_ID);
    });

    it("requests athlete stats by the exact string ID", async () => {
        const totals = { count: 0, distance: 0, moving_time: 0, elapsed_time: 0, elevation_gain: 0 };
        const get = vi.spyOn(stravaApi, "get").mockResolvedValue({
            data: {
                recent_ride_totals: totals, recent_run_totals: totals, recent_swim_totals: totals,
                ytd_ride_totals: totals, ytd_run_totals: totals, ytd_swim_totals: totals,
                all_ride_totals: totals, all_run_totals: totals, all_swim_totals: totals,
            },
        } as any);

        await getAthleteStats("fake-token", BIG_ID);

        expect(get.mock.calls[0]?.[0]).toBe(`athletes/${BIG_ID}/stats`);
    });

    it("keeps id_str when listing activities", async () => {
        vi.spyOn(stravaApi, "get").mockResolvedValue({
            data: parseLikeAxios(`[${summaryActivityJson(BIG_ID, true)}]`),
        } as any);

        const activities = await getAllActivities("fake-token", { perPage: 200, page: 1 });

        expect(activities[0].id_str).toBe(BIG_ID);
    });

    it("get-activity-details accepts a string ID and prints the exact ID", async () => {
        const get = vi.spyOn(stravaApi, "get").mockResolvedValue({
            data: parseLikeAxios(detailedActivityJson(BIG_ID)),
        } as any);

        const input = getActivityDetailsTool.inputSchema.parse({ activityId: BIG_ID });
        const result = await getActivityDetailsTool.execute(input);

        expect(get.mock.calls[0]?.[0]).toBe(`activities/${BIG_ID}`);
        expect(result.content[0]?.text).toContain(`(ID: ${BIG_ID})`);
        expect(result.content[0]?.text).not.toContain(ROUNDED_BIG_ID);
    });

    it("get-activity-details still accepts a numeric ID", () => {
        expect(getActivityDetailsTool.inputSchema.parse({ activityId: 1234567890 })).toEqual({ activityId: "1234567890" });
    });

    it("get-all-activities prints the exact ID and links to it", async () => {
        vi.spyOn(stravaApi, "get").mockResolvedValue({
            data: parseLikeAxios(`[${summaryActivityJson(BIG_ID, true)}]`),
        } as any);

        const result = await getAllActivitiesTool.execute({ maxActivities: 500, maxApiCalls: 1, perPage: 200 });
        const text = result.content[0]?.text ?? "";

        expect(text).toContain(`(ID: ${BIG_ID})`);
        expect(text).toContain(`https://www.strava.com/activities/${BIG_ID}`);
        expect(text).not.toContain(ROUNDED_BIG_ID);
    });

    it("get-all-activities does not link a rounded ID", async () => {
        vi.spyOn(stravaApi, "get").mockResolvedValue({
            data: parseLikeAxios(`[${summaryActivityJson(BIG_ID, false)}]`),
        } as any);

        const result = await getAllActivitiesTool.execute({ maxActivities: 500, maxApiCalls: 1, perPage: 200 });
        const text = result.content[0]?.text ?? "";

        expect(text).toContain("approximate");
        expect(text).not.toContain("https://www.strava.com/activities/");
    });

    it("get-recent-activities and get-athlete-profile print exact IDs", async () => {
        vi.spyOn(stravaApi, "get").mockImplementation(async (url: string) => {
            if (url === "athlete") return { data: parseLikeAxios(athleteJson(BIG_ID)) } as any;
            return { data: parseLikeAxios(`[${summaryActivityJson(BIG_ID, true)}]`) } as any;
        });

        const recent = await getRecentActivitiesTool.execute({ perPage: 30 });
        const profile = await getAthleteProfile.execute();

        expect(recent.content[0]?.text).toContain(`(ID: ${BIG_ID})`);
        expect(profile.content[0]?.text).toContain(`(ID: ${BIG_ID})`);
    });
});
