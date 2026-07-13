import { z } from "zod";
import { getCommentsByActivityId } from "../stravaClient.js";

const GetActivityCommentsInputSchema = z.object({
    activityId: z.number().int().positive().describe("The unique identifier of the activity."),
    page: z.number().int().positive().optional().default(1).describe("Page number for pagination."),
    perPage: z.number().int().positive().optional().default(30).describe("Number of items per page."),
});

type GetActivityCommentsInput = z.infer<typeof GetActivityCommentsInputSchema>;

export const getActivityCommentsTool = {
    name: "get-activity-comments",
    description: "Lists comments for a specific activity.",
    inputSchema: GetActivityCommentsInputSchema,
    execute: async (args: GetActivityCommentsInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;
        if (!token) {
            return {
                content: [{ type: "text" as const, text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing." }],
                isError: true,
            };
        }

        try {
            console.error(`Fetching comments for activity ${args.activityId}...`);
            const comments = await getCommentsByActivityId(token, args.activityId, args.page, args.perPage);

            if (comments.length === 0) {
                return {
                    content: [{ type: "text" as const, text: "No comments found on this activity." }]
                };
            }

            const lines = comments.map((c, i) => {
                const author = `${c.athlete?.firstname || ""} ${c.athlete?.lastname || ""}`.trim() || "Anonymous";
                const date = c.created_at ? new Date(c.created_at).toLocaleString() : "Unknown date";
                return `${i + 1}. **${author}** (${date}):\n   "${c.text}"`;
            });

            return {
                content: [{
                    type: "text" as const,
                    text: `💬 **Comments for Activity ${args.activityId}**\n\n${lines.join("\n\n")}`
                }]
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            console.error("Error fetching activity comments:", errorMessage);
            return {
                content: [{ type: "text" as const, text: `❌ API Error: ${errorMessage}` }],
                isError: true,
            };
        }
    }
};
