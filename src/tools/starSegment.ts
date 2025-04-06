import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { starSegment } from "../stravaClient.js";

const StarSegmentInputSchema = z.object({
    segmentId: z.number().int().positive().describe("The unique identifier of the segment to star or unstar."),
    starred: z.boolean().describe("Set to true to star the segment, false to unstar it."),
});

export function registerStarSegmentTool(server: McpServer) {
    server.tool(
        "star-segment",
        "Stars or unstars a specific segment for the authenticated athlete.",
        StarSegmentInputSchema.shape,
        async (params, _extra) => {
            const { segmentId, starred } = params;
            const token = process.env.STRAVA_ACCESS_TOKEN;

            if (!token || token === 'YOUR_STRAVA_ACCESS_TOKEN_HERE') {
                console.error("Missing or placeholder STRAVA_ACCESS_TOKEN in .env");
                return {
                    content: [{ type: "text", text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing or not set in the .env file." }],
                    isError: true,
                };
            }

            try {
                const action = starred ? 'starring' : 'unstarring';
                console.error(`Attempting to ${action} segment ID: ${segmentId}...`);

                const updatedSegment = await starSegment(token, segmentId, starred);

                // Check the response to confirm the action was successful
                const successMessage = `Successfully ${action} segment: "${updatedSegment.name}" (ID: ${updatedSegment.id}). Its starred status is now: ${updatedSegment.starred}.`;
                console.error(successMessage);

                return { content: [{ type: "text", text: successMessage }] };

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
                const action = starred ? 'star' : 'unstar';
                console.error(`Error attempting to ${action} segment ID ${segmentId}:`, errorMessage);
                return {
                    content: [{ type: "text", text: `❌ API Error: Failed to ${action} segment ${segmentId}. ${errorMessage}` }],
                    isError: true,
                };
            }
        }
    );
} 