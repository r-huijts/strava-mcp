import { z } from "zod";
import { getActivityLaps as getActivityLapsClient } from "../stravaClient.js";
import { formatDuration } from "../server.js"; // Import helper

const name = "get-activity-laps";

const description = `
Retrieves detailed lap data for a specific Strava activity.

Use Cases:
- Get complete lap data including timestamps, speeds, and metrics
- Access raw values for detailed analysis or visualization
- Extract specific lap metrics for comparison or tracking

Parameters:
- id (required): The unique identifier of the Strava activity.

Output Format:
Returns both a human-readable summary and complete JSON data for each lap, including:
1. A text summary with formatted metrics
2. Raw lap data containing all fields from the Strava API:
   - Unique lap ID and indices
   - Timestamps (start_date, start_date_local)
   - Distance and timing metrics
   - Speed metrics (average and max)
   - Performance metrics (heart rate, cadence, power if available)
   - Elevation data
   - Resource state information
   - Activity and athlete references

Notes:
- Requires activity:read scope for public/followers activities, activity:read_all for private activities
- Returns complete data as received from Strava API without omissions
- All numeric values are preserved in their original precision
`;

const inputSchema = z.object({
    id: z.union([z.number(), z.string()]).describe("The identifier of the activity to fetch laps for."),
});

type GetActivityLapsInput = z.infer<typeof inputSchema>;

export const getActivityLapsTool = {
    name,
    description,
    inputSchema,
    execute: async ({ id }: GetActivityLapsInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;

        if (!token) {
            console.error("Missing STRAVA_ACCESS_TOKEN environment variable.");
            return {
                content: [{ type: "text" as const, text: "Configuration error: Missing Strava access token." }],
                isError: true
            };
        }

        try {
            console.error(`Fetching laps for activity ID: ${id}...`);
            const laps = await getActivityLapsClient(token, id);

            if (!laps || laps.length === 0) {
                return {
                    content: [{ type: "text" as const, text: `✅ No laps found for activity ID: ${id}` }]
                };
            }

            // Generate human-readable summary
            const lapSummaries = laps.map(lap => {
                const details = [
                    `Lap ${lap.lap_index}: ${lap.name || 'Unnamed Lap'}`,
                    `  Time: ${formatDuration(lap.elapsed_time)} (Moving: ${formatDuration(lap.moving_time)})`,
                    `  Distance: ${(lap.distance / 1000).toFixed(2)} km`,
                    `  Avg Speed: ${lap.average_speed ? (lap.average_speed * 3.6).toFixed(2) + ' km/h' : 'N/A'}`,
                    `  Max Speed: ${lap.max_speed ? (lap.max_speed * 3.6).toFixed(2) + ' km/h' : 'N/A'}`,
                    lap.total_elevation_gain ? `  Elevation Gain: ${lap.total_elevation_gain.toFixed(1)} m` : null,
                    lap.average_heartrate ? `  Avg HR: ${lap.average_heartrate.toFixed(1)} bpm` : null,
                    lap.max_heartrate ? `  Max HR: ${lap.max_heartrate} bpm` : null,
                    lap.average_cadence ? `  Avg Cadence: ${lap.average_cadence.toFixed(1)} rpm` : null,
                    lap.average_watts ? `  Avg Power: ${lap.average_watts.toFixed(1)} W ${lap.device_watts ? '(Sensor)' : ''}` : null,
                ];
                return details.filter(d => d !== null).join('\n');
            });

            const summaryText = `Activity Laps Summary (ID: ${id}):\n\n${lapSummaries.join('\n\n')}`;
            
            // Add raw data section
            const rawDataText = `\n\nComplete Lap Data:\n${JSON.stringify(laps, null, 2)}`;
            
            console.error(`Successfully fetched ${laps.length} laps for activity ${id}`);
            
            return {
                content: [
                    { type: "text" as const, text: summaryText },
                    { type: "text" as const, text: rawDataText }
                ]
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Error fetching laps for activity ${id}: ${errorMessage}`);
            const userFriendlyMessage = errorMessage.includes("Record Not Found") || errorMessage.includes("404")
                ? `Activity with ID ${id} not found.`
                : `An unexpected error occurred while fetching laps for activity ${id}. Details: ${errorMessage}`;
            return {
                content: [{ type: "text" as const, text: `❌ ${userFriendlyMessage}` }],
                isError: true
            };
        }
    }
}; 