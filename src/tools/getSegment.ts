// import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"; // Removed
import { z } from "zod";
import {
    getSegmentById as fetchSegmentById,
    // handleApiError, // Removed unused import
    StravaDetailedSegment // Type needed for formatter
} from "../stravaClient.js";

// Input schema
const GetSegmentInputSchema = z.object({
    segmentId: z.number().int().positive().describe("The unique identifier of the segment to fetch.")
});
type GetSegmentInput = z.infer<typeof GetSegmentInputSchema>;

// Helper Functions (Metric Only)
function formatDistance(meters: number | null | undefined): string {
    if (meters === null || meters === undefined) return 'N/A';
    return (meters / 1000).toFixed(2) + ' km';
}

function formatElevation(meters: number | null | undefined): string {
    if (meters === null || meters === undefined) return 'N/A';
    return Math.round(meters) + ' m';
}

// Format segment details (Metric Only)
function formatSegmentDetails(segment: StravaDetailedSegment): string {
    const distance = formatDistance(segment.distance);
    const elevationGain = formatElevation(segment.total_elevation_gain);
    const elevationHigh = formatElevation(segment.elevation_high);
    const elevationLow = formatElevation(segment.elevation_low);

    let details = `🗺️ **Segment: ${segment.name}** (ID: ${segment.id})\n`;
    details += `   - Activity Type: ${segment.activity_type}\n`;
    details += `   - Location: ${segment.city || 'N/A'}, ${segment.state || 'N/A'}, ${segment.country || 'N/A'}\n`;
    details += `   - Distance: ${distance}\n`;
    details += `   - Avg Grade: ${segment.average_grade?.toFixed(1) ?? 'N/A'}%, Max Grade: ${segment.maximum_grade?.toFixed(1) ?? 'N/A'}%\n`;
    details += `   - Elevation: Gain ${elevationGain}, High ${elevationHigh}, Low ${elevationLow}\n`;
    details += `   - Climb Category: ${segment.climb_category ?? 'N/A'}\n`;
    details += `   - Private: ${segment.private ? 'Yes' : 'No'}\n`;
    details += `   - Starred by You: ${segment.starred ? 'Yes' : 'No'}\n`; // Assumes starred comes from auth'd user context if present
    details += `   - Total Efforts: ${segment.effort_count}, Athletes: ${segment.athlete_count}\n`;
    details += `   - Star Count: ${segment.star_count}\n`;
    details += `   - Created: ${new Date(segment.created_at).toLocaleDateString()}\n`;
    return details;
}

// Tool definition
export const getSegmentTool = {
    name: "get-segment",
    description: "Fetches detailed information about a specific segment using its ID.",
    inputSchema: GetSegmentInputSchema,
    execute: async ({ segmentId }: GetSegmentInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;

        if (!token) {
            console.error("Missing STRAVA_ACCESS_TOKEN environment variable.");
            return {
                content: [{ type: "text" as const, text: "Configuration error: Missing Strava access token." }],
                isError: true
            };
        }

        try {
            console.error(`Fetching details for segment ID: ${segmentId}...`);
            // Removed getAuthenticatedAthlete call
            const segment = await fetchSegmentById(token, segmentId);
            const segmentDetailsText = formatSegmentDetails(segment); // Use metric formatter

            console.error(`Successfully fetched details for segment: ${segment.name}`);
            return { content: [{ type: "text" as const, text: segmentDetailsText }] };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Error fetching segment ${segmentId}: ${errorMessage}`);
            // Removed call to handleApiError
            const userFriendlyMessage = errorMessage.includes("Record Not Found") || errorMessage.includes("404")
                ? `Segment with ID ${segmentId} not found.`
                : `An unexpected error occurred while fetching segment details for ID ${segmentId}. Details: ${errorMessage}`;
            return {
                content: [{ type: "text" as const, text: `❌ ${userFriendlyMessage}` }],
                isError: true
            };
        }
    }
};