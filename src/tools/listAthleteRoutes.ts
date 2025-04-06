// import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"; // Removed
import { z } from "zod";
import {
    listAthleteRoutes as fetchAthleteRoutes,
    StravaRoute,
    // StravaRoute is needed for the formatter
} from "../stravaClient.js";
// Remove the imported formatter since we're defining our own locally
// import { formatRouteSummary } from "../formatters.js";

// Define input schema with zod
const ListAthleteRoutesInputSchema = z.object({
    page: z.number().int().positive().optional().default(1).describe("Page number for pagination"),
    perPage: z.number().int().positive().min(1).max(50).optional().default(20).describe("Number of routes per page (max 50)"),
});

// Export the type for use in the execute function
type ListAthleteRoutesInput = z.infer<typeof ListAthleteRoutesInputSchema>;

// Function to format a route for display
function formatRouteSummary(route: StravaRoute): string {
    const distance = route.distance ? `${(route.distance / 1000).toFixed(1)} km` : 'N/A';
    const elevation = route.elevation_gain ? `${route.elevation_gain.toFixed(0)} m` : 'N/A';
    
    return `🗺️ **${route.name}** (ID: ${route.id})
   - Distance: ${distance}
   - Elevation: ${elevation}
   - Created: ${new Date(route.created_at).toLocaleDateString()}
   - Type: ${route.type === 1 ? 'Ride' : route.type === 2 ? 'Run' : 'Other'}`;
}

// Tool definition
export const listAthleteRoutesTool = {
    name: "list-athlete-routes",
    description: "Lists the routes created by the authenticated athlete, with pagination.",
    inputSchema: ListAthleteRoutesInputSchema,
    execute: async ({ page = 1, perPage = 20 }: ListAthleteRoutesInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;
        
        if (!token) {
            console.error("Missing STRAVA_ACCESS_TOKEN in .env");
            return {
                content: [{ type: "text" as const, text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing or not set in the .env file." }],
                isError: true
            };
        }
        
        try {
            console.error(`Fetching routes (page ${page}, per_page: ${perPage})...`);
            
            const routes = await fetchAthleteRoutes(token, page, perPage);
            
            if (!routes || routes.length === 0) {
                console.error(`No routes found for athlete.`);
                return { content: [{ type: "text" as const, text: "No routes found for the athlete." }] };
            }
            
            console.error(`Successfully fetched ${routes.length} routes.`);
            const summaries = routes.map(route => formatRouteSummary(route));
            const responseText = `**Athlete Routes (Page ${page}):**\n\n${summaries.join("\n")}`;
            
            return { content: [{ type: "text" as const, text: responseText }] };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Error listing athlete routes (page ${page}, perPage: ${perPage}): ${errorMessage}`);
            // Removed call to handleApiError and its retry logic
            // Note: 404 is less likely for a list endpoint like this
            const userFriendlyMessage = `An unexpected error occurred while listing athlete routes. Details: ${errorMessage}`;
            return {
                content: [{ type: "text" as const, text: `❌ ${userFriendlyMessage}` }],
                isError: true
            };
        }
    }
};

// Removed local formatRouteSummary and formatDuration functions

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