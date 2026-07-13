import { z } from "zod";
import { getClubAdminsById } from "../stravaClient.js";

const ListClubAdminsInputSchema = z.object({
    clubId: z.number().int().positive().describe("The unique identifier of the club."),
    page: z.number().int().positive().optional().default(1).describe("Page number for pagination."),
    perPage: z.number().int().positive().optional().default(30).describe("Number of items per page."),
});

type ListClubAdminsInput = z.infer<typeof ListClubAdminsInputSchema>;

export const listClubAdminsTool = {
    name: "list-club-admins",
    description: "Lists the administrators of a specific Strava club.",
    inputSchema: ListClubAdminsInputSchema,
    execute: async (args: ListClubAdminsInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;
        if (!token) {
            return {
                content: [{ type: "text" as const, text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing." }],
                isError: true,
            };
        }

        try {
            console.error(`Fetching admins for club ${args.clubId}...`);
            const admins = await getClubAdminsById(token, args.clubId, args.page, args.perPage);

            if (admins.length === 0) {
                return {
                    content: [{ type: "text" as const, text: "No administrators found in this club." }]
                };
            }

            const lines = admins.map((m, i) => {
                const name = `${m.firstname || ""} ${m.lastname || ""}`.trim() || "Anonymous Admin";
                return `${i + 1}. **${name}**`;
            });

            return {
                content: [{
                    type: "text" as const,
                    text: `🛡️ **Club Administrators for Club ${args.clubId}**\n\n${lines.join("\n")}`
                }]
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            console.error("Error fetching club admins:", errorMessage);
            return {
                content: [{ type: "text" as const, text: `❌ API Error: ${errorMessage}` }],
                isError: true,
            };
        }
    }
};
