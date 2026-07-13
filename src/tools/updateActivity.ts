import { z } from "zod";
import { updateActivityById } from "../stravaClient.js";

const UpdateActivityInputSchema = z.object({
    activityId: z.number().int().positive().describe("The unique identifier of the activity to update."),
    name: z.string().optional().describe("The name of the activity."),
    sportType: z.string().optional().describe("Sport type of activity. For example - Run, MountainBikeRide, Ride, etc."),
    type: z.string().optional().describe("Type of activity. For example - Run, Ride etc."),
    description: z.string().optional().describe("Description of the activity."),
    trainer: z.boolean().optional().describe("Whether this activity was performed on a trainer."),
    commute: z.boolean().optional().describe("Whether this activity was a commute."),
    gearId: z.string().optional().describe("The ID of the gear (bike/shoes) used for the activity."),
});

type UpdateActivityInput = z.infer<typeof UpdateActivityInputSchema>;

export const updateActivityTool = {
    name: "update-activity",
    description: "Updates an existing activity's details.",
    inputSchema: UpdateActivityInputSchema,
    execute: async (args: UpdateActivityInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;
        if (!token) {
            return {
                content: [{ type: "text" as const, text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing." }],
                isError: true,
            };
        }

        try {
            console.error(`Updating activity ${args.activityId}...`);
            const activity = await updateActivityById(token, args.activityId, {
                name: args.name,
                sport_type: args.sportType,
                type: args.type,
                description: args.description,
                trainer: args.trainer,
                commute: args.commute,
                gear_id: args.gearId,
            });

            return {
                content: [{
                    type: "text" as const,
                    text: `✅ Activity updated successfully!\n\n🏃 **${activity.name}** (ID: ${activity.id})\n- Description: ${activity.description || "N/A"}\n- Trainer: ${activity.trainer ? "Yes" : "No"}\n- Commute: ${activity.commute ? "Yes" : "No"}`
                }]
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            console.error("Error updating activity:", errorMessage);
            return {
                content: [{ type: "text" as const, text: `❌ API Error: ${errorMessage}` }],
                isError: true,
            };
        }
    }
};
