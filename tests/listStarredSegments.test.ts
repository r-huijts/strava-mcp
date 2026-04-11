import { beforeEach, describe, expect, it, vi } from "vitest";
import { listStarredSegments } from "../src/tools/listStarredSegments.js";
import { getAuthenticatedAthlete, listStarredSegments as fetchSegments } from "../src/stravaClient.js";

vi.mock("../src/stravaClient.js", () => ({
    getAuthenticatedAthlete: vi.fn(),
    listStarredSegments: vi.fn(),
}));

const mockAthlete = {
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
    shoes: [],
} as any;

const mockSegment = {
    id: 1,
    name: "KOM Hill",
    activity_type: "Ride",
    distance: 3200,
    average_grade: 5.2,
    city: "Ithaca",
    state: "NY",
    country: "USA",
    private: false,
};

describe("list-starred-segments tool", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete process.env.STRAVA_ACCESS_TOKEN;
    });

    it("returns config error when token is missing", async () => {
        const result = await listStarredSegments.execute();

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("STRAVA_ACCESS_TOKEN");
    });

    it("returns config error when token is placeholder", async () => {
        process.env.STRAVA_ACCESS_TOKEN = "YOUR_STRAVA_ACCESS_TOKEN_HERE";

        const result = await listStarredSegments.execute();

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("STRAVA_ACCESS_TOKEN");
    });

    it("returns no segments message when list is empty", async () => {
        process.env.STRAVA_ACCESS_TOKEN = "test-token";
        vi.mocked(getAuthenticatedAthlete).mockResolvedValue(mockAthlete);
        vi.mocked(fetchSegments).mockResolvedValue([]);

        const result = await listStarredSegments.execute();

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toBe("No starred segments found.");
    });

    it("returns segments with km units for metric athlete", async () => {
        process.env.STRAVA_ACCESS_TOKEN = "test-token";
        vi.mocked(getAuthenticatedAthlete).mockResolvedValue({
            ...mockAthlete,
            measurement_preference: "meters",
        });
        vi.mocked(fetchSegments).mockResolvedValue([mockSegment] as any);

        const result = await listStarredSegments.execute();

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain("KOM Hill");
        expect(result.content[0].text).toContain("km");
    });

    it("returns segments with mi units for imperial athlete", async () => {
        process.env.STRAVA_ACCESS_TOKEN = "test-token";
        vi.mocked(getAuthenticatedAthlete).mockResolvedValue({
            ...mockAthlete,
            measurement_preference: "feet",
        });
        vi.mocked(fetchSegments).mockResolvedValue([mockSegment] as any);

        const result = await listStarredSegments.execute();

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain("KOM Hill");
        expect(result.content[0].text).toContain("mi");
    });

    it("returns error on API failure", async () => {
        process.env.STRAVA_ACCESS_TOKEN = "test-token";
        vi.mocked(getAuthenticatedAthlete).mockRejectedValue(new Error("Segment fetch failed"));

        const result = await listStarredSegments.execute();

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Segment fetch failed");
    });
});
