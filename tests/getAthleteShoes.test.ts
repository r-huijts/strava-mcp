import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAthleteShoesTool } from "../src/tools/getAthleteShoes.js";
import { getAuthenticatedAthlete } from "../src/stravaClient.js";

vi.mock("../src/stravaClient.js", () => ({
    getAuthenticatedAthlete: vi.fn(),
}));

describe("get-athlete-shoes tool", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns config error when token is missing", async () => {
        delete process.env.STRAVA_ACCESS_TOKEN;

        const result = await getAthleteShoesTool.execute();

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("STRAVA_ACCESS_TOKEN");
    });

    it("returns shoes list when athlete has shoes", async () => {
        process.env.STRAVA_ACCESS_TOKEN = "test-token";
        vi.mocked(getAuthenticatedAthlete).mockResolvedValue({
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
            shoes: [
                { id: "g1", name: "Pegasus 40", primary: true, distance: 12345, resource_state: 2 }
            ],
        } as any);

        const result = await getAthleteShoesTool.execute();

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain("Pegasus 40");
        expect(result.content[0].text).toContain("12.35 km");
    });
});
