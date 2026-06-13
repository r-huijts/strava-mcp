import { z } from "zod";
import { getActivityKudoers as getActivityKudoersClient } from "../stravaClient.js";

const name = "get-activity-kudoers";

const description = `
Retrieves the athletes who gave kudos to a specific Strava activity.

Use Cases:
- See who kudoed a specific activity
- Compare kudos engagement across activities
- Inspect the raw athlete summary data returned by Strava

Parameters:
- id (required): The unique identifier of the Strava activity.
- page (optional): Page number for pagination. Defaults to 1.
- perPage (optional): Number of kudoers per page. Defaults to 30.

Output Format:
Returns both a human-readable summary and complete JSON data for each kudoer.

Notes:
- Requires activity:read scope for public/followers activities, activity:read_all for private activities
- Returns an empty result when the activity has no kudos
`;

const inputSchema = z.object({
    id: z.union([z.number(), z.string()]).describe("The identifier of the activity to fetch kudoers for."),
    page: z.number().int().positive().optional().default(1).describe("Page number for pagination. Defaults to 1."),
    perPage: z.number().int().positive().optional().default(30).describe("Number of kudoers per page. Defaults to 30."),
});

type GetActivityKudoersInput = z.infer<typeof inputSchema>;

function formatKudoerName(kudoer: { firstname?: string; lastname?: string; id?: number }): string {
    const nameParts = [kudoer.firstname, kudoer.lastname].filter(Boolean);
    const name = nameParts.length > 0 ? nameParts.join(" ") : "Unknown athlete";
    return kudoer.id ? `${name} (ID: ${kudoer.id})` : name;
}

export const getActivityKudoersTool = {
    name,
    description,
    inputSchema,
    execute: async ({ id, page = 1, perPage = 30 }: GetActivityKudoersInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;

        if (!token) {
            console.error("Missing STRAVA_ACCESS_TOKEN environment variable.");
            return {
                content: [{ type: "text" as const, text: "Configuration error: Missing Strava access token." }],
                isError: true
            };
        }

        try {
            const activityId = typeof id === "string" ? parseInt(id, 10) : id;

            if (isNaN(activityId)) {
                return {
                    content: [{ type: "text" as const, text: `Invalid activity ID: ${id}` }],
                    isError: true
                };
            }

            console.error(`Fetching kudoers for activity ID: ${activityId}...`);
            const kudoers = await getActivityKudoersClient(token, activityId, page, perPage);

            if (!kudoers || kudoers.length === 0) {
                return {
                    content: [{ type: "text" as const, text: `No kudoers found for activity ID: ${activityId}` }]
                };
            }

            const kudoerSummaries = kudoers.map((kudoer, index) => {
                const details = [
                    `${index + 1}. ${formatKudoerName(kudoer)}`,
                ];

                if (kudoer.profile_medium) {
                    details.push(`   Profile Image (Medium): ${kudoer.profile_medium}`);
                }

                if (kudoer.profile) {
                    details.push(`   Profile Image: ${kudoer.profile}`);
                }

                return details.join("\n");
            });

            const summaryText = `Activity Kudoers (ID: ${activityId})\nPage: ${page}, Per Page: ${perPage}\nTotal Kudoers Returned: ${kudoers.length}\n\n${kudoerSummaries.join("\n\n")}`;
            const rawDataText = `\n\nComplete Kudoer Data:\n${JSON.stringify(kudoers, null, 2)}`;

            console.error(`Successfully fetched ${kudoers.length} kudoers for activity ${activityId}`);

            return {
                content: [
                    { type: "text" as const, text: summaryText },
                    { type: "text" as const, text: rawDataText }
                ]
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Error fetching kudoers for activity ${id}: ${errorMessage}`);
            const userFriendlyMessage = errorMessage.includes("Record Not Found") || errorMessage.includes("404")
                ? `Activity with ID ${id} not found.`
                : `An unexpected error occurred while fetching kudoers for activity ${id}. Details: ${errorMessage}`;
            return {
                content: [{ type: "text" as const, text: `Error: ${userFriendlyMessage}` }],
                isError: true
            };
        }
    }
};
