import { z } from "zod";
import { getZonesByActivityId } from "../stravaClient.js";

const GetActivityZonesInputSchema = z.object({
    activityId: z.number().int().positive().describe("The unique identifier of the activity."),
});

type GetActivityZonesInput = z.infer<typeof GetActivityZonesInputSchema>;

export const getActivityZonesTool = {
    name: "get-activity-zones",
    description: "Retrieves the heart rate and power zones spend distribution for a specific activity.",
    inputSchema: GetActivityZonesInputSchema,
    execute: async (args: GetActivityZonesInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;
        if (!token) {
            return {
                content: [{ type: "text" as const, text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing." }],
                isError: true,
            };
        }

        try {
            console.error(`Fetching zones for activity ${args.activityId}...`);
            const zones = await getZonesByActivityId(token, args.activityId);

            if (zones.length === 0) {
                return {
                    content: [{ type: "text" as const, text: "No zone distribution data found for this activity." }]
                };
            }

            const formattedZones = zones.map(zData => {
                const typeName = zData.type === "heartrate" ? "❤️ Heart Rate Zones" : "⚡ Power Zones";
                const buckets = zData.distribution_buckets || [];
                const bucketLines = buckets.map((bucket: any, index: number) => {
                    const durationMin = Math.floor(bucket.time / 60);
                    const durationSec = bucket.time % 60;
                    const durationStr = `${durationMin}m ${durationSec}s`;
                    return `   - Zone ${index + 1} (${bucket.min} - ${bucket.max === -1 ? '∞' : bucket.max}): Spent ${durationStr}`;
                }).join("\n");

                return `**${typeName}**\n${bucketLines || "   No distribution buckets returned."}`;
            }).join("\n\n");

            return {
                content: [{
                    type: "text" as const,
                    text: `📊 **Activity Zone Spend Distribution for Activity ${args.activityId}**\n\n${formattedZones}`
                }]
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            console.error("Error fetching activity zones:", errorMessage);
            return {
                content: [{ type: "text" as const, text: `❌ API Error: ${errorMessage}` }],
                isError: true,
            };
        }
    }
};
