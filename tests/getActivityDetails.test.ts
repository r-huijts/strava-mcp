import { beforeEach, describe, expect, it, vi } from "vitest";
import { getActivityDetailsTool } from "../src/tools/getActivityDetails.js";
import { getActivityById } from "../src/stravaClient.js";

vi.mock("../src/stravaClient.js", () => ({
    getActivityById: vi.fn(),
}));

vi.mock("../src/formatters.js", () => ({
    formatLocalDateTime: vi.fn().mockReturnValue("01/15/2024, 08:30"),
}));

const mockActivity = {
    id: 12345,
    resource_state: 3,
    athlete: { id: 67890, resource_state: 1 },
    name: "Morning Run",
    type: "Run",
    sport_type: "Run",
    start_date: "2024-01-15T13:30:00Z",
    start_date_local: "2024-01-15T08:30:00Z",
    timezone: "America/New_York",
    start_latlng: [42.3601, -71.0589],
    end_latlng: [42.3601, -71.0589],
    distance: 10000,
    moving_time: 3600,
    elapsed_time: 3700,
    total_elevation_gain: 50,
    average_speed: 2.78,
    max_speed: 4.5,
    kudos_count: 10,
    comment_count: 2,
    photo_count: 0,
    map: { id: "a12345", resource_state: 1 },
    trainer: false,
    commute: false,
    manual: false,
    private: false,
    flagged: false,
    gear_id: null,
    has_heartrate: false,
    description: null,
    gear: null,
};

describe("get-activity-details tool", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete process.env.STRAVA_ACCESS_TOKEN;
    });

    it("returns config error when token is missing", async () => {
        const result = await getActivityDetailsTool.execute({ activityId: 12345 });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("access token");
    });

    it("returns formatted activity details on successful fetch", async () => {
        process.env.STRAVA_ACCESS_TOKEN = "test-token";
        vi.mocked(getActivityById).mockResolvedValue(mockActivity as any);

        const result = await getActivityDetailsTool.execute({ activityId: 12345 });

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain("Morning Run");
        expect(result.content[0].text).toContain("Run");
        expect(result.content[0].text).toContain("10.00 km");
    });

    it("returns not found error when activity 404 (Record Not Found)", async () => {
        process.env.STRAVA_ACCESS_TOKEN = "test-token";
        vi.mocked(getActivityById).mockRejectedValue(new Error("Record Not Found"));

        const result = await getActivityDetailsTool.execute({ activityId: 99999 });

        expect(result.isError).toBe(true);
        expect(result.content[0].text.toLowerCase()).toContain("not found");
    });

    it("returns generic error on unexpected API failure", async () => {
        process.env.STRAVA_ACCESS_TOKEN = "test-token";
        vi.mocked(getActivityById).mockRejectedValue(new Error("Internal Server Error"));

        const result = await getActivityDetailsTool.execute({ activityId: 12345 });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Internal Server Error");
    });
});
