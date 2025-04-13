import { z } from "zod";
import { getActivityLaps as getActivityLapsClient, StravaLap } from "../stravaClient.js"; // Import client function and type
import { formatDuration } from "../server.js"; // Import helper

const name = "get-activity-laps";

const description = `
Retrieves the laps recorded for a specific Strava activity.

Use Cases:
- Analyze performance variations across different segments (laps) of an activity.
- Compare lap times, speeds, heart rates, or power outputs.
- Understand how an activity was structured (e.g., interval training).

Parameters:
- id (required): The unique identifier of the Strava activity.

Output Format:
A text summary detailing each lap, including:
- Lap Index
- Lap Name (if available)
- Elapsed Time (formatted as HH:MM:SS)
- Moving Time (formatted as HH:MM:SS)
- Distance (in km)
- Average Speed (in km/h)
- Max Speed (in km/h)
- Total Elevation Gain (in meters)
- Average Heart Rate (if available, in bpm)
- Max Heart Rate (if available, in bpm)
- Average Cadence (if available, in rpm)
- Average Watts (if available, in W)

Notes:
- Requires activity:read scope for public/followers activities, activity:read_all for private activities.
- Lap data availability depends on the recording device and activity type.
`;

const inputSchema = z.object({
  id: z.union([z.number(), z.string()]).describe("The identifier of the activity to fetch laps for."),
});

async function execute({ id }: z.infer<typeof inputSchema>) {
    const token = process.env.STRAVA_ACCESS_TOKEN;
    if (!token) {
        return {
            content: [{ type: "text", text: "❌ Error: STRAVA_ACCESS_TOKEN is not configured." }],
            isError: true
        };
    }

    try {
        const laps: StravaLap[] = await getActivityLapsClient(token, id);

        if (!laps || laps.length === 0) {
            return {
                content: [{ type: "text", text: `✅ No laps found for activity ID: ${id}` }],
            };
        }

        const lapSummaries = laps.map(lap => {
            const details = [
                `Lap ${lap.lap_index}: ${lap.name || 'Unnamed Lap'}`, // Lap Index and Name
                `  Time: ${formatDuration(lap.elapsed_time)} (Moving: ${formatDuration(lap.moving_time)})`, // Elapsed and Moving Time
                `  Distance: ${(lap.distance / 1000).toFixed(2)} km`, // Distance
                `  Avg Speed: ${lap.average_speed ? (lap.average_speed * 3.6).toFixed(2) + ' km/h' : 'N/A'}`, // Average Speed
                `  Max Speed: ${lap.max_speed ? (lap.max_speed * 3.6).toFixed(2) + ' km/h' : 'N/A'}`, // Max Speed
                lap.total_elevation_gain ? `  Elevation Gain: ${lap.total_elevation_gain.toFixed(1)} m` : null, // Elevation Gain
                lap.average_heartrate ? `  Avg HR: ${lap.average_heartrate.toFixed(1)} bpm` : null, // Avg Heart Rate
                lap.max_heartrate ? `  Max HR: ${lap.max_heartrate} bpm` : null, // Max Heart Rate
                lap.average_cadence ? `  Avg Cadence: ${lap.average_cadence.toFixed(1)} rpm` : null, // Avg Cadence
                lap.average_watts ? `  Avg Power: ${lap.average_watts.toFixed(1)} W ${lap.device_watts ? '(Sensor)' : ''}` : null, // Avg Power
            ];
            return details.filter(d => d !== null).join('\n'); // Filter out null lines and join
        });

        const responseText = `Activity Laps Summary (ID: ${id}):\n\n${lapSummaries.join('\n\n')}`;

        return {
            content: [{ type: "text", text: responseText }],
        };
    } catch (error: any) {
        console.error(`[ERROR ${name}] Failed to get laps for activity ${id}:`, error);
        const stravaError = error?.response?.data?.message || error?.message || "An unknown error occurred";
        return {
            content: [{ type: "text", text: `❌ Error fetching laps for activity ${id}: ${stravaError}` }],
            isError: true
        };
    }
}

export const getActivityLapsTool = {
    name,
    description,
    inputSchema,
    execute
}; 