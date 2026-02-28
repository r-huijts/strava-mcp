// import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"; // Removed
import { z } from "zod";
import {
    getActivityById as fetchActivityById,
    StravaDetailedActivity // Type needed for formatter
} from "../stravaClient.js";
// import { formatDuration } from "../server.js"; // Removed, now local

// Zod schema for input validation
const GetActivityDetailsInputSchema = z.object({
    activityId: z.number().int().positive().describe("The unique identifier of the activity to fetch details for.")
});

type GetActivityDetailsInput = z.infer<typeof GetActivityDetailsInputSchema>;

// Helper Functions (Metric Only)
function formatDuration(seconds: number | null | undefined): string {
    if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const parts: string[] = [];
    if (hours > 0) parts.push(hours.toString().padStart(2, '0'));
    parts.push(minutes.toString().padStart(2, '0'));
    parts.push(secs.toString().padStart(2, '0'));
    return parts.join(':');
}

function formatDistance(meters: number | null | undefined): string {
    if (meters === null || meters === undefined) return 'N/A';
    return (meters / 1000).toFixed(2) + ' km';
}

function formatElevation(meters: number | null | undefined): string {
    if (meters === null || meters === undefined) return 'N/A';
    return Math.round(meters) + ' m';
}

function formatSpeed(mps: number | null | undefined): string {
    if (mps === null || mps === undefined) return 'N/A';
    return (mps * 3.6).toFixed(1) + ' km/h'; // Convert m/s to km/h
}

function formatPace(mps: number | null | undefined): string {
    if (mps === null || mps === undefined || mps <= 0) return 'N/A';
    const minutesPerKm = 1000 / (mps * 60);
    const minutes = Math.floor(minutesPerKm);
    const seconds = Math.round((minutesPerKm - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
}

// Format activity details (Metric Only)
function formatActivityDetails(activity: StravaDetailedActivity): string {
    const date = activity.start_date ?? 'N/A';
    const movingTime = formatDuration(activity.moving_time);
    const elapsedTime = formatDuration(activity.elapsed_time);
    const distance = formatDistance(activity.distance);
    const elevation = formatElevation(activity.total_elevation_gain);
    const avgSpeed = formatSpeed(activity.average_speed);
    const maxSpeed = formatSpeed(activity.max_speed);
    const avgPace = formatPace(activity.average_speed); // Calculate pace from speed

    let details = `🏃 **${activity.name}** (ID: ${activity.id})\n`;
    details += `   - Type: ${activity.type} (${activity.sport_type})\n`;
    details += `   - Date: ${date}\n`;
    details += `   - Moving Time: ${movingTime}, Elapsed Time: ${elapsedTime}\n`;
    if (activity.distance !== undefined) details += `   - Distance: ${distance}\n`;
    if (activity.total_elevation_gain !== undefined) details += `   - Elevation Gain: ${elevation}\n`;
    if (activity.average_speed !== undefined) {
        details += `   - Average Speed: ${avgSpeed}`;
        if (activity.type === 'Run') details += ` (Pace: ${avgPace})`;
        details += '\n';
    }
    if (activity.max_speed !== undefined) details += `   - Max Speed: ${maxSpeed}\n`;
    if (activity.average_cadence !== undefined && activity.average_cadence !== null) details += `   - Avg Cadence: ${activity.average_cadence.toFixed(1)}\n`;
    if (activity.average_watts !== undefined && activity.average_watts !== null) details += `   - Avg Watts: ${activity.average_watts.toFixed(1)}\n`;
    if (activity.average_heartrate !== undefined && activity.average_heartrate !== null) details += `   - Avg Heart Rate: ${activity.average_heartrate.toFixed(1)} bpm\n`;
    if (activity.max_heartrate !== undefined && activity.max_heartrate !== null) details += `   - Max Heart Rate: ${activity.max_heartrate.toFixed(0)} bpm\n`;
    if (activity.calories !== undefined) details += `   - Calories: ${activity.calories.toFixed(0)}\n`;
    if (activity.description) details += `   - Description: ${activity.description}\n`;
    if (activity.gear) details += `   - Gear: ${activity.gear.name}\n`;
    if (activity.perceived_exertion) details += `   - perceived exertion: ${activity.perceived_exertion}\n`;
    if (activity.suffer_score) details += `   - Relative effort (Training Impulse): ${activity.suffer_score}\n`
    return details;
}

// Tool definition
export const getActivityDetailsTool = {
    name: "get-activity-details",
    description: "Fetches detailed information about a specific activity using its ID.",
    inputSchema: GetActivityDetailsInputSchema,
    execute: async ({ activityId }: GetActivityDetailsInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;

        if (!token) {
            console.error("Missing STRAVA_ACCESS_TOKEN environment variable.");
            return {
                content: [{ type: "text" as const, text: "Configuration error: Missing Strava access token." }],
                isError: true
            };
        }

        try {
            console.error(`Fetching details for activity ID: ${activityId}...`);
            // Removed getAuthenticatedAthlete call
            const activity = await fetchActivityById(token, activityId);
            const activityDetailsText = formatActivityDetails(activity); // Use metric formatter

            console.error(`Successfully fetched details for activity: ${activity.name}`);
            return { content: [{ type: "text" as const, text: activityDetailsText }] };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Error fetching activity ${activityId}: ${errorMessage}`);
            // Removed call to handleApiError
            const userFriendlyMessage = errorMessage.includes("Record Not Found") || errorMessage.includes("404")
                ? `Activity with ID ${activityId} not found.`
                : `An unexpected error occurred while fetching activity details for ID ${activityId}. Details: ${errorMessage}`;
            return {
                content: [{ type: "text" as const, text: `❌ ${userFriendlyMessage}` }],
                isError: true
            };
        }
    }
};

// Removed old registration function
/*
export function registerGetActivityDetailsTool(server: McpServer) {
  server.tool(
    getActivityDetails.name,
    getActivityDetails.description,
    getActivityDetails.inputSchema.shape,
    getActivityDetails.execute
  );
}
*/ 