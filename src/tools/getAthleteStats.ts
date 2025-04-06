// import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"; // Removed
import {
  getAuthenticatedAthlete,
  getAthleteStats as fetchStats, // Renamed import
  StravaStats
} from "../stravaClient.js";
// formatDuration is now local or in utils, not imported from server.ts

// Helper Function for formatting stats (kept local to this tool)
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

function formatStats(stats: StravaStats, units: 'feet' | 'meters'): string {
  const distanceFactor = units === 'feet' ? 0.000621371 : 0.001;
  const distanceUnit = units === 'feet' ? 'mi' : 'km';
  const elevationFactor = units === 'feet' ? 3.28084 : 1;
  const elevationUnit = units === 'feet' ? 'ft' : 'm';

  const formatTotals = (totals: any, type: string, period: string) => {
    if (!totals || totals.count === 0) return `  - ${period} ${type}: No data`;
    const distance = (totals.distance * distanceFactor).toFixed(1);
    const movingTime = formatDuration(totals.moving_time); // Use local formatDuration
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
    `  - Longest Ride: ${stats.biggest_ride_distance ? (stats.biggest_ride_distance * distanceFactor).toFixed(1) + ` ${distanceUnit}` : 'N/A'}`,
    `  - Biggest Climb (Elevation): ${stats.biggest_climb_elevation_gain ? (stats.biggest_climb_elevation_gain * elevationFactor).toFixed(0) + ` ${elevationUnit}` : 'N/A'}`
  ];

  return statsParts.join("\n");
}

// Export the tool definition directly
export const getAthleteStats = {
    name: "get-athlete-stats",
    description: "Fetches the activity statistics (recent, YTD, all-time) for the authenticated athlete.",
    inputSchema: undefined, // Use undefined or {} as per SDK expectation
    execute: async () => {
      const token = process.env.STRAVA_ACCESS_TOKEN;

      if (!token || token === 'YOUR_STRAVA_ACCESS_TOKEN_HERE') {
        console.error("Missing or placeholder STRAVA_ACCESS_TOKEN in .env");
        // Strict return structure
        return {
          content: [{ type: "text" as const, text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing or not set in the .env file." }],
          isError: true,
        };
      }

      try {
        console.error("Fetching athlete ID for stats...");
        const athlete = await getAuthenticatedAthlete(token);
        const athleteId = athlete.id;
        console.error(`Fetching stats for athlete ID: ${athleteId}...`);
        const stats = await fetchStats(token, athleteId);
        console.error(`Successfully fetched stats for athlete ${athlete.firstname} ${athlete.lastname}.`);

        const statsText = formatStats(stats, athlete.measurement_preference);

        // Strict return structure
        return { content: [{ type: "text" as const, text: statsText }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error("Error in get-athlete-stats tool:", errorMessage);
        // Strict return structure
        return {
          content: [{ type: "text" as const, text: `❌ API Error: ${errorMessage}` }],
          isError: true,
        };
      }
    }
};

// Removed old registration function
/*
export function registerGetAthleteStatsTool(server: McpServer) {
    server.tool(
        getAthleteStats.name,
        getAthleteStats.description,
        getAthleteStats.execute // No input schema
    );
}
*/ 