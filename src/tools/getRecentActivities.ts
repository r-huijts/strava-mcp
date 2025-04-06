import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getRecentActivities } from "../stravaClient.js";

const GetRecentActivitiesInputSchema = z.object({
  perPage: z.number().int().positive().optional().default(30).describe("Number of activities to retrieve (default: 30)"),
});

export function registerGetRecentActivitiesTool(server: McpServer) {
  server.tool(
    "get-recent-activities",
    "Fetches the most recent activities for the authenticated athlete.",
    GetRecentActivitiesInputSchema.shape,
    async (params, _extra) => {
      const { perPage } = params;
      const token = process.env.STRAVA_ACCESS_TOKEN;

      if (!token || token === 'YOUR_STRAVA_ACCESS_TOKEN_HERE') {
        console.error("Missing or placeholder STRAVA_ACCESS_TOKEN in .env");
        return {
          content: [{ type: "text", text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing or not set in the .env file." }],
          isError: true,
        };
      }

      try {
        console.error(`Fetching ${perPage} recent activities...`);
        const activities = await getRecentActivities(token, perPage);
        console.error(`Successfully fetched ${activities?.length ?? 0} activities.`);

        if (!activities || activities.length === 0) {
          return { content: [{ type: "text", text: " MNo recent activities found." }] };
        }

        // Include activity ID in the output
        const text = activities.map(activity => {
          const dateStr = activity.start_date ? new Date(activity.start_date).toLocaleDateString() : 'N/A';
          const distanceStr = activity.distance ? `${activity.distance}m` : 'N/A';
          // Potentially add duration if available in summary activity schema
          // const durationStr = activity.moving_time ? formatDuration(activity.moving_time) : 'N/A';
          return `🏃 ${activity.name} (ID: ${activity.id ?? 'N/A'}) — ${distanceStr} on ${dateStr}`;
        }).join("\n");

        return { content: [{ type: "text", text }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error("Error in get-recent-activities tool:", errorMessage);
        return {
          content: [{ type: "text", text: `❌ API Error: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );
} 