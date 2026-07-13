import { z } from "zod";
import { createActivity } from "../stravaClient.js";

const CreateActivityInputSchema = z.object({
    name: z.string().describe("The name of the activity."),
    sportType: z.string().describe("Sport type of activity. For example - Run, MountainBikeRide, Ride, etc."),
    startDateLocal: z.string().describe("ISO 8601 formatted date time of the activity start (local time)."),
    elapsedTime: z.number().int().positive().describe("In seconds."),
    description: z.string().optional().describe("Description of the activity."),
    distance: z.number().positive().optional().describe("In meters."),
    trainer: z.number().int().min(0).max(1).optional().describe("Set to 1 to mark as a trainer activity."),
    commute: z.number().int().min(0).max(1).optional().describe("Set to 1 to mark as commute."),
});

type CreateActivityInput = z.infer<typeof CreateActivityInputSchema>;

export const createActivityTool = {
    name: "create-activity",
    description: "Creates a manual activity for the authenticated athlete.",
    inputSchema: CreateActivityInputSchema,
    execute: async (args: CreateActivityInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;
        if (!token) {
            return {
                content: [{ type: "text" as const, text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing." }],
                isError: true,
            };
        }

        try {
            console.error("Creating activity...");
            const activity = await createActivity(token, args.name, args.sportType, args.startDateLocal, args.elapsedTime, {
                description: args.description,
                distance: args.distance,
                trainer: args.trainer,
                commute: args.commute,
            });

            return {
                content: [{
                    type: "text" as const,
                    text: `✅ Manual activity created successfully!\n\n🏃 **${activity.name}** (ID: ${activity.id})\n- Sport Type: ${activity.sport_type}\n- Distance: ${(activity.distance / 1000).toFixed(2)} km\n- Elapsed Time: ${Math.floor(activity.elapsed_time / 60)} min`
                }]
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            console.error("Error creating activity:", errorMessage);
            return {
                content: [{ type: "text" as const, text: `❌ API Error: ${errorMessage}` }],
                isError: true,
            };
        }
    }
};
