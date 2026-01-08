import { describe, expect, it, vi } from "vitest";

import { getAllActivities as getAllActivitiesTool } from "../src/tools/getAllActivities.ts";
import { stravaApi } from "../src/stravaClient.ts";

describe("get-all-activities tool", () => {
    it("filters by activityTypes using preserved activity.type", async () => {
        const previousToken = process.env.STRAVA_ACCESS_TOKEN;
        process.env.STRAVA_ACCESS_TOKEN = "test-token";

        try {
            vi.spyOn(stravaApi, "get").mockResolvedValue({
                data: [
                    {
                        id: 1234567890,
                        name: "Test Run",
                        distance: 5000,
                        start_date: new Date("2024-12-03T20:02:12.000Z").toISOString(),
                        type: "Run",
                        sport_type: "Run",
                        moving_time: 4237,
                    },
                ],
            } as any);

            const result = await getAllActivitiesTool.execute({
                startDate: "2024-12-03",
                endDate: "2024-12-04",
                activityTypes: ["Run"],
                maxActivities: 500,
                maxApiCalls: 1,
                perPage: 200,
            });

            const text = result.content[0]?.text ?? "";
            expect(text).toContain("**Found 1 activities**");
            expect(text).toContain("ID: 1234567890");
            expect(text).toContain(" - Run - ");
        } finally {
            process.env.STRAVA_ACCESS_TOKEN = previousToken;
        }
    });
});
