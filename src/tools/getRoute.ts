import { z } from "zod";
import { getRouteById /*, handleApiError */ } from "../stravaClient.js"; // Removed handleApiError import
import { formatRouteSummary } from "../formatters.js"; // Import shared formatter

// Zod schema for input validation
const GetRouteInputSchema = z.object({
    routeId: z.string()
        .regex(/^\d+$/, "Route ID must contain only digits")
        .refine(val => val.length > 0, "Route ID cannot be empty")
        .describe("The unique identifier of the route to fetch.")});

type GetRouteInput = z.infer<typeof GetRouteInputSchema>;

// Tool definition
export const getRouteTool = {
    name: "get-route",
    description: "Fetches detailed information about a specific route using its ID.",
    inputSchema: GetRouteInputSchema,
    execute: async (input: GetRouteInput) => {
        const { routeId } = input;
        const token = process.env.STRAVA_ACCESS_TOKEN;

        if (!token) {
            console.error("Missing STRAVA_ACCESS_TOKEN environment variable.");
            return {
                content: [{ type: "text" as const, text: "Configuration error: Missing Strava access token." }],
                isError: true
            };
        }

        try {
            console.error(`Fetching route details for ID: ${routeId}...`);
            const route = await getRouteById(token, routeId);
            const summary = formatRouteSummary(route); // Call shared formatter without units

            console.error(`Successfully fetched route ${routeId}.`);
            return { content: [{ type: "text" as const, text: summary }] };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Error fetching route ${routeId}: ${errorMessage}`);
            const userFriendlyMessage = errorMessage.includes("Record Not Found") || errorMessage.includes("404")
                ? `Route with ID ${routeId} not found.`
                : `An unexpected error occurred while fetching route ${routeId}. Details: ${errorMessage}`;
            return {
                content: [{ type: "text" as const, text: `❌ ${userFriendlyMessage}` }],
                isError: true
            };
        }
    }
};

// Removed local formatRouteSummary function

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