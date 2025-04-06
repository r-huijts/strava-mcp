import axios from "axios";
import { z } from "zod";

// Define the expected structure of a Strava activity (add more fields as needed)
const StravaActivitySchema = z.object({
    name: z.string(),
    distance: z.number(),
    start_date: z.string(),
    // Add other relevant fields from the Strava API response if needed
    // e.g., moving_time: z.number(), type: z.string(), ...
});

// Define the expected response structure for the activities endpoint
const StravaActivitiesResponseSchema = z.array(StravaActivitySchema);

/**
 * Fetches recent activities for the authenticated athlete from the Strava API.
 *
 * @param accessToken - The Strava API access token.
 * @param perPage - The number of activities to fetch per page (default: 30).
 * @returns A promise that resolves to an array of Strava activities.
 * @throws Throws an error if the API request fails or the response format is unexpected.
 */
export async function getRecentActivities(accessToken: string, perPage = 30) {
    if (!accessToken) {
        throw new Error("Strava access token is required.");
    }

    try {
        const response = await axios.get("https://www.strava.com/api/v3/athlete/activities", {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { per_page: perPage }
        });

        // Validate the response data against the Zod schema
        const validationResult = StravaActivitiesResponseSchema.safeParse(response.data);

        if (!validationResult.success) {
            console.error("Strava API response validation failed:", validationResult.error);
            throw new Error(`Invalid data format received from Strava API: ${validationResult.error.message}`);
        }

        return validationResult.data;
    } catch (error) {
        // Type guard for AxiosError
        if (axios.isAxiosError(error)) {
            // Now 'error' is typed as AxiosError
            const status = error.response?.status || 'Unknown';
            const responseData = error.response?.data;
            // Attempt to extract a message from the response data if it exists and is an object
            const message = (typeof responseData === 'object' && responseData !== null && 'message' in responseData && typeof responseData.message === 'string')
                ? responseData.message
                : error.message;
            console.error(`Strava API request failed with status ${status}: ${message}`);
            throw new Error(`Strava API Error (${status}): ${message}`);
        } else if (error instanceof Error) {
            // Handle standard JavaScript errors
            console.error("An unexpected error occurred:", error);
            throw new Error(`An unexpected error occurred while fetching Strava activities: ${error.message}`);
        } else {
             // Handle cases where the caught value is not an Error object
            console.error("An unknown error object was caught:", error);
            throw new Error(`An unknown error occurred: ${String(error)}`);
        }
    }
} 