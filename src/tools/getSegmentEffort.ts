import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
    getAuthenticatedAthlete,
    getSegmentEffortById,
    StravaDetailedSegmentEffort
} from "../stravaClient.js";
import { formatDuration } from "../server.js";

const GetSegmentEffortInputSchema = z.object({
    effortId: z.number().int().positive().describe("The unique identifier of the segment effort to fetch."),
});

// Helper to format segment effort details
export function formatSegmentEffort(effort: StravaDetailedSegmentEffort, units: 'feet' | 'meters'): string {
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
        effort.kom_rank !== null ? `   - KOM Rank: ${effort.kom_rank}` : '   - KOM Rank: N/A (Outside Top 10)',
        effort.pr_rank !== null ? `   - PR Rank: ${effort.pr_rank}` : '   - PR Rank: N/A',
        `   - Hidden: ${effort.hidden ? 'Yes' : 'No'}`
    ];

    return parts.filter(part => part !== '').join('\n');
}

export function registerGetSegmentEffortTool(server: McpServer) {
    server.tool(
        "get-segment-effort",
        "Fetches detailed information about a specific segment effort using its ID.",
        GetSegmentEffortInputSchema.shape,
        async (params, _extra) => {
            const { effortId } = params;
            const token = process.env.STRAVA_ACCESS_TOKEN;

            if (!token || token === 'YOUR_STRAVA_ACCESS_TOKEN_HERE') {
                console.error("Missing or placeholder STRAVA_ACCESS_TOKEN in .env");
                return {
                    content: [{ type: "text", text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing or not set in the .env file." }],
                    isError: true,
                };
            }

            try {
                console.error(`Fetching details for segment effort ID: ${effortId}...`);
                const athlete = await getAuthenticatedAthlete(token); // For measurement preference
                const effort = await getSegmentEffortById(token, effortId);
                console.error(`Successfully fetched details for effort on segment: ${effort.name}`);

                const effortDetailsText = formatSegmentEffort(effort, athlete.measurement_preference);

                return { content: [{ type: "text", text: effortDetailsText }] };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
                console.error(`Error in get-segment-effort tool for ID ${effortId}:`, errorMessage);
                return {
                    content: [{ type: "text", text: `❌ API Error: ${errorMessage}` }],
                    isError: true,
                };
            }
        }
    );
} 