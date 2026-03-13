import { z } from 'zod';
import { stravaApi } from '../stravaClient.js';

const inputSchema = z.object({
    segmentId: z.number().int().positive().describe(
        'The unique identifier of the segment to fetch the leaderboard for.'
    ),
    gender: z.enum(['M', 'F']).optional().describe(
        'Filter by gender. M for male, F for female.'
    ),
    age_group: z.enum(['0_19', '20_24', '25_34', '35_44', '45_54', '55_64', '65_69', '70_74', '75_plus']).optional().describe(
        'Filter by age group.'
    ),
    weight_class: z.enum(['0_54', '55_64', '65_74', '75_84', '85_94', '95_plus']).optional().describe(
        'Filter by weight class in kg.'
    ),
    following: z.boolean().optional().default(false).describe(
        'If true, filter to only athletes the authenticated user follows.'
    ),
    club_id: z.number().int().optional().describe(
        'Filter to only athletes in the specified club.'
    ),
    date_range: z.enum(['this_year', 'this_month', 'this_week', 'today']).optional().describe(
        'Filter by date range for efforts.'
    ),
    per_page: z.number().int().min(1).max(200).optional().default(10).describe(
        'Number of entries per page (max 200, default 10).'
    ),
    page: z.number().int().min(1).optional().default(1).describe(
        'Page number for pagination.'
    )
});

type GetSegmentLeaderboardParams = z.infer<typeof inputSchema>;

interface LeaderboardEntry {
    athlete_name: string;
    elapsed_time: number;
    moving_time: number;
    start_date: string;
    rank: number;
    average_watts?: number;
    average_hr?: number;
}

interface LeaderboardResponse {
    effort_count: number;
    entry_count: number;
    entries: LeaderboardEntry[];
}

function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

function formatLeaderboard(data: LeaderboardResponse, segmentId: number): string {
    let output = `🏆 **Segment Leaderboard** (ID: ${segmentId})\n`;
    output += `   Total efforts: ${data.effort_count} | Entries shown: ${data.entry_count}\n\n`;

    if (data.entries.length === 0) {
        output += '   No entries found for the given filters.\n';
        return output;
    }

    output += '| Rank | Athlete | Time | Avg Power | Avg HR |\n';
    output += '|------|---------|------|-----------|--------|\n';

    for (const entry of data.entries) {
        const power = entry.average_watts ? `${Math.round(entry.average_watts)}W` : '-';
        const hr = entry.average_hr ? `${Math.round(entry.average_hr)}bpm` : '-';
        output += `| ${entry.rank} | ${entry.athlete_name} | ${formatTime(entry.elapsed_time)} | ${power} | ${hr} |\n`;
    }

    return output;
}

export const getSegmentLeaderboardTool = {
    name: 'get-segment-leaderboard',
    description:
        'Retrieves the leaderboard for a specific Strava segment. Shows top performances with times, ' +
        'power, and heart rate data. Supports filtering by gender, age group, weight class, club, ' +
        'date range, and followed athletes.\n\n' +
        'Use this to:\n' +
        '- See top performances on a segment\n' +
        '- Compare your efforts against others\n' +
        '- Filter by demographics or time period\n' +
        '- Check if you have a chance at a top position',
    inputSchema,
    execute: async ({ segmentId, gender, age_group, weight_class, following = false, club_id, date_range, per_page = 10, page = 1 }: GetSegmentLeaderboardParams) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;
        if (!token) {
            return {
                content: [{ type: 'text' as const, text: '❌ Missing STRAVA_ACCESS_TOKEN in .env' }],
                isError: true
            };
        }

        try {
            stravaApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            const params: Record<string, any> = {
                per_page,
                page
            };
            if (gender) params.gender = gender;
            if (age_group) params.age_group = age_group;
            if (weight_class) params.weight_class = weight_class;
            if (following) params.following = following;
            if (club_id) params.club_id = club_id;
            if (date_range) params.date_range = date_range;

            const response = await stravaApi.get<LeaderboardResponse>(
                `/segments/${segmentId}/leaderboard`,
                { params }
            );

            const leaderboard = response.data;
            const formatted = formatLeaderboard(leaderboard, segmentId);

            return {
                content: [{ type: 'text' as const, text: formatted }]
            };
        } catch (error: any) {
            const statusCode = error.response?.status;
            const errorMessage = error.response?.data?.message || error.message;

            let userFriendlyError = `❌ Failed to fetch segment leaderboard (${statusCode}): ${errorMessage}\n\n`;
            userFriendlyError += 'This could be because:\n';
            userFriendlyError += '1. The segment ID is invalid\n';
            userFriendlyError += '2. You don\'t have permission to view this segment\n';
            userFriendlyError += '3. The segment is private or hazardous';

            return {
                content: [{ type: 'text' as const, text: userFriendlyError }],
                isError: true
            };
        }
    }
};
