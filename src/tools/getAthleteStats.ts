import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getAuthenticatedAthlete,
  getAthleteStats,
  StravaStats
} from "../stravaClient.js";
import { formatDuration } from "../server.js"; // Assuming formatDuration is kept in server.ts for now

// Helper Function (copied from server.ts, could be moved to a shared utils.ts)
function formatStats(stats: StravaStats, units: 'feet' | 'meters'): string {
  const distanceFactor = units === 'feet' ? 0.000621371 : 0.001; // meters to miles or km
  const distanceUnit = units === 'feet' ? 'mi' : 'km';
  const elevationFactor = units === 'feet' ? 3.28084 : 1; // meters to feet or meters
  const elevationUnit = units === 'feet' ? 'ft' : 'm';

  // Helper nested function to avoid repetition
  const formatTotals = (totals: any, type: string, period: string) => {
    if (!totals || totals.count === 0) return `  - ${period} ${type}: No data`;
    const distance = (totals.distance * distanceFactor).toFixed(1);
    const movingTime = formatDuration(totals.moving_time);
    const elevation = (totals.elevation_gain * elevationFactor).toFixed(0);
    return `  - ${period} ${type}: ${totals.count} activities, ${distance} ${distanceUnit}, ${movingTime}, ${elevation} ${elevationUnit} elev gain`;
  };

  const statsParts = [
    `📊 **Activity Stats**`,
    "*Recent Totals (Last 4 Weeks):*",
    formatTotals(stats.recent_ride_totals, "Rides", "Recent"),
    formatTotals(stats.recent_run_totals, "Runs", "Recent"),
    formatTotals(stats.recent_swim_totals, "Swims", "Recent"),
    "*Year-to-Date Totals:*",
    formatTotals(stats.ytd_ride_totals, "Rides", "YTD"),
    formatTotals(stats.ytd_run_totals, "Runs", "YTD"),
    formatTotals(stats.ytd_swim_totals, "Swims", "YTD"),
    "*All-Time Totals:*",
    formatTotals(stats.all_ride_totals, "Rides", "All-Time"),
    formatTotals(stats.all_run_totals, "Runs", "All-Time"),
    formatTotals(stats.all_swim_totals, "Swims", "All-Time"),
    "*Records:*",
    `  - Longest Ride: ${stats.biggest_ride_distance ? (stats.biggest_ride_distance * distanceFactor).toFixed(1) + ` ${distanceUnit}` : 'N/A'}`, // Added nullish check
    `  - Biggest Climb (Elevation): ${stats.biggest_climb_elevation_gain ? (stats.biggest_climb_elevation_gain * elevationFactor).toFixed(0) + ` ${elevationUnit}` : 'N/A'}` // Added nullish check
  ];

  return statsParts.join("\n");
}

export function registerGetAthleteStatsTool(server: McpServer) {
  server.tool(
    "get-athlete-stats",
    "Fetches the activity statistics (recent, YTD, all-time) for the authenticated athlete.",
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
        console.error("Fetching athlete ID for stats...");
        const athlete = await getAuthenticatedAthlete(token);
        const athleteId = athlete.id;
        console.error(`Fetching stats for athlete ID: ${athleteId}...`);
        const stats = await getAthleteStats(token, athleteId);
        console.error(`Successfully fetched stats for athlete ${athlete.firstname} ${athlete.lastname}.`);

        const statsText = formatStats(stats, athlete.measurement_preference);

        return { content: [{ type: "text", text: statsText }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error("Error in get-athlete-stats tool:", errorMessage);
        return {
          content: [{ type: "text", text: `❌ API Error: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );
} 