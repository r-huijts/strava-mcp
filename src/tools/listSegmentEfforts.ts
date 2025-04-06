// import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"; // Removed
import { z } from "zod";
import {
    listSegmentEfforts as fetchSegmentEfforts,
    handleApiError,
    StravaDetailedSegmentEffort // Type needed for formatter
} from "../stravaClient.js";
// We need the formatter, but can't import the full tool. Let's copy it here for now.
// TODO: Move formatters to a shared utils.ts file

// Zod schema for input validation
const ListSegmentEffortsInputSchema = z.object({
    segmentId: z.number().int().positive().describe("The ID of the segment for which to list efforts."),
    startDateLocal: z.string().datetime({ message: "Invalid start date format. Use ISO 8601." }).optional().describe("Filter efforts starting after this ISO 8601 date-time (optional)."),
    endDateLocal: z.string().datetime({ message: "Invalid end date format. Use ISO 8601." }).optional().describe("Filter efforts ending before this ISO 8601 date-time (optional)."),
    perPage: z.number().int().positive().max(200).optional().default(30).describe("Number of efforts to return per page (default: 30, max: 200).")
});

type ListSegmentEffortsInput = z.infer<typeof ListSegmentEffortsInputSchema>;

// Helper Functions (Metric Only) - Copied locally
function formatDuration(seconds: number | null | undefined): string {
    if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const parts: string[] = [];
    if (hours > 0) parts.push(hours.toString().padStart(2, '0'));
    parts.push(minutes.toString().padStart(2, '0'));
    parts.push(secs.toString().padStart(2, '0'));
    return parts.join(':');
}

function formatDistance(meters: number | null | undefined): string {
    if (meters === null || meters === undefined) return 'N/A';
    return (meters / 1000).toFixed(2) + ' km';
}

// Format segment effort summary (Metric Only)
function formatSegmentEffort(effort: StravaDetailedSegmentEffort): string {
    const movingTime = formatDuration(effort.moving_time);
    const elapsedTime = formatDuration(effort.elapsed_time);
    const distance = formatDistance(effort.distance);

    // Basic summary: Effort ID, Date, Moving Time, Distance, PR Rank
    let summary = `⏱️ Effort ID: ${effort.id} (${new Date(effort.start_date_local).toLocaleDateString()})`;
    summary += ` | Time: ${movingTime} (Moving), ${elapsedTime} (Elapsed)`;
    summary += ` | Dist: ${distance}`;
    if (effort.pr_rank !== null) summary += ` | PR Rank: ${effort.pr_rank}`;
    if (effort.kom_rank !== null) summary += ` | KOM Rank: ${effort.kom_rank}`; // Add KOM if available
    return summary;
}

// Tool definition
export const listSegmentEffortsTool = {
    name: "list-segment-efforts",
    description: "Lists the authenticated athlete's efforts on a specific segment, optionally filtering by date.",
    inputSchema: ListSegmentEffortsInputSchema,
    execute: async ({ segmentId, startDateLocal, endDateLocal, perPage }: ListSegmentEffortsInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;

        if (!token) {
            console.error("Missing STRAVA_ACCESS_TOKEN environment variable.");
            return {
                content: [{ type: "text" as const, text: "Configuration error: Missing Strava access token." }],
                isError: true
            };
        }

        try {
            console.error(`Fetching segment efforts for segment ID: ${segmentId}...`);
            
            // Use the new params object structure
            const efforts = await fetchSegmentEfforts(token, segmentId, {
                startDateLocal,
                endDateLocal,
                perPage
            });

            if (!efforts || efforts.length === 0) {
                console.error(`No efforts found for segment ${segmentId} with the given filters.`);
                return { content: [{ type: "text" as const, text: `No efforts found for segment ${segmentId} matching the criteria.` }] };
            }

            console.error(`Successfully fetched ${efforts.length} efforts for segment ${segmentId}.`);
            const effortSummaries = efforts.map(effort => formatSegmentEffort(effort)); // Use metric formatter
            const responseText = `**Segment ${segmentId} Efforts:**\n\n${effortSummaries.join("\n")}`;

            return { content: [{ type: "text" as const, text: responseText }] };
        } catch (error) {
            console.error(`Error listing efforts for segment ${segmentId}: ${(error as Error).message}`);
            handleApiError(error, `listing efforts for segment ${segmentId}`);
            return { content: [{ type: "text" as const, text: "An unexpected error occurred while listing segment efforts." }], isError: true };
        }
    }
};

// Removed old registration function
/*
export function registerListSegmentEffortsTool(server: McpServer) {
    server.tool(
        listSegmentEfforts.name,
        listSegmentEfforts.description,
        listSegmentEfforts.inputSchema.shape,
        listSegmentEfforts.execute
    );
}
*/ 