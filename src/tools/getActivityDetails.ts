import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getAuthenticatedAthlete,
  getActivityById,
  StravaDetailedActivity
} from "../stravaClient.js";
import { formatDuration } from "../server.js"; // Assuming formatDuration is kept in server.ts for now

const GetActivityDetailsInputSchema = z.object({
  activityId: z.number().int().positive().describe("The unique identifier of the activity to fetch details for."),
});

// Helper Function (copied from server.ts, could be moved to a shared utils.ts)
function formatActivityDetails(activity: StravaDetailedActivity, units: 'feet' | 'meters'): string {
  const distanceFactor = units === 'feet' ? 0.000621371 : 0.001;
  const distanceUnit = units === 'feet' ? 'mi' : 'km';
  const elevationFactor = units === 'feet' ? 3.28084 : 1;
  const elevationUnit = units === 'feet' ? 'ft' : 'm';
  const speedFactor = units === 'feet' ? 2.23694 : 3.6; // m/s to mph or km/h
  const speedUnit = units === 'feet' ? 'mph' : 'km/h';

  const parts = [
    `📝 **Activity: ${activity.name}** (ID: ${activity.id})`,
    `   - Type: ${activity.sport_type} (${activity.type})`,
    `   - Date: ${activity.start_date_local ? new Date(activity.start_date_local).toLocaleString() : 'N/A'} (${activity.timezone || 'N/A'})`,
    `   - Description: ${activity.description || 'None'}`,
    `   - Distance: ${activity.distance ? (activity.distance * distanceFactor).toFixed(2) + ` ${distanceUnit}` : 'N/A'}`,
    `   - Moving Time: ${activity.moving_time ? formatDuration(activity.moving_time) : 'N/A'}`,
    `   - Elapsed Time: ${activity.elapsed_time ? formatDuration(activity.elapsed_time) : 'N/A'}`,
    `   - Elevation Gain: ${activity.total_elevation_gain ? (activity.total_elevation_gain * elevationFactor).toFixed(0) + ` ${elevationUnit}` : 'N/A'}`,
    `   - Average Speed: ${activity.average_speed ? (activity.average_speed * speedFactor).toFixed(1) + ` ${speedUnit}` : 'N/A'}`,
    `   - Max Speed: ${activity.max_speed ? (activity.max_speed * speedFactor).toFixed(1) + ` ${speedUnit}` : 'N/A'}`,
    `   - Calories: ${activity.calories ? activity.calories.toFixed(0) : 'N/A'}`,
    activity.has_heartrate ? `   - Avg Heart Rate: ${activity.average_heartrate?.toFixed(0) ?? 'N/A'} bpm` : '   - Heart Rate: No data',
    activity.has_heartrate ? `   - Max Heart Rate: ${activity.max_heartrate?.toFixed(0) ?? 'N/A'} bpm` : '',
    activity.average_cadence ? `   - Avg Cadence: ${activity.average_cadence.toFixed(1)}` : '',
    activity.average_temp ? `   - Avg Temp: ${activity.average_temp}°C` : '',
    activity.average_watts ? `   - Avg Watts: ${activity.average_watts.toFixed(0)} W ${activity.device_watts ? '(Device)' : '(Estimated)'}` : '',
    `   - Kudos: ${activity.kudos_count ?? 0}`,
    `   - Comments: ${activity.comment_count ?? 0}`,
    `   - Achievements: ${activity.achievement_count ?? 0}`,
    `   - Gear: ${activity.gear?.name || 'None'}`,
    `   - Device: ${activity.device_name || 'N/A'}`,
    `   - Manual: ${activity.manual ? 'Yes' : 'No'}`,
    `   - Trainer: ${activity.trainer ? 'Yes' : 'No'}`,
    `   - Commute: ${activity.commute ? 'Yes' : 'No'}`,
    `   - Private: ${activity.private ? 'Yes' : 'No'}`,
  ];

  return parts.filter(part => part !== '').join('\n');
}

export function registerGetActivityDetailsTool(server: McpServer) {
  server.tool(
    "get-activity-details",
    "Fetches detailed information about a specific activity using its ID.",
    GetActivityDetailsInputSchema.shape,
    async (params, _extra) => {
      const { activityId } = params;
      const token = process.env.STRAVA_ACCESS_TOKEN;

      if (!token || token === 'YOUR_STRAVA_ACCESS_TOKEN_HERE') {
        console.error("Missing or placeholder STRAVA_ACCESS_TOKEN in .env");
        return {
          content: [{ type: "text", text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing or not set in the .env file." }],
          isError: true,
        };
      }

      try {
        console.error(`Fetching details for activity ID: ${activityId}...`);
        // Need athlete's measurement preference for formatting, fetch it first
        const athlete = await getAuthenticatedAthlete(token);
        console.error(`Fetching activity details for ID: ${activityId}...`);
        const activityDetails = await getActivityById(token, activityId);
        console.error(`Successfully fetched details for activity: ${activityDetails.name}`);

        const detailsText = formatActivityDetails(activityDetails, athlete.measurement_preference);

        return { content: [{ type: "text", text: detailsText }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error(`Error in get-activity-details tool for ID ${activityId}:`, errorMessage);
        return {
          content: [{ type: "text", text: `❌ API Error: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );
} 