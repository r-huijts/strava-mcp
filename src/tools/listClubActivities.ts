import { z } from "zod";
import { getClubActivitiesById } from "../stravaClient.js";

const ListClubActivitiesInputSchema = z.object({
    clubId: z.number().int().positive().describe("The unique identifier of the club."),
    page: z.number().int().positive().optional().default(1).describe("Page number for pagination."),
    perPage: z.number().int().positive().optional().default(30).describe("Number of items per page."),
});

type ListClubActivitiesInput = z.infer<typeof ListClubActivitiesInputSchema>;

export const listClubActivitiesTool = {
    name: "list-club-activities",
    description: "Lists the activities of a specific Strava club (for authenticated athlete's clubs).",
    inputSchema: ListClubActivitiesInputSchema,
    execute: async (args: ListClubActivitiesInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;
        if (!token) {
            return {
                content: [{ type: "text" as const, text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing." }],
                isError: true,
            };
        }

        try {
            console.error(`Fetching activities for club ${args.clubId}...`);
            const activities = await getClubActivitiesById(token, args.clubId, args.page, args.perPage);

            if (activities.length === 0) {
                return {
                    content: [{ type: "text" as const, text: "No activities found in this club." }]
                };
            }

            const lines = activities.map((act, i) => {
                const athleteName = `${act.athlete?.firstname || ""} ${act.athlete?.lastname || ""}`.trim() || "Athlete";
                const distKm = act.distance ? `${(act.distance / 1000).toFixed(2)} km` : "N/A";
                const timeMin = act.moving_time ? `${Math.floor(act.moving_time / 60)}m` : "N/A";
                return `${i + 1}. **${act.name}** by *${athleteName}* (${act.type})\n   - Dist: ${distKm} | Moving Time: ${timeMin}`;
            });

            return {
                content: [{
                    type: "text" as const,
                    text: `🏆 **Club Activities for Club ${args.clubId}**\n\n${lines.join("\n\n")}`
                }]
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            console.error("Error fetching club activities:", errorMessage);
            return {
                content: [{ type: "text" as const, text: `❌ API Error: ${errorMessage}` }],
                isError: true,
            };
        }
    }
};
