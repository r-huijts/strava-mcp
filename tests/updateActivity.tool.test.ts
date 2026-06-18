import { describe, expect, it, vi, beforeEach } from "vitest";
import { updateActivityTool } from "../src/tools/updateActivity.js";
import { updateActivity as updateActivityClient } from "../src/stravaClient.js";

vi.mock("../src/stravaClient.js", () => ({
    updateActivity: vi.fn(),
}));

describe("update-activity tool", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.STRAVA_ACCESS_TOKEN = "test-token";
    });

    it("accepts activityId as string + commute as string (Claude/Cowork pattern)", async () => {
        vi.mocked(updateActivityClient).mockResolvedValue({
            id: 123,
            name: "New name",
            start_date_local: "2024-01-01T00:00:00Z",
            commute: false,
        } as any);

        const args = updateActivityTool.inputSchema.parse({
            activityId: "123",
            name: "New name",
            description: "New description",
            commute: "false",
        });

        const result = await updateActivityTool.execute(args);

        expect(updateActivityClient).toHaveBeenCalledWith("test-token", 123, {
            name: "New name",
            description: "New description",
            commute: false,
        });
        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain("Activity updated");
        expect(result.content[0].text).toContain("Commute: false");
    });

    it("returns config error when token is missing", async () => {
        delete process.env.STRAVA_ACCESS_TOKEN;

        const args = updateActivityTool.inputSchema.parse({
            activityId: 1,
            commute: false,
        });

        const result = await updateActivityTool.execute(args);
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Missing Strava access token");
    });
});

