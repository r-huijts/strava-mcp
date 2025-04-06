// import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"; // Removed
import { z } from "zod";
import {
    getAuthenticatedAthlete,
    getSegmentById as fetchSegmentById, // Renamed import
    StravaDetailedSegment
} from "../stravaClient.js";

const GetSegmentInputSchema = z.object({
    segmentId: z.number().int().positive().describe("The unique identifier of the segment to fetch."),
});

type GetSegmentInput = z.infer<typeof GetSegmentInputSchema>;

// Helper Function (kept local)
function formatSegmentDetails(segment: StravaDetailedSegment, units: 'feet' | 'meters'): string {
    const distanceFactor = units === 'feet' ? 0.000621371 : 0.001;
    const distanceUnit = units === 'feet' ? 'mi' : 'km';
    const elevationFactor = units === 'feet' ? 3.28084 : 1;
    const elevationUnit = units === 'feet' ? 'ft' : 'm';

    const location = [segment.city, segment.state, segment.country].filter(Boolean).join(", ") || 'N/A';
    const distance = (segment.distance * distanceFactor).toFixed(2);
    const totalElevationGain = segment.total_elevation_gain ? (segment.total_elevation_gain * elevationFactor).toFixed(0) + ` ${elevationUnit}` : 'N/A';
    const elevationHigh = segment.elevation_high ? (segment.elevation_high * elevationFactor).toFixed(0) + ` ${elevationUnit}` : 'N/A';
    const elevationLow = segment.elevation_low ? (segment.elevation_low * elevationFactor).toFixed(0) + ` ${elevationUnit}` : 'N/A';

    const parts = [
        ` S**Segment: ${segment.name}** (ID: ${segment.id})`,
        `   - Activity Type: ${segment.activity_type}`,
        `   - Distance: ${distance} ${distanceUnit}`,
        `   - Avg Grade: ${segment.average_grade}%`,
        `   - Max Grade: ${segment.maximum_grade}%`,
        `   - Total Elev Gain: ${totalElevationGain}`,
        `   - Elevation High: ${elevationHigh}`,
        `   - Elevation Low: ${elevationLow}`,
        `   - Climb Category: ${segment.climb_category ?? 'N/A'}`,
        `   - Location: ${location}`,
        `   - Private: ${segment.private ? 'Yes' : 'No'}`,
        `   - Hazardous: ${segment.hazardous ? 'Yes' : 'No'}`,
        `   - Starred by You: ${segment.starred ? 'Yes' : 'No'}`,
        `   - Total Stars: ${segment.star_count ?? 0}`,
        `   - Total Efforts: ${segment.effort_count ?? 0}`,
        `   - Total Athletes: ${segment.athlete_count ?? 0}`,
        `   - Created: ${new Date(segment.created_at).toLocaleDateString()}`,
        `   - Updated: ${new Date(segment.updated_at).toLocaleDateString()}`,
    ];

    return parts.filter(part => part !== '').join('\n');
}

// Export the tool definition directly
export const getSegment = {
    name: "get-segment",
    description: "Fetches detailed information about a specific segment using its ID.",
    inputSchema: GetSegmentInputSchema,
    execute: async ({ segmentId }: GetSegmentInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;

        if (!token || token === 'YOUR_STRAVA_ACCESS_TOKEN_HERE') {
            console.error("Missing or placeholder STRAVA_ACCESS_TOKEN in .env");
            return {
                content: [{ type: "text" as const, text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing or not set in the .env file." }],
                isError: true,
            };
        }

        try {
            console.error(`Fetching details for segment ID: ${segmentId}...`);
            const athlete = await getAuthenticatedAthlete(token); // For measurement preference
            const segment = await fetchSegmentById(token, segmentId);
            console.error(`Successfully fetched details for segment: ${segment.name}`);

            const segmentDetailsText = formatSegmentDetails(segment, athlete.measurement_preference);

            return { content: [{ type: "text" as const, text: segmentDetailsText }] };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            console.error(`Error in get-segment tool for ID ${segmentId}:`, errorMessage);
            return {
                content: [{ type: "text" as const, text: `❌ API Error: ${errorMessage}` }],
                isError: true,
            };
        }
    }
};

// Removed old registration function
/*
export function registerGetSegmentTool(server: McpServer) {
    server.tool(
        getSegment.name,
        getSegment.description,
        getSegment.inputSchema.shape,
        getSegment.execute
    );
}
*/ 