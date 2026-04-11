import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAthleteStatsTool } from "../src/tools/getAthleteStats.js";
import { getAthleteStats } from "../src/stravaClient.js";

vi.mock("../src/stravaClient.js", () => ({
    getAthleteStats: vi.fn(),
}));

const mockActivityTotals = {
    count: 10,
    distance: 50000,
    moving_time: 18000,
    elapsed_time: 19000,
    elevation_gain: 500,
};

const mockStats = {
    biggest_ride_distance: 120000,
    biggest_climb_elevation_gain: 1800,
    recent_ride_totals: { ...mockActivityTotals },
    ytd_ride_totals: { ...mockActivityTotals, count: 50, distance: 250000 },
    all_ride_totals: { ...mockActivityTotals, count: 200, distance: 1000000 },
    recent_run_totals: { ...mockActivityTotals },
    ytd_run_totals: { ...mockActivityTotals, count: 30, distance: 150000 },
    all_run_totals: { ...mockActivityTotals, count: 120, distance: 600000 },
    recent_swim_totals: { ...mockActivityTotals },
    ytd_swim_totals: { ...mockActivityTotals, count: 5, distance: 10000 },
    all_swim_totals: { ...mockActivityTotals, count: 20, distance: 40000 },
};

describe("get-athlete-stats tool", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete process.env.STRAVA_ACCESS_TOKEN;
    });

    it("returns config error when token is missing", async () => {
        const result = await getAthleteStatsTool.execute({ athleteId: 67890 });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("access token");
    });

    it("returns formatted stats on successful fetch", async () => {
        process.env.STRAVA_ACCESS_TOKEN = "test-token";
        vi.mocked(getAthleteStats).mockResolvedValue(mockStats as any);

        const result = await getAthleteStatsTool.execute({ athleteId: 67890 });

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain("Your Strava Stats");
        expect(result.content[0].text).toContain("Rides");
        expect(result.content[0].text).toContain("Runs");
    });

    it("returns not found error when athlete 404 (Record Not Found)", async () => {
        process.env.STRAVA_ACCESS_TOKEN = "test-token";
        vi.mocked(getAthleteStats).mockRejectedValue(new Error("Record Not Found"));

        const result = await getAthleteStatsTool.execute({ athleteId: 99999 });

        expect(result.isError).toBe(true);
        expect(result.content[0].text.toLowerCase()).toContain("not found");
    });

    it("returns generic error on unexpected API failure", async () => {
        process.env.STRAVA_ACCESS_TOKEN = "test-token";
        vi.mocked(getAthleteStats).mockRejectedValue(new Error("Service Unavailable"));

        const result = await getAthleteStatsTool.execute({ athleteId: 67890 });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Service Unavailable");
    });
});
