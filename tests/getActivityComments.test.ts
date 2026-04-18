import { describe, expect, it, vi, beforeEach } from "vitest";
import { getActivityCommentsTool } from "../src/tools/getActivityComments.js";
import { stravaApi } from "../src/stravaClient.js";

const mockComments = [
    {
        id: 1001,
        activity_id: 12345,
        text: "Great ride!",
        athlete: { firstname: "Alice", lastname: "Smith" },
        created_at: "2026-04-15T10:30:00Z",
        cursor: "abc123",
    },
    {
        id: 1002,
        activity_id: 12345,
        text: "Thanks for joining!",
        athlete: { firstname: "Bob", lastname: "Jones" },
        created_at: "2026-04-15T11:00:00Z",
        cursor: "def456",
    },
];

describe("getActivityCommentsTool", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.STRAVA_ACCESS_TOKEN = "test-token";
        stravaApi.defaults = {
            headers: { common: {} },
        } as any;
    });

    it("returns error when no access token", async () => {
        delete process.env.STRAVA_ACCESS_TOKEN;
        const result = await getActivityCommentsTool.execute({
            id: 12345,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Missing Strava access token");
    });

    it("fetches and formats comments successfully", async () => {
        vi.spyOn(stravaApi, "get").mockResolvedValue({
            data: mockComments,
        } as any);

        const result = await getActivityCommentsTool.execute({ id: 12345 });

        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toContain("Alice Smith");
        expect(result.content[0].text).toContain("Great ride!");
        expect(result.content[0].text).toContain("Bob Jones");
    });

    it("handles no comments", async () => {
        vi.spyOn(stravaApi, "get").mockResolvedValue({ data: [] } as any);

        const result = await getActivityCommentsTool.execute({ id: 12345 });

        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toContain("No comments found");
    });

    it("passes pagination params to API", async () => {
        const getSpy = vi.spyOn(stravaApi, "get").mockResolvedValue({
            data: mockComments,
        } as any);

        await getActivityCommentsTool.execute({
            id: 12345,
            page_size: 10,
            after_cursor: "abc123",
        });

        expect(getSpy).toHaveBeenCalledWith(
            "activities/12345/comments",
            expect.objectContaining({
                params: expect.objectContaining({
                    page_size: 10,
                    after_cursor: "abc123",
                }),
            })
        );
    });

    it("handles 404 errors gracefully", async () => {
        vi.spyOn(stravaApi, "get").mockRejectedValue(
            new Error("Record Not Found (404)")
        );

        const result = await getActivityCommentsTool.execute({ id: 99999 });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("not found");
    });

    it("handles generic errors", async () => {
        vi.spyOn(stravaApi, "get").mockRejectedValue(
            new Error("Network timeout")
        );

        const result = await getActivityCommentsTool.execute({ id: 12345 });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("unexpected error");
        expect(result.content[0].text).toContain("Network timeout");
    });

    it("handles non-Error thrown values", async () => {
        vi.spyOn(stravaApi, "get").mockRejectedValue("something went wrong");

        const result = await getActivityCommentsTool.execute({ id: 12345 });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("something went wrong");
    });

    it("omits pagination note when last comment has no cursor", async () => {
        const commentsNoCursor = [
            {
                id: 1001,
                activity_id: 12345,
                text: "Nice!",
                athlete: { firstname: "Alice", lastname: "Smith" },
                created_at: "2026-04-15T10:30:00Z",
                cursor: null,
            },
        ];
        vi.spyOn(stravaApi, "get").mockResolvedValue({
            data: commentsNoCursor,
        } as any);

        const result = await getActivityCommentsTool.execute({ id: 12345 });

        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).not.toContain("after_cursor");
    });

    it("includes pagination note when last comment has a cursor", async () => {
        vi.spyOn(stravaApi, "get").mockResolvedValue({
            data: mockComments,
        } as any);

        const result = await getActivityCommentsTool.execute({ id: 12345 });

        expect(result.content[0].text).toContain("after_cursor");
        expect(result.content[0].text).toContain("def456");
    });

    it("includes raw JSON data in second content block", async () => {
        vi.spyOn(stravaApi, "get").mockResolvedValue({
            data: mockComments,
        } as any);

        const result = await getActivityCommentsTool.execute({ id: 12345 });

        expect(result.content).toHaveLength(2);
        expect(result.content[1].text).toContain("Complete Comment Data");
        const jsonPart = result.content[1].text.replace("\\n\\nComplete Comment Data:\\n", "");
        expect(jsonPart).toContain('"Great ride!"');
    });
});
