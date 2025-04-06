import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAuthenticatedAthlete } from "../stravaClient.js";

export function registerGetAthleteProfileTool(server: McpServer) {
  server.tool(
    "get-athlete-profile",
    "Fetches the profile information for the authenticated athlete.",
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
        console.error("Fetching athlete profile...");
        const athlete = await getAuthenticatedAthlete(token);
        console.error(`Successfully fetched profile for ${athlete.firstname} ${athlete.lastname} (ID: ${athlete.id}).`);

        const profileParts = [
          `👤 **Profile for ${athlete.firstname} ${athlete.lastname}** (ID: ${athlete.id})`,
          `   - Username: ${athlete.username || 'N/A'}`, // Added check for null
          `   - Location: ${[athlete.city, athlete.state, athlete.country].filter(Boolean).join(", ") || 'N/A'}`, // Filter truthy values
          `   - Sex: ${athlete.sex || 'N/A'}`,
          `   - Weight: ${athlete.weight ? `${athlete.weight} kg` : 'N/A'}`,
          `   - Measurement Units: ${athlete.measurement_preference}`,
          `   - Strava Summit Member: ${athlete.summit ? 'Yes' : 'No'}`,
          `   - Profile Image (Medium): ${athlete.profile_medium}`,
          `   - Joined Strava: ${athlete.created_at ? new Date(athlete.created_at).toLocaleDateString() : 'N/A'}`,
          `   - Last Updated: ${athlete.updated_at ? new Date(athlete.updated_at).toLocaleDateString() : 'N/A'}`, // Added check for null/undefined
        ];

        return { content: [{ type: "text", text: profileParts.join("\n") }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error("Error in get-athlete-profile tool:", errorMessage);
        return {
          content: [{ type: "text", text: `❌ API Error: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );
} 