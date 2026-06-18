import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateAthleteWeightTool } from "../src/tools/updateAthleteWeight.js";
import { updateAthleteWeight } from "../src/stravaClient.js";

vi.mock("../src/stravaClient.js", () => ({
    updateAthleteWeight: vi.fn(),
}));

describe("update-athlete-weight tool", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns configuration error when token is missing", async () => {
        delete process.env.STRAVA_ACCESS_TOKEN;

        const result = await updateAthleteWeightTool.execute({ weight: 72.5 });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("STRAVA_ACCESS_TOKEN");
    });

    it("returns success response when update works", async () => {
        process.env.STRAVA_ACCESS_TOKEN = "test-token";
        vi.mocked(updateAthleteWeight).mockResolvedValue({
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
            weight: 72.5,
            measurement_preference: "meters",
        } as any);

        const result = await updateAthleteWeightTool.execute({ weight: 72.5 });

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain("Weight updated successfully");
        expect(result.content[0].text).toContain("72.5");
    });

    it("returns API error when Strava scope profile:write is missing", async () => {
        process.env.STRAVA_ACCESS_TOKEN = "test-token";
        vi.mocked(updateAthleteWeight).mockRejectedValue(
            new Error("Strava API Error in updateAthleteWeight to 72.5kg (403): Authorization Error")
        );

        const result = await updateAthleteWeightTool.execute({ weight: 72.5 });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("API Error");
        expect(result.content[0].text).toContain("Authorization Error");
    });
});
