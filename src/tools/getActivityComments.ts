import { z } from "zod";
import { getActivityComments as getActivityCommentsClient } from "../stravaClient.js";

const name = "get-activity-comments";

const description = `
Retrieves comments on a specific Strava activity.

Use Cases:
- View comments and discussion on an activity
- See who commented and what they said

Parameters:
- id (required): The unique identifier of the Strava activity.
- page_size (optional): Number of comments to return per page (default: 30).
- after_cursor (optional): Cursor for fetching the next page of results.

Output Format:
Returns a formatted list of comments with author name, timestamp, and text,
followed by complete JSON data.

Notes:
- Requires activity:read scope for public/followers activities, activity:read_all for private activities.
- Uses cursor-based pagination via after_cursor parameter.
`;

const inputSchema = z.object({
    id: z.union([z.number(), z.string()]).describe("The identifier of the activity."),
    page_size: z.number().int().optional().describe("Number of comments per page (default: 30)."),
    after_cursor: z.string().optional().describe("Cursor for fetching the next page of results."),
});

type GetActivityCommentsInput = z.infer<typeof inputSchema>;

export const getActivityCommentsTool = {
    name,
    description,
    inputSchema,
    execute: async ({ id, page_size, after_cursor }: GetActivityCommentsInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;

        if (!token) {
            console.error("Missing STRAVA_ACCESS_TOKEN environment variable.");
            return {
                content: [{ type: "text" as const, text: "Configuration error: Missing Strava access token." }],
                isError: true,
            };
        }

        try {
            console.error(`Fetching comments for activity ID: ${id}...`);
            const comments = await getActivityCommentsClient(token, id, page_size, after_cursor);

            if (!comments || comments.length === 0) {
                return {
                    content: [{ type: "text" as const, text: `No comments found for activity ID: ${id}` }],
                };
            }

            const commentSummaries = comments.map((comment, index) => {
                const date = new Date(comment.created_at).toLocaleString();
                return `${index + 1}. **${comment.athlete.firstname} ${comment.athlete.lastname}** (${date}):\n   ${comment.text}`;
            });

            const lastCursor = comments[comments.length - 1]?.cursor;
            const paginationNote = lastCursor
                ? `\n\nTo fetch more comments, use after_cursor: "${lastCursor}"`
                : "";

            const summaryText = `Comments for Activity ${id} (${comments.length} shown):\n\n${commentSummaries.join("\n\n")}${paginationNote}`;

            const rawDataText = `\n\nComplete Comment Data:\n${JSON.stringify(comments, null, 2)}`;

            console.error(`Successfully fetched ${comments.length} comments for activity ${id}`);

            return {
                content: [
                    { type: "text" as const, text: summaryText },
                    { type: "text" as const, text: rawDataText },
                ],
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Error fetching comments for activity ${id}: ${errorMessage}`);
            const userFriendlyMessage = errorMessage.includes("Record Not Found") || errorMessage.includes("404")
                ? `Activity with ID ${id} not found.`
                : `An unexpected error occurred while fetching comments for activity ${id}. Details: ${errorMessage}`;
            return {
                content: [{ type: "text" as const, text: userFriendlyMessage }],
                isError: true,
            };
        }
    },
};
