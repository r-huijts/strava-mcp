// import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"; // Removed
import { z } from "zod";
import {
    getAuthenticatedAthlete,
    listAthleteRoutes as fetchRoutes, // Renamed import
    StravaRoute
} from "../stravaClient.js";
// import { formatDuration } from "../server.js"; // Removed, now local

// Input schema for listing athlete routes (includes pagination)
const ListAthleteRoutesInputSchema = z.object({
    page: z.number().int().positive().optional()
        .describe("Page number for pagination (optional)."),
    perPage: z.number().int().positive().optional().default(30)
        .describe("Number of routes per page (default: 30, optional)."),
});

type ListAthleteRoutesInput = z.infer<typeof ListAthleteRoutesInputSchema>;

// Helper functions (kept local)
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
export const listAthleteRoutes = {
    name: "list-athlete-routes",
    description: "Lists the routes created by the authenticated athlete, with pagination.",
    inputSchema: ListAthleteRoutesInputSchema,
    execute: async ({ page, perPage }: ListAthleteRoutesInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;

        if (!token || token === 'YOUR_STRAVA_ACCESS_TOKEN_HERE') {
            console.error("Missing or placeholder STRAVA_ACCESS_TOKEN in .env");
            return {
                content: [{ type: "text" as const, text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing or not set in the .env file." }],
                isError: true,
            };
        }

        try {
            console.error("Fetching athlete routes...");
            const athlete = await getAuthenticatedAthlete(token); // Need ID and units
            const routes = await fetchRoutes(token, athlete.id, page, perPage);
            console.error(`Successfully fetched ${routes?.length ?? 0} routes for athlete ${athlete.id}.`);

            if (!routes || routes.length === 0) {
                return { content: [{ type: "text" as const, text: " MNo routes found for the athlete." }] };
            }

            const routeItems = routes.map(route => {
                const text = formatRouteSummary(route, athlete.measurement_preference);
                const item: { type: "text", text: string } = { type: "text" as const, text };
                return item;
            });

            const responseText = `**Your Strava Routes:**\n\n${routeItems.map(item => item.text).join("\n---\n")}`;

            return { content: [{ type: "text" as const, text: responseText }] };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            console.error("Error in list-athlete-routes tool:", errorMessage);
            return {
                content: [{ type: "text" as const, text: `❌ API Error: ${errorMessage}` }],
                isError: true,
            };
        }
    }
};

// Removed old registration function
/*
export function registerListAthleteRoutesTool(server: McpServer) {
    server.tool(
        listAthleteRoutes.name,
        listAthleteRoutes.description,
        listAthleteRoutes.inputSchema.shape,
        listAthleteRoutes.execute
    );
}
*/ 