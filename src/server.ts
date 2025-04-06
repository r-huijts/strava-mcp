import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getRecentActivities } from "./stravaClient.js"; // Assuming named export
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const server = new McpServer({
  name: "Strava MCP Server",
  version: "1.0.0",
});

// Define the input schema for the get-recent-activities tool
const GetRecentActivitiesInputSchema = z.object({
  perPage: z.number().int().positive().optional().default(30),
});

server.tool(
  "get-recent-activities",
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
      // Log informational messages to stderr
      console.error(`Fetching ${perPage} recent activities...`);
      const activities = await getRecentActivities(token, perPage);
      console.error(`Successfully fetched ${activities.length} activities.`);

      if (activities.length === 0) {
           return { content: [{ type: "text", text: " MNo recent activities found." }] };
      }

      // Format the activities into a user-friendly text response
      const text = activities.map(activity =>
        `🏃 ${activity.name} — ${activity.distance}m on ${new Date(activity.start_date).toLocaleDateString()}`
      ).join("\n");

      return { content: [{ type: "text", text }] };
    } catch (error) {
       console.error("Error fetching Strava activities:", error); // Already using console.error
      // Forward the error message from stravaClient
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      return {
        content: [{ type: "text", text: `❌ API Error: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

async function startServer() {
  try {
    // Log startup messages to stderr
    console.error("Starting Strava MCP Server...");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Strava MCP Server connected via Stdio.");
  } catch (error) {
      console.error("Failed to start server:", error); // Already using console.error
      process.exit(1);
  }
}

startServer(); 