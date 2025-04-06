import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listAthleteClubs } from "../stravaClient.js";

export function registerListAthleteClubsTool(server: McpServer) {
    server.tool(
        "list-athlete-clubs",
        "Lists the clubs the authenticated athlete is a member of.",
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
                console.error("Fetching athlete clubs...");
                const clubs = await listAthleteClubs(token);
                console.error(`Successfully fetched ${clubs?.length ?? 0} clubs.`);

                if (!clubs || clubs.length === 0) {
                    return { content: [{ type: "text", text: " MNo clubs found for the athlete." }] };
                }

                // Format the clubs into a text response
                const clubText = clubs.map(club =>
                    `
👥 **${club.name}** (ID: ${club.id})
   - Sport: ${club.sport_type}
   - Members: ${club.member_count}
   - Location: ${club.city}, ${club.state}, ${club.country}
   - Private: ${club.private ? 'Yes' : 'No'}
   - URL: ${club.url || 'N/A'}
        `.trim()
                ).join("\n---\n"); // Separator for readability

                const responseText = `**Your Strava Clubs:**\n\n${clubText}`;

                return { content: [{ type: "text", text: responseText }] };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
                console.error("Error in list-athlete-clubs tool:", errorMessage);
                return {
                    content: [{ type: "text", text: `❌ API Error: ${errorMessage}` }],
                    isError: true,
                };
            }
        }
    );
} 