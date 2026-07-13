import { z } from "zod";
import { updateLoggedInAthlete } from "../stravaClient.js";

const UpdateAthleteInputSchema = z.object({
    weight: z.number().positive().describe("The weight of the athlete in kilograms."),
});

type UpdateAthleteInput = z.infer<typeof UpdateAthleteInputSchema>;

export const updateAthleteTool = {
    name: "update-athlete",
    description: "Updates the authenticated athlete's weight.",
    inputSchema: UpdateAthleteInputSchema,
    execute: async (args: UpdateAthleteInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;
        if (!token) {
            return {
                content: [{ type: "text" as const, text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing." }],
                isError: true,
            };
        }

        try {
            console.error(`Updating athlete weight to ${args.weight} kg...`);
            const athlete = await updateLoggedInAthlete(token, args.weight);

            return {
                content: [{
                    type: "text" as const,
                    text: `✅ Athlete profile updated successfully!\n\n👤 **${athlete.firstname} ${athlete.lastname}** (ID: ${athlete.id})\n- New Weight: ${athlete.weight} kg`
                }]
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            console.error("Error updating athlete profile:", errorMessage);
            return {
                content: [{ type: "text" as const, text: `❌ API Error: ${errorMessage}` }],
                isError: true,
            };
        }
    }
};
