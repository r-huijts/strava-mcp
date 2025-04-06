import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAuthenticatedAthlete, listStarredSegments } from "../stravaClient.js";

export function registerListStarredSegmentsTool(server: McpServer) {
    server.tool(
        "list-starred-segments",
        "Lists the segments starred by the authenticated athlete.",
        async (_extra) => {
            const token = process.env.STRAVA_ACCESS_TOKEN;

            if (!token || token === 'YOUR_STRAVA_ACCESS_TOKEN_HERE') {
                console.error("Missing or placeholder STRAVA_ACCESS_TOKEN in .env");
                return {
                    content: [{ type: "text", text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing or not set in the .env file." }],
                    isError: true,
                };
            }

            try {
                console.error("Fetching starred segments...");
                // Need athlete measurement preference for formatting distance
                const athlete = await getAuthenticatedAthlete(token);
                const segments = await listStarredSegments(token);
                console.error(`Successfully fetched ${segments?.length ?? 0} starred segments.`);

                if (!segments || segments.length === 0) {
                    return { content: [{ type: "text", text: " MNo starred segments found." }] };
                }

                const distanceFactor = athlete.measurement_preference === 'feet' ? 0.000621371 : 0.001;
                const distanceUnit = athlete.measurement_preference === 'feet' ? 'mi' : 'km';

                // Format the segments into a text response
                const segmentText = segments.map(segment => {
                    const location = [segment.city, segment.state, segment.country].filter(Boolean).join(", ") || 'N/A';
                    const distance = (segment.distance * distanceFactor).toFixed(2);
                    return `
⭐ **${segment.name}** (ID: ${segment.id})
   - Activity Type: ${segment.activity_type}
   - Distance: ${distance} ${distanceUnit}
   - Avg Grade: ${segment.average_grade}%
   - Location: ${location}
   - Private: ${segment.private ? 'Yes' : 'No'}
          `.trim();
                }).join("\n---\n");

                const responseText = `**Your Starred Segments:**\n\n${segmentText}`;

                return { content: [{ type: "text", text: responseText }] };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
                console.error("Error in list-starred-segments tool:", errorMessage);
                return {
                    content: [{ type: "text", text: `❌ API Error: ${errorMessage}` }],
                    isError: true,
                };
            }
        }
    );
} 