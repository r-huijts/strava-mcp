// import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"; // Removed
import { z } from "zod";
import {
    getAuthenticatedAthlete,
    listSegmentEfforts as fetchSegmentEfforts // Renamed import
} from "../stravaClient.js";
// We need the formatter, but can't import the full tool. Let's copy it here for now.
// TODO: Move formatters to a shared utils.ts file
import { StravaDetailedSegmentEffort } from "../stravaClient.js"; // Need the type

// Copied from getSegmentEffort.ts - needs formatDuration too
function formatDuration(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) {
        return 'N/A';
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (hours > 0) {
        parts.push(hours.toString().padStart(2, '0'));
    }
    parts.push(minutes.toString().padStart(2, '0'));
    parts.push(secs.toString().padStart(2, '0'));

    return parts.join(':');
}

function formatSegmentEffort(effort: StravaDetailedSegmentEffort, units: 'feet' | 'meters'): string {
    const distanceFactor = units === 'feet' ? 0.000621371 : 0.001;
    const distanceUnit = units === 'feet' ? 'mi' : 'km';

    const parts = [
        `⏱️ **Segment Effort: ${effort.name}** (Effort ID: ${effort.id})`,
        `   - Segment ID: ${effort.segment.id}`,
        `   - Activity ID: ${effort.activity.id}`,
        `   - Athlete ID: ${effort.athlete.id}`,
        `   - Date: ${new Date(effort.start_date_local).toLocaleString()}`,
        `   - Elapsed Time: ${formatDuration(effort.elapsed_time)}`,
        `   - Moving Time: ${formatDuration(effort.moving_time)}`,
        `   - Distance: ${(effort.distance * distanceFactor).toFixed(2)} ${distanceUnit}`,
        effort.average_watts !== null ? `   - Avg Watts: ${effort.average_watts?.toFixed(0)} W ${effort.device_watts ? '(Device)' : '(Est.)'}` : '',
        effort.average_heartrate !== null ? `   - Avg Heart Rate: ${effort.average_heartrate?.toFixed(0)} bpm` : '',
        effort.max_heartrate !== null ? `   - Max Heart Rate: ${effort.max_heartrate?.toFixed(0)} bpm` : '',
        effort.average_cadence !== null ? `   - Avg Cadence: ${effort.average_cadence?.toFixed(1)}` : '',
        effort.kom_rank !== undefined && effort.kom_rank !== null ? `   - KOM Rank: ${effort.kom_rank}` : '   - KOM Rank: N/A (Outside Top 10 or not applicable)',
        effort.pr_rank !== undefined && effort.pr_rank !== null ? `   - PR Rank: ${effort.pr_rank}` : '   - PR Rank: N/A',
        `   - Hidden: ${effort.hidden ? 'Yes' : 'No'}`
    ];

    return parts.filter(part => part !== '').join('\n');
}

// Input schema for listing segment efforts
const ListSegmentEffortsInputSchema = z.object({
    segmentId: z.number().int().positive().describe("The ID of the segment for which to list efforts."),
    startDateLocal: z.string().datetime({ message: "Invalid ISO 8601 datetime format for start date." }).optional()
        .describe("Filter efforts starting after this ISO 8601 date-time (optional)."),
    endDateLocal: z.string().datetime({ message: "Invalid ISO 8601 datetime format for end date." }).optional()
        .describe("Filter efforts ending before this ISO 8601 date-time (optional)."),
    perPage: z.number().int().positive().optional().default(30)
        .describe("Number of efforts to return per page (default: 30)."),
});

type ListSegmentEffortsInput = z.infer<typeof ListSegmentEffortsInputSchema>;

// Export the tool definition directly
export const listSegmentEfforts = {
    name: "list-segment-efforts",
    description: "Lists the authenticated athlete's efforts on a specific segment, optionally filtering by date.",
    inputSchema: ListSegmentEffortsInputSchema,
    execute: async ({ segmentId, startDateLocal, endDateLocal, perPage }: ListSegmentEffortsInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;

        if (!token || token === 'YOUR_STRAVA_ACCESS_TOKEN_HERE') {
            console.error("Missing or placeholder STRAVA_ACCESS_TOKEN in .env");
            return {
                content: [{ type: "text" as const, text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing or not set in the .env file." }],
                isError: true,
            };
        }

        try {
            console.error(`Fetching segment efforts for segment ID: ${segmentId}...`);
            const athlete = await getAuthenticatedAthlete(token); // For formatting units
            const efforts = await fetchSegmentEfforts(token, segmentId, startDateLocal, endDateLocal, perPage);
            console.error(`Successfully fetched ${efforts?.length ?? 0} efforts for segment ${segmentId}.`);

            if (!efforts || efforts.length === 0) {
                return { content: [{ type: "text" as const, text: ` MNo efforts found for segment ${segmentId} with the specified filters.` }] };
            }

            const effortItems = efforts.map(effort => {
                const text = formatSegmentEffort(effort, athlete.measurement_preference);
                const item: { type: "text", text: string } = { type: "text" as const, text };
                return item;
            });

            const responseText = `**Segment Efforts for Segment ID ${segmentId}:**\n\n${effortItems.map(item => item.text).join("\n---\n")}`;

            return { content: [{ type: "text" as const, text: responseText }] };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            console.error(`Error in list-segment-efforts tool for segment ID ${segmentId}:`, errorMessage);
            return {
                content: [{ type: "text" as const, text: `❌ API Error: ${errorMessage}` }],
                isError: true,
            };
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