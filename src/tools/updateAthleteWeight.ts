import { z } from "zod";
import { updateAthleteWeight } from "../stravaClient.js";

const UpdateAthleteWeightInputSchema = z.object({
    weight: z
        .number()
        .positive()
        .describe("The new athlete weight in kilograms (for example: 72.5)."),
});

type UpdateAthleteWeightInput = z.infer<typeof UpdateAthleteWeightInputSchema>;

export const updateAthleteWeightTool = {
    name: "update-athlete-weight",
    description: "Updates the authenticated athlete's weight in Strava (kg). Requires profile:write scope.",
    inputSchema: UpdateAthleteWeightInputSchema,
    execute: async ({ weight }: UpdateAthleteWeightInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;

        if (!token || token === "YOUR_STRAVA_ACCESS_TOKEN_HERE") {
            console.error("Missing or placeholder STRAVA_ACCESS_TOKEN in .env");
            return {
                content: [{ type: "text" as const, text: "Configuration Error: STRAVA_ACCESS_TOKEN is missing or not set in the .env file." }],
                isError: true,
            };
        }

        try {
            console.error(`Updating athlete weight to ${weight} kg...`);
            const athlete = await updateAthleteWeight(token, weight);

            return {
                content: [{
                    type: "text" as const,
                    text: `Weight updated successfully.\nCurrent athlete weight: ${athlete.weight ?? "N/A"} kg`,
                }],
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            console.error("Error in update-athlete-weight tool:", errorMessage);
            return {
                content: [{ type: "text" as const, text: `API Error: ${errorMessage}` }],
                isError: true,
            };
        }
    },
};
