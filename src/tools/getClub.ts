import { z } from "zod";
import { getClubById } from "../stravaClient.js";

const GetClubInputSchema = z.object({
    clubId: z.number().int().positive().describe("The unique identifier of the club."),
});

type GetClubInput = z.infer<typeof GetClubInputSchema>;

export const getClubTool = {
    name: "get-club",
    description: "Retrieves details of a specific Strava club.",
    inputSchema: GetClubInputSchema,
    execute: async (args: GetClubInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;
        if (!token) {
            return {
                content: [{ type: "text" as const, text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing." }],
                isError: true,
            };
        }

        try {
            console.error(`Fetching club ${args.clubId}...`);
            const club = await getClubById(token, args.clubId);

            const details = [
                `👥 **${club.name}** (ID: ${club.id})`,
                `- Sport: ${club.sport_type}`,
                `- Members: ${club.member_count}`,
                `- Location: ${[club.city, club.state, club.country].filter(Boolean).join(", ") || "N/A"}`,
                `- Private: ${club.private ? "Yes" : "No"}`,
                `- Description: ${club.description || "No description provided."}`,
            ].join("\n");

            return {
                content: [{ type: "text" as const, text: details }]
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            console.error("Error fetching club details:", errorMessage);
            return {
                content: [{ type: "text" as const, text: `❌ API Error: ${errorMessage}` }],
                isError: true,
            };
        }
    }
};
