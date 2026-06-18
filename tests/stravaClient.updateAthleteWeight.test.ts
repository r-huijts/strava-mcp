import { describe, expect, it, vi } from "vitest";

import { stravaApi, updateAthleteWeight } from "../src/stravaClient.ts";

describe("updateAthleteWeight", () => {
    it("sends PUT /athlete and returns validated athlete", async () => {
        vi.spyOn(stravaApi, "put").mockResolvedValue({
            data: {
                id: 123,
                resource_state: 3,
                username: "runner",
                firstname: "Jane",
                lastname: "Doe",
                city: null,
                state: null,
                country: null,
                sex: "F",
                premium: true,
                summit: true,
                created_at: "2024-01-01T00:00:00Z",
                updated_at: "2024-01-02T00:00:00Z",
                profile_medium: "https://example.com/medium.jpg",
                profile: "https://example.com/profile.jpg",
                weight: 68.3,
                measurement_preference: "meters",
                bikes: [],
                shoes: [],
            },
        } as any);

        const athlete = await updateAthleteWeight("token", 68.3);

        expect(stravaApi.put).toHaveBeenCalledWith(
            "athlete",
            { weight: 68.3 },
            { headers: { Authorization: "Bearer token" } }
        );
        expect(athlete.weight).toBe(68.3);
    });
});
