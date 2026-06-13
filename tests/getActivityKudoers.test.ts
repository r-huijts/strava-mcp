import { beforeEach, describe, expect, it, vi } from "vitest";
import { getActivityKudoersTool } from "../src/tools/getActivityKudoers.js";
import { getActivityKudoers, stravaApi } from "../src/stravaClient.js";

const mockKudoers = [
    {
        resource_state: 2,
        firstname: "Alice",
        lastname: "R",
        profile_medium: "https://example.com/alice-medium.jpg",
        profile: "https://example.com/alice.jpg",
    },
    {
        resource_state: 2,
        firstname: "Bob",
        lastname: "S",
    },
];

describe("getActivityKudoers client", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("fetches kudoers with pagination params", async () => {
        const getSpy = vi.spyOn(stravaApi, "get").mockResolvedValue({ data: mockKudoers } as any);

        const result = await getActivityKudoers("test-token", 98765, 2, 10);

        expect(result).toEqual(mockKudoers);
        expect(getSpy).toHaveBeenCalledWith(
            "activities/98765/kudos",
            expect.objectContaining({
                headers: { Authorization: "Bearer test-token" },
                params: {
                    page: 2,
                    per_page: 10,
                },
            })
        );
    });

    it("rejects invalid response data", async () => {
        vi.spyOn(stravaApi, "get").mockResolvedValue({ data: [{ firstname: "Missing resource state" }] } as any);

        await expect(getActivityKudoers("test-token", 98765)).rejects.toThrow("Invalid data format");
    });
});

describe("get-activity-kudoers tool", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        process.env.STRAVA_ACCESS_TOKEN = "test-token";
    });

    it("returns config error when token is missing", async () => {
        delete process.env.STRAVA_ACCESS_TOKEN;

        const result = await getActivityKudoersTool.execute({ id: 98765, page: 1, perPage: 30 });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Missing Strava access token");
    });

    it("returns kudoer summaries and raw data", async () => {
        vi.spyOn(stravaApi, "get").mockResolvedValue({ data: mockKudoers } as any);

        const result = await getActivityKudoersTool.execute({ id: "98765", page: 1, perPage: 30 });

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain("Activity Kudoers");
        expect(result.content[0].text).toContain("Alice R");
        expect(result.content[0].text).toContain("Bob S");
        expect(result.content[0].text).not.toContain("Alice R (ID:");
        expect(result.content[0].text).not.toContain("Bob S (ID:");
        expect(result.content[1].text).toContain("Complete Kudoer Data");
    });

    it("returns empty message when activity has no kudos", async () => {
        vi.spyOn(stravaApi, "get").mockResolvedValue({ data: [] } as any);

        const result = await getActivityKudoersTool.execute({ id: 98765, page: 1, perPage: 30 });

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain("No kudoers found");
    });

    it("rejects invalid activity id", async () => {
        const result = await getActivityKudoersTool.execute({ id: "not-a-number", page: 1, perPage: 30 });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Invalid activity ID");
    });

    it("handles 404 errors gracefully", async () => {
        vi.spyOn(stravaApi, "get").mockRejectedValue(new Error("Record Not Found (404)"));

        const result = await getActivityKudoersTool.execute({ id: 99999, page: 1, perPage: 30 });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("not found");
    });
});
