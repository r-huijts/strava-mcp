import { z } from 'zod';
import { McpPositiveIntSchema, McpBooleanSchema } from '../mcpSchemas.js';
import {
    getSegmentLeaderboard as fetchSegmentLeaderboard,
    StravaLeaderboardResponse
} from '../stravaClient.js';

export const inputSchema = z.object({
    segmentId: McpPositiveIntSchema.describe(
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
    following: McpBooleanSchema.optional().default(false).describe(
        'If true, filter to only athletes the authenticated user follows.'
    ),
    club_id: McpPositiveIntSchema.optional().describe(
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

// Helper Functions
function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

export function formatLeaderboard(data: StravaLeaderboardResponse, segmentId: number): string {
    let output = `🏆 **Segment Leaderboard** (ID: ${segmentId})\n`;
    output += `   Total efforts: ${data.effort_count} | Entries shown: ${data.entries.length}\n\n`;

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

// Tool definition
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
            console.error("Missing STRAVA_ACCESS_TOKEN environment variable.");
            return {
                content: [{ type: 'text' as const, text: 'Configuration error: Missing Strava access token.' }],
                isError: true
            };
        }

        try {
            console.error(`Fetching leaderboard for segment ID: ${segmentId}...`);
            const leaderboard = await fetchSegmentLeaderboard(token, segmentId, {
                gender, age_group, weight_class, following, club_id, date_range, per_page, page
            });
            const formatted = formatLeaderboard(leaderboard, segmentId);

            console.error(`Successfully fetched leaderboard for segment ${segmentId} (${leaderboard.entry_count} entries)`);
            return { content: [{ type: 'text' as const, text: formatted }] };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Error fetching segment leaderboard ${segmentId}: ${errorMessage}`);

            let userFriendlyMessage;
            if (errorMessage.startsWith("SUBSCRIPTION_REQUIRED:")) {
                userFriendlyMessage = `🔒 Accessing this segment leaderboard (ID: ${segmentId}) requires a Strava subscription. Please check your subscription status.`;
            } else if (errorMessage.includes("Record Not Found") || errorMessage.includes("404")) {
                userFriendlyMessage = `Segment with ID ${segmentId} not found.`;
            } else {
                userFriendlyMessage = `An unexpected error occurred while fetching leaderboard for segment ${segmentId}. Details: ${errorMessage}`;
            }

            return {
                content: [{ type: 'text' as const, text: `❌ ${userFriendlyMessage}` }],
                isError: true
            };
        }
    }
};
