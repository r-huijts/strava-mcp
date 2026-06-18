import { z } from "zod";
import { updateActivity as updateActivityClient, StravaDetailedActivity } from "../stravaClient.js";
import { formatLocalDateTime } from "../formatters.js";

const ActivityIdSchema = z
    .union([z.number().int().positive(), z.string().regex(/^\d+$/)])
    .transform((val) => (typeof val === "number" ? val : parseInt(val, 10)))
    .refine((n) => Number.isInteger(n) && n > 0, { message: "Invalid Strava activity id" })
    .describe("The Strava activity id (integer). Numeric strings are accepted.");

const CommuteSchema = z
    .union([z.boolean(), z.string().regex(/^(true|false)$/)])
    .transform((val) => (typeof val === "boolean" ? val : val === "true"));

const inputSchema = z.object({
    activityId: ActivityIdSchema,
    name: z.string().optional().describe("New name of the activity."),
    description: z.string().optional().describe("New description of the activity."),
    commute: CommuteSchema.optional().describe("Whether the activity is a commute."),
});

type UpdateActivityInput = z.infer<typeof inputSchema>;

function formatUpdatedActivity(activity: StravaDetailedActivity, sent: { name?: string; description?: string; commute?: boolean }): string {
    const date = activity.start_date_local ? formatLocalDateTime(activity.start_date_local) : "N/A";
    const parts: string[] = [];
    parts.push(`Activity updated (ID: ${activity.id})`);
    parts.push(`   - Date: ${date}`);
    if (sent.name !== undefined) {
        parts.push(`   - Name: ${activity.name}`);
    }
    if (sent.description !== undefined) {
        parts.push(`   - Description updated.`);
    }
    if (sent.commute !== undefined) {
        parts.push(`   - Commute: ${activity.commute ? "true" : "false"}`);
    }

    return parts.join("\n");
}

export const updateActivityTool = {
    name: "update-activity",
    description: "Update a Strava activity name, description, and/or commute flag.",
    inputSchema,
    execute: async ({ activityId, name, description, commute }: UpdateActivityInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;

        if (!token) {
            console.error("Missing STRAVA_ACCESS_TOKEN environment variable.");
            return {
                content: [{ type: "text" as const, text: "Configuration error: Missing Strava access token." }],
                isError: true,
            };
        }

        try {
            console.error(`Updating activity ID: ${activityId}...`);

            const payload: { name?: string; description?: string; commute?: boolean } = {};
            if (name !== undefined) payload.name = name;
            if (description !== undefined) payload.description = description;
            if (commute !== undefined) payload.commute = commute;

            const updated = await updateActivityClient(token, activityId, payload);

            console.error(`Successfully updated activity ${activityId}.`);
            return {
                content: [{ type: "text" as const, text: formatUpdatedActivity(updated, { name, description, commute }) }],
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Error updating activity ${activityId}: ${errorMessage}`);

            const userFriendlyMessage =
                errorMessage.startsWith("SUBSCRIPTION_REQUIRED:")
                    ? `Accessing this action requires a Strava subscription.`
                    : errorMessage.includes("Record Not Found") || errorMessage.includes("404")
                        ? `Activity with ID ${activityId} not found.`
                        : `An unexpected error occurred while updating activity details for ID ${activityId}. Details: ${errorMessage}`;

            return {
                content: [{ type: "text" as const, text: `❌ ${userFriendlyMessage}` }],
                isError: true,
            };
        }
    },
};

