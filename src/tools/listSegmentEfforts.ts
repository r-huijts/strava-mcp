import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
    getAuthenticatedAthlete,
    listSegmentEfforts
} from "../stravaClient.js";
import { formatSegmentEffort } from "./getSegmentEffort.js"; // Reuse formatter

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

export function registerListSegmentEffortsTool(server: McpServer) {
    server.tool(
        "list-segment-efforts",
        "Lists the authenticated athlete's efforts on a specific segment, optionally filtering by date.",
        ListSegmentEffortsInputSchema.shape,
        async (params, _extra) => {
            const { segmentId, startDateLocal, endDateLocal, perPage } = params;
            const token = process.env.STRAVA_ACCESS_TOKEN;

            if (!token || token === 'YOUR_STRAVA_ACCESS_TOKEN_HERE') {
                console.error("Missing or placeholder STRAVA_ACCESS_TOKEN in .env");
                return {
                    content: [{ type: "text", text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing or not set in the .env file." }],
                    isError: true,
                };
            }

            try {
                console.error(`Fetching segment efforts for segment ID: ${segmentId}...`);
                const athlete = await getAuthenticatedAthlete(token); // For formatting units
                const efforts = await listSegmentEfforts(token, segmentId, startDateLocal, endDateLocal, perPage);
                console.error(`Successfully fetched ${efforts?.length ?? 0} efforts for segment ${segmentId}.`);

                if (!efforts || efforts.length === 0) {
                    return { content: [{ type: "text", text: ` MNo efforts found for segment ${segmentId} with the specified filters.` }] };
                }

                // Reuse the formatter from getSegmentEffort tool
                const effortListText = efforts.map(effort => formatSegmentEffort(effort, athlete.measurement_preference)).join("\n---\n");

                const responseText = `**Segment Efforts for Segment ID ${segmentId}:**\n\n${effortListText}`;

                return { content: [{ type: "text", text: responseText }] };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
                console.error(`Error in list-segment-efforts tool for segment ID ${segmentId}:`, errorMessage);
                return {
                    content: [{ type: "text", text: `❌ API Error: ${errorMessage}` }],
                    isError: true,
                };
            }
        }
    );
} 