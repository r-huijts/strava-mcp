// import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"; // Removed
import { z } from "zod";
import { starSegment as updateStarStatus } from "../stravaClient.js"; // Renamed import

const StarSegmentInputSchema = z.object({
    segmentId: z.number().int().positive().describe("The unique identifier of the segment to star or unstar."),
    starred: z.boolean().describe("Set to true to star the segment, false to unstar it."),
});

type StarSegmentInput = z.infer<typeof StarSegmentInputSchema>;

// Export the tool definition directly
export const starSegment = {
    name: "star-segment",
    description: "Stars or unstars a specific segment for the authenticated athlete.",
    inputSchema: StarSegmentInputSchema,
    execute: async ({ segmentId, starred }: StarSegmentInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;

        if (!token || token === 'YOUR_STRAVA_ACCESS_TOKEN_HERE') {
            console.error("Missing or placeholder STRAVA_ACCESS_TOKEN in .env");
            return {
                content: [{ type: "text" as const, text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing or not set in the .env file." }],
                isError: true,
            };
        }

        try {
            const action = starred ? 'starring' : 'unstarring';
            console.error(`Attempting to ${action} segment ID: ${segmentId}...`);

            const updatedSegment = await updateStarStatus(token, segmentId, starred);

            const successMessage = `Successfully ${action} segment: "${updatedSegment.name}" (ID: ${updatedSegment.id}). Its starred status is now: ${updatedSegment.starred}.`;
            console.error(successMessage);

            return { content: [{ type: "text" as const, text: successMessage }] };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            const action = starred ? 'star' : 'unstar';
            console.error(`Error attempting to ${action} segment ID ${segmentId}:`, errorMessage);
            return {
                content: [{ type: "text" as const, text: `❌ API Error: Failed to ${action} segment ${segmentId}. ${errorMessage}` }],
                isError: true,
            };
        }
    }
};

// Removed old registration function
/*
export function registerStarSegmentTool(server: McpServer) {
    server.tool(
        starSegment.name,
        starSegment.description,
        starSegment.inputSchema.shape,
        starSegment.execute
    );
}
*/ 