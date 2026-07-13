import { z } from "zod";
import { getClubMembersById } from "../stravaClient.js";

const ListClubMembersInputSchema = z.object({
    clubId: z.number().int().positive().describe("The unique identifier of the club."),
    page: z.number().int().positive().optional().default(1).describe("Page number for pagination."),
    perPage: z.number().int().positive().optional().default(30).describe("Number of items per page."),
});

type ListClubMembersInput = z.infer<typeof ListClubMembersInputSchema>;

export const listClubMembersTool = {
    name: "list-club-members",
    description: "Lists members of a specific Strava club.",
    inputSchema: ListClubMembersInputSchema,
    execute: async (args: ListClubMembersInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;
        if (!token) {
            return {
                content: [{ type: "text" as const, text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing." }],
                isError: true,
            };
        }

        try {
            console.error(`Fetching members for club ${args.clubId}...`);
            const members = await getClubMembersById(token, args.clubId, args.page, args.perPage);

            if (members.length === 0) {
                return {
                    content: [{ type: "text" as const, text: "No members found in this club." }]
                };
            }

            const lines = members.map((m, i) => {
                const name = `${m.firstname || ""} ${m.lastname || ""}`.trim() || "Anonymous Member";
                const role = m.admin ? "Admin" : m.owner ? "Owner" : "Member";
                return `${i + 1}. **${name}** (Role: ${role})`;
            });

            return {
                content: [{
                    type: "text" as const,
                    text: `👥 **Club Members for Club ${args.clubId}**\n\n${lines.join("\n")}`
                }]
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            console.error("Error fetching club members:", errorMessage);
            return {
                content: [{ type: "text" as const, text: `❌ API Error: ${errorMessage}` }],
                isError: true,
            };
        }
    }
};
