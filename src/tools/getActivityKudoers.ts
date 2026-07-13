import { z } from "zod";
import { getKudoersByActivityId } from "../stravaClient.js";

const GetActivityKudoersInputSchema = z.object({
    activityId: z.number().int().positive().describe("The unique identifier of the activity."),
    page: z.number().int().positive().optional().default(1).describe("Page number for pagination."),
    perPage: z.number().int().positive().optional().default(30).describe("Number of items per page."),
});

type GetActivityKudoersInput = z.infer<typeof GetActivityKudoersInputSchema>;

export const getActivityKudoersTool = {
    name: "get-activity-kudoers",
    description: "Lists athletes who kudoed a specific activity.",
    inputSchema: GetActivityKudoersInputSchema,
    execute: async (args: GetActivityKudoersInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;
        if (!token) {
            return {
                content: [{ type: "text" as const, text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing." }],
                isError: true,
            };
        }

        try {
            console.error(`Fetching kudoers for activity ${args.activityId}...`);
            const kudoers = await getKudoersByActivityId(token, args.activityId, args.page, args.perPage);

            if (kudoers.length === 0) {
                return {
                    content: [{ type: "text" as const, text: "No kudos found on this activity yet." }]
                };
            }

            const lines = kudoers.map((k, i) => {
                const name = `${k.firstname || ""} ${k.lastname || ""}`.trim() || "Anonymous Athlete";
                return `${i + 1}. **${name}** (ID: ${k.id})`;
            });

            return {
                content: [{
                    type: "text" as const,
                    text: `👍 **Athletes who kudoed Activity ${args.activityId}**\n\n${lines.join("\n")}`
                }]
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            console.error("Error fetching activity kudoers:", errorMessage);
            return {
                content: [{ type: "text" as const, text: `❌ API Error: ${errorMessage}` }],
                isError: true,
            };
        }
    }
};
