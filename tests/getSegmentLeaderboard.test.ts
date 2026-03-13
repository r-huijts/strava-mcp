import { describe, expect, it, vi, beforeEach } from "vitest";
import { formatLeaderboard, getSegmentLeaderboardTool } from "../src/tools/getSegmentLeaderboard.js";
import { stravaApi } from "../src/stravaClient.js";

const mockLeaderboard = {
    effort_count: 1500,
    entry_count: 3,
    entries: [
        { athlete_name: "Alice", elapsed_time: 325, moving_time: 320, start_date: "2024-06-01T10:00:00Z", rank: 1, average_watts: 280, average_hr: 172 },
        { athlete_name: "Bob", elapsed_time: 340, moving_time: 335, start_date: "2024-05-15T09:00:00Z", rank: 2, average_watts: 260, average_hr: 168 },
        { athlete_name: "Charlie", elapsed_time: 3720, moving_time: 3700, start_date: "2024-04-20T08:00:00Z", rank: 3 }
    ]
};

describe('formatLeaderboard', () => {
    it('formats a leaderboard with entries as a markdown table', () => {
        const result = formatLeaderboard(mockLeaderboard, 12345);
        expect(result).toContain('Segment Leaderboard');
        expect(result).toContain('12345');
        expect(result).toContain('1500');
        expect(result).toContain('Alice');
        expect(result).toContain('Bob');
        expect(result).toContain('| Rank |');
    });

    it('formats time correctly for minutes-only durations', () => {
        const result = formatLeaderboard(mockLeaderboard, 1);
        expect(result).toContain('5m 25s'); // 325 seconds
    });

    it('formats time correctly for hour+ durations', () => {
        const result = formatLeaderboard(mockLeaderboard, 1);
        expect(result).toContain('1h 2m 0s'); // 3720 seconds
    });

    it('shows dash for missing power/hr', () => {
        const result = formatLeaderboard(mockLeaderboard, 1);
        // Charlie has no average_watts or average_hr
        expect(result).toMatch(/Charlie.*\| - \| - \|/);
    });

    it('formats power and HR values', () => {
        const result = formatLeaderboard(mockLeaderboard, 1);
        expect(result).toContain('280W');
        expect(result).toContain('172bpm');
    });

    it('handles empty leaderboard', () => {
        const empty = { effort_count: 0, entry_count: 0, entries: [] };
        const result = formatLeaderboard(empty, 99);
        expect(result).toContain('No entries found');
        expect(result).not.toContain('| Rank |');
    });
});

describe('getSegmentLeaderboardTool', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.STRAVA_ACCESS_TOKEN = 'test-token';
        stravaApi.defaults = {
            headers: {
                common: {}
            }
        } as any;
    });

    it('returns error when no access token', async () => {
        delete process.env.STRAVA_ACCESS_TOKEN;
        const result = await getSegmentLeaderboardTool.execute({
            segmentId: 1, following: false, per_page: 10, page: 1
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Missing Strava access token');
    });

    it('fetches and formats leaderboard successfully', async () => {
        vi.spyOn(stravaApi, 'get').mockResolvedValue({ data: mockLeaderboard } as any);

        const result = await getSegmentLeaderboardTool.execute({
            segmentId: 12345, following: false, per_page: 10, page: 1
        });

        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toContain('Segment Leaderboard');
        expect(result.content[0].text).toContain('Alice');
    });

    it('passes filter params to API', async () => {
        const getSpy = vi.spyOn(stravaApi, 'get').mockResolvedValue({ data: mockLeaderboard } as any);

        await getSegmentLeaderboardTool.execute({
            segmentId: 100, gender: 'F', age_group: '25_34', following: false, per_page: 20, page: 2
        });

        expect(getSpy).toHaveBeenCalledWith(
            'segments/100/leaderboard',
            expect.objectContaining({
                params: expect.objectContaining({
                    gender: 'F',
                    age_group: '25_34',
                    per_page: 20,
                    page: 2
                })
            })
        );
    });

    it('handles API errors gracefully', async () => {
        vi.spyOn(stravaApi, 'get').mockRejectedValue(new Error('Record Not Found (404)'));

        const result = await getSegmentLeaderboardTool.execute({
            segmentId: 99999, following: false, per_page: 10, page: 1
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('not found');
    });
});
