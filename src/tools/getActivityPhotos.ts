import { z } from "zod";
import { getActivityPhotos as getActivityPhotosClient } from "../stravaClient.js";

const name = "get-activity-photos";

const description = `
Retrieves photos associated with a specific Strava activity.

Use Cases:
- Fetch all photos uploaded to an activity
- Get photo URLs for display or download
- Access photo metadata including location and timestamps

Parameters:
- id (required): The unique identifier of the Strava activity.
- size (optional): Size of photos to return in pixels (e.g., 100, 600, 2048). If not specified, returns all available sizes.

Output Format:
Returns both a human-readable summary and complete JSON data for each photo, including:
1. A text summary with photo count and URLs
2. Raw photo data containing all fields from the Strava API:
   - Photo ID and unique identifier
   - URLs for different sizes
   - Source (1 = Strava, 2 = Instagram)
   - Timestamps (uploaded_at, created_at)
   - Location coordinates if available
   - Caption if provided

Notes:
- Requires activity:read scope for public/followers activities, activity:read_all for private activities
- Photos may come from Strava uploads or linked Instagram posts
- Returns empty array if activity has no photos
`;

const inputSchema = z.object({
    id: z.union([z.number(), z.string()]).describe("The identifier of the activity to fetch photos for."),
    size: z.number().int().positive().optional().describe("Optional photo size in pixels (e.g., 100, 600, 2048)."),
});

type GetActivityPhotosInput = z.infer<typeof inputSchema>;

export const getActivityPhotosTool = {
    name,
    description,
    inputSchema,
    execute: async ({ id, size }: GetActivityPhotosInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;

        if (!token) {
            console.error("Missing STRAVA_ACCESS_TOKEN environment variable.");
            return {
                content: [{ type: "text" as const, text: "Configuration error: Missing Strava access token." }],
                isError: true
            };
        }

        try {
            // Convert id to number if it's a string
            const activityId = typeof id === 'string' ? parseInt(id, 10) : id;

            if (isNaN(activityId)) {
                return {
                    content: [{ type: "text" as const, text: `Invalid activity ID: ${id}` }],
                    isError: true
                };
            }

            console.error(`Fetching photos for activity ID: ${activityId}...`);
            const photos = await getActivityPhotosClient(token, activityId, size);

            if (!photos || photos.length === 0) {
                return {
                    content: [{ type: "text" as const, text: `No photos found for activity ID: ${activityId}` }]
                };
            }

            // Generate human-readable summary
            const photoSummaries = photos.map((photo, index) => {
                const details = [
                    `Photo ${index + 1}${photo.id ? ` (ID: ${photo.id})` : ''}${photo.unique_id ? ` [${photo.unique_id}]` : ''}`,
                ];

                // Add source info
                if (photo.source !== undefined) {
                    const sourceText = photo.source === 1 ? 'Strava' : photo.source === 2 ? 'Instagram' : `Unknown (${photo.source})`;
                    details.push(`  Source: ${sourceText}`);
                }

                // Add caption if available
                if (photo.caption) {
                    details.push(`  Caption: ${photo.caption}`);
                }

                // Add location if available
                if (photo.location && photo.location.length === 2) {
                    const lat = photo.location[0];
                    const lng = photo.location[1];
                    if (lat !== undefined && lng !== undefined) {
                        details.push(`  Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
                    }
                }

                // Add timestamps
                if (photo.created_at) {
                    details.push(`  Created: ${photo.created_at}`);
                }

                // Add URLs
                if (photo.urls && Object.keys(photo.urls).length > 0) {
                    details.push(`  URLs:`);
                    for (const [sizeKey, url] of Object.entries(photo.urls)) {
                        details.push(`    ${sizeKey}: ${url}`);
                    }
                }

                return details.join('\n');
            });

            const summaryText = `Activity Photos (ID: ${activityId})\nTotal Photos: ${photos.length}\n\n${photoSummaries.join('\n\n')}`;

            // Add raw data section
            const rawDataText = `\n\nComplete Photo Data:\n${JSON.stringify(photos, null, 2)}`;

            console.error(`Successfully fetched ${photos.length} photos for activity ${activityId}`);

            return {
                content: [
                    { type: "text" as const, text: summaryText },
                    { type: "text" as const, text: rawDataText }
                ]
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Error fetching photos for activity ${id}: ${errorMessage}`);
            const userFriendlyMessage = errorMessage.includes("Record Not Found") || errorMessage.includes("404")
                ? `Activity with ID ${id} not found.`
                : `An unexpected error occurred while fetching photos for activity ${id}. Details: ${errorMessage}`;
            return {
                content: [{ type: "text" as const, text: `Error: ${userFriendlyMessage}` }],
                isError: true
            };
        }
    }
};
