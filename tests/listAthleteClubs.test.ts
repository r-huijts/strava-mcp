import { beforeEach, describe, expect, it, vi } from "vitest";
import { listAthleteClubs } from "../src/tools/listAthleteClubs.js";
import { listAthleteClubs as fetchClubs } from "../src/stravaClient.js";

vi.mock("../src/stravaClient.js", () => ({
    listAthleteClubs: vi.fn(),
}));

const mockClub = {
    id: 1,
    name: "Test Club",
    sport_type: "cycling",
    member_count: 150,
    city: "Ithaca",
    state: "NY",
    country: "USA",
    private: false,
    url: "test-club",
};

describe("list-athlete-clubs tool", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete process.env.STRAVA_ACCESS_TOKEN;
    });

    it("returns config error when token is missing", async () => {
        const result = await listAthleteClubs.execute();

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("STRAVA_ACCESS_TOKEN");
    });

    it("returns config error when token is placeholder", async () => {
        process.env.STRAVA_ACCESS_TOKEN = "YOUR_STRAVA_ACCESS_TOKEN_HERE";

        const result = await listAthleteClubs.execute();

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("STRAVA_ACCESS_TOKEN");
    });

    it("returns no clubs message when list is empty", async () => {
        process.env.STRAVA_ACCESS_TOKEN = "test-token";
        vi.mocked(fetchClubs).mockResolvedValue([]);

        const result = await listAthleteClubs.execute();

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toBe("No clubs found for the athlete.");
    });

    it("returns club details when clubs exist", async () => {
        process.env.STRAVA_ACCESS_TOKEN = "test-token";
        vi.mocked(fetchClubs).mockResolvedValue([mockClub] as any);

        const result = await listAthleteClubs.execute();

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain("Test Club");
        expect(result.content[0].text).toContain("cycling");
        expect(result.content[0].text).toContain("150");
    });

    it("returns error on API failure", async () => {
        process.env.STRAVA_ACCESS_TOKEN = "test-token";
        vi.mocked(fetchClubs).mockRejectedValue(new Error("API unavailable"));

        const result = await listAthleteClubs.execute();

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("API unavailable");
    });
});
