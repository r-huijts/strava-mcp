import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRecentActivities } from "../src/tools/getRecentActivities.js";
import { getRecentActivities as fetchActivities, getAuthenticatedAthlete } from "../src/stravaClient.js";

vi.mock("../src/stravaClient.js", () => ({
    getRecentActivities: vi.fn(),
    getAuthenticatedAthlete: vi.fn(),
}));

const mockAthlete = {
    id: 1,
    resource_state: 3,
    username: "test",
    firstname: "Test",
    lastname: "User",
    city: null,
    state: null,
    country: null,
    sex: null,
    premium: false,
    summit: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
    profile_medium: "https://example.com/medium.jpg",
    profile: "https://example.com/profile.jpg",
    weight: null,
    measurement_preference: "meters",
    shoes: [],
} as any;

const mockActivity = {
    id: 123,
    name: "Test Run",
    type: "Run",
    sport_type: "Run",
    distance: 5000,
    start_date: "2024-01-15T08:30:00Z",
    moving_time: 1800,
};

describe("get-recent-activities tool", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete process.env.STRAVA_ACCESS_TOKEN;
    });

    it("returns config error when token is missing", async () => {
        const result = await getRecentActivities.execute({ perPage: 30 });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("STRAVA_ACCESS_TOKEN");
    });

    it("returns config error when token is placeholder", async () => {
        process.env.STRAVA_ACCESS_TOKEN = "YOUR_STRAVA_ACCESS_TOKEN_HERE";

        const result = await getRecentActivities.execute({ perPage: 30 });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("STRAVA_ACCESS_TOKEN");
    });

    it("returns no activities message when list is empty", async () => {
        process.env.STRAVA_ACCESS_TOKEN = "test-token";
        vi.mocked(getAuthenticatedAthlete).mockResolvedValue(mockAthlete);
        vi.mocked(fetchActivities).mockResolvedValue([]);

        const result = await getRecentActivities.execute({ perPage: 30 });

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toBe("No recent activities found.");
    });

    it("returns activities with km units for metric preference", async () => {
        process.env.STRAVA_ACCESS_TOKEN = "test-token";
        vi.mocked(getAuthenticatedAthlete).mockResolvedValue({
            ...mockAthlete,
            measurement_preference: "meters",
        });
        vi.mocked(fetchActivities).mockResolvedValue([mockActivity] as any);

        const result = await getRecentActivities.execute({ perPage: 30 });

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain("Test Run");
        expect(result.content[0].text).toContain(" km");
    });

    it("returns activities with mi units for imperial preference", async () => {
        process.env.STRAVA_ACCESS_TOKEN = "test-token";
        vi.mocked(getAuthenticatedAthlete).mockResolvedValue({
            ...mockAthlete,
            measurement_preference: "feet",
        });
        vi.mocked(fetchActivities).mockResolvedValue([mockActivity] as any);

        const result = await getRecentActivities.execute({ perPage: 30 });

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain("Test Run");
        expect(result.content[0].text).toContain(" mi");
    });

    it("returns error on API failure", async () => {
        process.env.STRAVA_ACCESS_TOKEN = "test-token";
        vi.mocked(getAuthenticatedAthlete).mockRejectedValue(new Error("Network error"));

        const result = await getRecentActivities.execute({ perPage: 30 });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Network error");
    });
});
