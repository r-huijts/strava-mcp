// import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"; // Removed
import { z } from "zod";
import {
    getAuthenticatedAthlete,
    getRouteById as fetchRouteById, // Renamed import
    StravaRoute // Need the type for the formatter
} from "../stravaClient.js";
// Reuse formatter - copy locally
// TODO: Move formatters to utils

const GetRouteInputSchema = z.object({
    routeId: z.number().int().positive().describe("The unique identifier of the route to fetch."),
});

type GetRouteInput = z.infer<typeof GetRouteInputSchema>;

// Helper functions (copied locally)
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

function formatRouteSummary(route: StravaRoute, units: 'feet' | 'meters'): string {
    const distanceFactor = units === 'feet' ? 0.000621371 : 0.001;
    const distanceUnit = units === 'feet' ? 'mi' : 'km';
    const elevationFactor = units === 'feet' ? 3.28084 : 1;
    const elevationUnit = units === 'feet' ? 'ft' : 'm';

    const routeType = route.type === 1 ? 'Ride' : (route.type === 2 ? 'Run' : 'Other');
    const subTypeMap: { [key: number]: string } = { 1: 'Road', 2: 'MTB', 3: 'CX', 4: 'Trail', 5: 'Mixed' };
    const routeSubType = subTypeMap[route.sub_type] || 'Unknown';

    const parts = [
        `📍 **${route.name}** (ID: ${route.id})`,
        `   - Type: ${routeType} (${routeSubType})`,
        `   - Distance: ${(route.distance * distanceFactor).toFixed(2)} ${distanceUnit}`,
        `   - Elevation Gain: ${route.elevation_gain ? (route.elevation_gain * elevationFactor).toFixed(0) + ` ${elevationUnit}` : 'N/A'}`,
        `   - Estimated Time: ${route.estimated_moving_time ? formatDuration(route.estimated_moving_time) : 'N/A'}`,
        `   - Starred: ${route.starred ? 'Yes' : 'No'}`,
        `   - Private: ${route.private ? 'Yes' : 'No'}`,
        `   - Created: ${new Date(route.created_at).toLocaleDateString()}`,
    ];
    return parts.join('\n');
}

// Export the tool definition directly
export const getRoute = {
    name: "get-route",
    description: "Fetches detailed information about a specific route using its ID.",
    inputSchema: GetRouteInputSchema,
    execute: async ({ routeId }: GetRouteInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;

        if (!token || token === 'YOUR_STRAVA_ACCESS_TOKEN_HERE') {
            console.error("Missing or placeholder STRAVA_ACCESS_TOKEN in .env");
            return {
                content: [{ type: "text" as const, text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing or not set in the .env file." }],
                isError: true,
            };
        }

        try {
            console.error(`Fetching details for route ID: ${routeId}...`);
            const athlete = await getAuthenticatedAthlete(token); // Need units
            const route = await fetchRouteById(token, routeId);
            console.error(`Successfully fetched details for route: ${route.name}`);

            const routeDetailsText = formatRouteSummary(route, athlete.measurement_preference);
            const segmentsCount = route.segments?.length ?? 0;
            const responseText = `**Route Details:**\n\n${routeDetailsText}\n   - Description: ${route.description || 'None'}\n   - Number of Segments: ${segmentsCount}`;

            return { content: [{ type: "text" as const, text: responseText }] };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            console.error(`Error in get-route tool for ID ${routeId}:`, errorMessage);
            return {
                content: [{ type: "text" as const, text: `❌ API Error: ${errorMessage}` }],
                isError: true,
            };
        }
    }
};

// Removed old registration function
/*
export function registerGetRouteTool(server: McpServer) {
    server.tool(
        getRoute.name,
        getRoute.description,
        getRoute.inputSchema.shape,
        getRoute.execute
    );
}
*/ 