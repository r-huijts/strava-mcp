// import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"; // Removed
import { z } from "zod";
import {
    StravaDetailedSegmentEffort,
    getSegmentEffort as fetchSegmentEffort,
    handleApiError,
} from "../stravaClient.js";
// import { formatDuration } from "../server.js"; // Removed, now local

const GetSegmentEffortInputSchema = z.object({
    effortId: z.number().int().positive().describe("The unique identifier of the segment effort to fetch.")
});

type GetSegmentEffortInput = z.infer<typeof GetSegmentEffortInputSchema>;

// Helper Functions (Metric Only)
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

// Format segment effort details (Metric Only)
function formatSegmentEffort(effort: StravaDetailedSegmentEffort): string {
    const movingTime = formatDuration(effort.moving_time);
    const elapsedTime = formatDuration(effort.elapsed_time);
    const distance = formatDistance(effort.distance);
    // Remove speed/pace calculations as fields are not available on effort object
    // const avgSpeed = formatSpeed(effort.average_speed);
    // const maxSpeed = formatSpeed(effort.max_speed);
    // const avgPace = formatPace(effort.average_speed);

    let details = `⏱️ **Segment Effort: ${effort.name}** (ID: ${effort.id})\n`;
    details += `   - Activity ID: ${effort.activity.id}, Athlete ID: ${effort.athlete.id}\n`;
    details += `   - Segment ID: ${effort.segment.id}\n`;
    details += `   - Date: ${new Date(effort.start_date_local).toLocaleString()}\n`;
    details += `   - Moving Time: ${movingTime}, Elapsed Time: ${elapsedTime}\n`;
    if (effort.distance !== undefined) details += `   - Distance: ${distance}\n`;
    // Remove speed/pace display lines
    // if (effort.average_speed !== undefined) { ... }
    // if (effort.max_speed !== undefined) { ... }
    if (effort.average_cadence !== undefined && effort.average_cadence !== null) details += `   - Avg Cadence: ${effort.average_cadence.toFixed(1)}\n`;
    if (effort.average_watts !== undefined && effort.average_watts !== null) details += `   - Avg Watts: ${effort.average_watts.toFixed(1)}\n`;
    if (effort.average_heartrate !== undefined && effort.average_heartrate !== null) details += `   - Avg Heart Rate: ${effort.average_heartrate.toFixed(1)} bpm\n`;
    if (effort.max_heartrate !== undefined && effort.max_heartrate !== null) details += `   - Max Heart Rate: ${effort.max_heartrate.toFixed(0)} bpm\n`;
    if (effort.kom_rank !== null) details += `   - KOM Rank: ${effort.kom_rank}\n`;
    if (effort.pr_rank !== null) details += `   - PR Rank: ${effort.pr_rank}\n`;
    details += `   - Hidden: ${effort.hidden ? 'Yes' : 'No'}\n`;

    return details;
}

// Tool definition
export const getSegmentEffortTool = {
    name: "get-segment-effort",
    description: "Fetches detailed information about a specific segment effort using its ID.",
    inputSchema: GetSegmentEffortInputSchema,
    execute: async ({ effortId }: GetSegmentEffortInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;

        if (!token) {
            console.error("Missing STRAVA_ACCESS_TOKEN environment variable.");
            return {
                content: [{ type: "text" as const, text: "Configuration error: Missing Strava access token." }],
                isError: true
            };
        }

        try {
            console.error(`Fetching details for segment effort ID: ${effortId}...`);
            // Removed getAuthenticatedAthlete call
            const effort = await fetchSegmentEffort(token, effortId);
            const effortDetailsText = formatSegmentEffort(effort); // Use metric formatter

            console.error(`Successfully fetched details for effort: ${effort.name}`);
            return { content: [{ type: "text" as const, text: effortDetailsText }] };
        } catch (error) {
            console.error(`Error fetching segment effort ${effortId}: ${(error as Error).message}`);
            handleApiError(error, `fetching segment effort ${effortId}`);
            return { content: [{ type: "text" as const, text: "An unexpected error occurred while fetching segment effort details." }], isError: true };
        }
    }
};

// Removed old registration function
/*
export function registerGetSegmentEffortTool(server: McpServer) {
    server.tool(
        getSegmentEffort.name,
        getSegmentEffort.description,
        getSegmentEffort.inputSchema.shape,
        getSegmentEffort.execute
    );
}
*/ 