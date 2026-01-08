import { describe, expect, it, vi } from "vitest";

import { getAllActivities, stravaApi } from "../src/stravaClient.ts";

describe("getAllActivities", () => {
    it("preserves type/sport_type from athlete/activities payload", async () => {
        const startDateIso = new Date("2024-12-03T20:02:12.000Z").toISOString();

        vi.spyOn(stravaApi, "get").mockResolvedValue({
            data: [
                {
                    id: 1234567890,
                    name: "Test Run",
                    distance: 5000,
                    start_date: startDateIso,
                    type: "Run",
                    sport_type: "Run",
                    moving_time: 4237,
                },
            ],
        } as any);

        const activities = await getAllActivities("fake-token", { perPage: 200, page: 1 });

        expect(activities).toHaveLength(1);
        expect(activities[0].type).toBe("Run");
        expect(activities[0].sport_type).toBe("Run");
        expect(activities[0].moving_time).toBe(4237);
    });
});
