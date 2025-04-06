import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
    getAuthenticatedAthlete,
    exploreSegments,
    StravaExplorerResponse
} from "../stravaClient.js";

const ExploreSegmentsInputSchema = z.object({
    bounds: z.string()
        .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, "Bounds must be in the format: south_west_lat,south_west_lng,north_east_lat,north_east_lng")
        .describe("The geographical area to search, specified as a comma-separated string: south_west_lat,south_west_lng,north_east_lat,north_east_lng"),
    activityType: z.enum(["running", "riding"])
        .optional()
        .describe("Filter segments by activity type (optional: 'running' or 'riding')."),
    minCat: z.number().int().min(0).max(5).optional()
        .describe("Filter by minimum climb category (optional, 0-5). Requires riding activityType."),
    maxCat: z.number().int().min(0).max(5).optional()
        .describe("Filter by maximum climb category (optional, 0-5). Requires riding activityType."),
});

export function registerExploreSegmentsTool(server: McpServer) {
    server.tool(
        "explore-segments",
        "Searches for popular segments within a given geographical area.",
        ExploreSegmentsInputSchema.shape,
        async (params, _extra) => {
            const { bounds, activityType, minCat, maxCat } = params;
            const token = process.env.STRAVA_ACCESS_TOKEN;

            if (!token || token === 'YOUR_STRAVA_ACCESS_TOKEN_HERE') {
                console.error("Missing or placeholder STRAVA_ACCESS_TOKEN in .env");
                return {
                    content: [{ type: "text", text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing or not set in the .env file." }],
                    isError: true,
                };
            }
            if ((minCat !== undefined || maxCat !== undefined) && activityType !== 'riding') {
                return {
                    content: [{ type: "text", text: "❌ Input Error: Climb category filters (minCat, maxCat) require activityType to be 'riding'." }],
                    isError: true,
                };
            }

            try {
                console.error(`Exploring segments within bounds: ${bounds}...`);
                // Need athlete preference for formatting results
                const athlete = await getAuthenticatedAthlete(token);
                const response: StravaExplorerResponse = await exploreSegments(token, bounds, activityType, minCat, maxCat);
                console.error(`Found ${response.segments?.length ?? 0} segments.`);

                if (!response.segments || response.segments.length === 0) {
                    return { content: [{ type: "text", text: " MNo segments found in the specified area with the given filters." }] };
                }

                const distanceFactor = athlete.measurement_preference === 'feet' ? 0.000621371 : 0.001;
                const distanceUnit = athlete.measurement_preference === 'feet' ? 'mi' : 'km';
                const elevationFactor = athlete.measurement_preference === 'feet' ? 3.28084 : 1;
                const elevationUnit = athlete.measurement_preference === 'feet' ? 'ft' : 'm';

                // Format the segments
                const segmentText = response.segments.map(segment => {
                    const distance = (segment.distance * distanceFactor).toFixed(2);
                    const elevDifference = (segment.elev_difference * elevationFactor).toFixed(0);
                    return `
🗺️ **${segment.name}** (ID: ${segment.id})
   - Climb: Cat ${segment.climb_category_desc} (${segment.climb_category})
   - Distance: ${distance} ${distanceUnit}
   - Avg Grade: ${segment.avg_grade}%
   - Elev Difference: ${elevDifference} ${elevationUnit}
   - Starred: ${segment.starred ? 'Yes' : 'No'}
                `.trim();
                }).join("\n---\n");

                const responseText = `**Found Segments:**\n\n${segmentText}`;

                return { content: [{ type: "text", text: responseText }] };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
                console.error("Error in explore-segments tool:", errorMessage);
                return {
                    content: [{ type: "text", text: `❌ API Error: ${errorMessage}` }],
                    isError: true,
                };
            }
        }
    );
} 