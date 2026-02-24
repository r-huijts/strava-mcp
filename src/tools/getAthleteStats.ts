import { z } from "zod";
import {
    getAthleteStats as fetchAthleteStats,
    StravaStats
} from "../stravaClient.js";

const GetAthleteStatsInputSchema = z.object({
    athleteId: z.number().int().positive().describe("The unique identifier of the athlete to fetch stats for. Obtain this ID first by calling the get-athlete-profile tool.")
});

type GetAthleteStatsInput = z.infer<typeof GetAthleteStatsInputSchema>;

function formatStat(value: number | null | undefined, unit: 'km' | 'm' | 'hrs'): string {
    if (value === null || value === undefined) return 'N/A';

    let formattedValue: string;
    if (unit === 'km') {
        formattedValue = (value / 1000).toFixed(2);
    } else if (unit === 'm') {
        formattedValue = Math.round(value).toString();
    } else if (unit === 'hrs') {
        formattedValue = (value / 3600).toFixed(1);
    } else {
        formattedValue = value.toString();
    }
    return `${formattedValue} ${unit}`;
}

const activityTypes = [
    { key: "ride", label: "Rides" },
    { key: "run", label: "Runs" },
    { key: "swim", label: "Swims" },
] as const;

type ActivityTotals = StravaStats["recent_ride_totals"];

function getTotals(stats: StravaStats, prefix: "recent" | "ytd" | "all", type: "ride" | "run" | "swim"): ActivityTotals {
    const key = `${prefix}_${type}_totals` as keyof StravaStats;
    return stats[key] as ActivityTotals;
}

function formatStats(stats: StravaStats): string {
    const format = (label: string, total: number | null | undefined, unit: 'km' | 'm' | 'hrs', count?: number | null, time?: number | null) => {
        let line = `   - ${label}: ${formatStat(total, unit)}`;
        if (count !== undefined && count !== null) line += ` (${count} activities)`;
        if (time !== undefined && time !== null) line += ` / ${formatStat(time, 'hrs')} hours`;
        return line;
    };

    const periods = [
        { prefix: "recent", label: (type: string) => `*Recent ${type} (last 4 weeks):*` },
        { prefix: "ytd", label: (type: string) => `*Year-to-Date ${type}:*` },
        { prefix: "all", label: (type: string) => `*All-Time ${type}:*` },
    ] as const;

    let response = "📊 **Your Strava Stats:**\n";

    if (stats.biggest_ride_distance != null) {
        response += format("Biggest Ride Distance", stats.biggest_ride_distance, 'km') + '\n';
    }
    if (stats.biggest_climb_elevation_gain != null) {
        response += format("Biggest Climb Elevation Gain", stats.biggest_climb_elevation_gain, 'm') + '\n';
    }

    for (const { key, label } of activityTypes) {
        response += `\n**${label}:**\n`;
        for (const period of periods) {
            const totals = getTotals(stats, period.prefix, key);
            response += period.label(label) + '\n';
            response += format("Distance", totals.distance, 'km', totals.count, totals.moving_time) + '\n';
            response += format("Elevation Gain", totals.elevation_gain, 'm') + '\n';
        }
    }

    return response;
}

export const getAthleteStatsTool = {
    name: "get-athlete-stats",
    description: "Fetches the activity statistics (recent, YTD, all-time) for a specific athlete using their ID. Requires the athleteId obtained from the get-athlete-profile tool.",
    inputSchema: GetAthleteStatsInputSchema,
    execute: async ({ athleteId }: GetAthleteStatsInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;

        if (!token) {
             console.error("Missing STRAVA_ACCESS_TOKEN environment variable.");
             return {
                content: [{ type: "text" as const, text: "Configuration error: Missing Strava access token." }],
                isError: true
            };
        }

        try {
            console.error(`Fetching stats for athlete ${athleteId}...`);
            const stats = await fetchAthleteStats(token, athleteId);
            const formattedStats = formatStats(stats);

            console.error(`Successfully fetched stats for athlete ${athleteId}.`);
            return { content: [{ type: "text" as const, text: formattedStats }] };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Error fetching stats for athlete ${athleteId}: ${errorMessage}`);
            const userFriendlyMessage = errorMessage.includes("Record Not Found") || errorMessage.includes("404")
                ? `Athlete with ID ${athleteId} not found (when fetching stats).`
                : `An unexpected error occurred while fetching stats for athlete ${athleteId}. Details: ${errorMessage}`;
            return {
                content: [{ type: "text" as const, text: `❌ ${userFriendlyMessage}` }],
                isError: true
            };
        }
    }
};
