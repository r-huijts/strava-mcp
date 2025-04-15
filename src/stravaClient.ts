import axios from "axios";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// --- Axios Instance & Interceptor --- 
// Create an Axios instance to apply interceptors globally for this client
export const stravaApi = axios.create({
    baseURL: 'https://www.strava.com/api/v3'
});

// Add a request interceptor (can be used for logging or modifying requests)
stravaApi.interceptors.request.use(config => {
    // REMOVE DEBUG LOGS - Interfere with MCP Stdio transport
    // let authHeaderLog = 'Not Set';
    // const authHeaderValue = config.headers?.Authorization;
    // if (typeof authHeaderValue === 'string') {
    //     authHeaderLog = `${authHeaderValue.substring(0, 12)}...[REDACTED]`;
    // }
    // console.error(`[DEBUG stravaClient] Sending Request: ${config.method?.toUpperCase()} ${config.url}`);
    // console.error(`[DEBUG stravaClient] Authorization Header: ${authHeaderLog}` );
    return config;
}, error => {
    console.error('[DEBUG stravaClient] Request Error Interceptor:', error);
    return Promise.reject(error);
});
// ----------------------------------

// Define the expected structure of a Strava activity (add more fields as needed)
const StravaActivitySchema = z.object({
    id: z.number().int().optional(), // Include ID for recent activities
    name: z.string(),
    distance: z.number(),
    start_date: z.string().datetime(),
    // Add other relevant fields from the Strava API response if needed
    // e.g., moving_time: z.number(), type: z.string(), ...
});

// Define the expected response structure for the activities endpoint
const StravaActivitiesResponseSchema = z.array(StravaActivitySchema);

// Define the expected structure for the Authenticated Athlete response
const BaseAthleteSchema = z.object({
    id: z.number().int(),
    resource_state: z.number().int(),
});
const DetailedAthleteSchema = BaseAthleteSchema.extend({
    username: z.string().nullable(),
    firstname: z.string(),
    lastname: z.string(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    country: z.string().nullable(),
    sex: z.enum(["M", "F"]).nullable(),
    premium: z.boolean(),
    summit: z.boolean(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    profile_medium: z.string().url(),
    profile: z.string().url(),
    weight: z.number().nullable(),
    measurement_preference: z.enum(["feet", "meters"]).optional().nullable(),
    // Add other fields as needed (e.g., follower_count, friend_count, ftp, clubs, bikes, shoes)
});

// Type alias for the inferred athlete type
export type StravaAthlete = z.infer<typeof DetailedAthleteSchema>;

// --- Stats Schemas ---
// Schema for individual activity totals (like runs, rides, swims)
const ActivityTotalSchema = z.object({
    count: z.number().int(),
    distance: z.number(), // In meters
    moving_time: z.number().int(), // In seconds
    elapsed_time: z.number().int(), // In seconds
    elevation_gain: z.number(), // In meters
    achievement_count: z.number().int().optional().nullable(), // Optional based on Strava docs examples
});

// Schema for the overall athlete stats response
const ActivityStatsSchema = z.object({
    biggest_ride_distance: z.number().optional().nullable(),
    biggest_climb_elevation_gain: z.number().optional().nullable(),
    recent_ride_totals: ActivityTotalSchema,
    recent_run_totals: ActivityTotalSchema,
    recent_swim_totals: ActivityTotalSchema,
    ytd_ride_totals: ActivityTotalSchema,
    ytd_run_totals: ActivityTotalSchema,
    ytd_swim_totals: ActivityTotalSchema,
    all_ride_totals: ActivityTotalSchema,
    all_run_totals: ActivityTotalSchema,
    all_swim_totals: ActivityTotalSchema,
});
export type StravaStats = z.infer<typeof ActivityStatsSchema>;

// --- Club Schema ---
// Based on https://developers.strava.com/docs/reference/#api-models-SummaryClub
const SummaryClubSchema = z.object({
    id: z.number().int(),
    resource_state: z.number().int(),
    name: z.string(),
    profile_medium: z.string().url(),
    cover_photo: z.string().url().nullable(),
    cover_photo_small: z.string().url().nullable(),
    sport_type: z.string(), // cycling, running, triathlon, other
    activity_types: z.array(z.string()), // More specific types
    city: z.string(),
    state: z.string(),
    country: z.string(),
    private: z.boolean(),
    member_count: z.number().int(),
    featured: z.boolean(),
    verified: z.boolean(),
    url: z.string().nullable(),
});
export type StravaClub = z.infer<typeof SummaryClubSchema>;
const StravaClubsResponseSchema = z.array(SummaryClubSchema);

// --- Gear Schema ---
const SummaryGearSchema = z.object({
    id: z.string(),
    resource_state: z.number().int(),
    primary: z.boolean(),
    name: z.string(),
    distance: z.number(), // Distance in meters for the gear
}).nullable().optional(); // Activity might not have gear or it might be null

// --- Map Schema ---
const MapSchema = z.object({
    id: z.string(),
    summary_polyline: z.string().optional().nullable(),
    resource_state: z.number().int(),
}).nullable(); // Activity might not have a map

// --- Segment Schema ---
const SummarySegmentSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    activity_type: z.string(),
    distance: z.number(),
    average_grade: z.number(),
    maximum_grade: z.number(),
    elevation_high: z.number().optional().nullable(),
    elevation_low: z.number().optional().nullable(),
    start_latlng: z.array(z.number()).optional().nullable(),
    end_latlng: z.array(z.number()).optional().nullable(),
    climb_category: z.number().int().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    private: z.boolean().optional(),
    starred: z.boolean().optional(),
});

const DetailedSegmentSchema = SummarySegmentSchema.extend({
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    total_elevation_gain: z.number().optional().nullable(),
    map: MapSchema, // Now defined above
    effort_count: z.number().int(),
    athlete_count: z.number().int(),
    hazardous: z.boolean(),
    star_count: z.number().int(),
});

export type StravaSegment = z.infer<typeof SummarySegmentSchema>;
export type StravaDetailedSegment = z.infer<typeof DetailedSegmentSchema>;
const StravaSegmentsResponseSchema = z.array(SummarySegmentSchema);

// --- Explorer Schemas ---
// Based on https://developers.strava.com/docs/reference/#api-models-ExplorerSegment
const ExplorerSegmentSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    climb_category: z.number().int(),
    climb_category_desc: z.string(), // e.g., "NC", "4", "3", "2", "1", "HC"
    avg_grade: z.number(),
    start_latlng: z.array(z.number()),
    end_latlng: z.array(z.number()),
    elev_difference: z.number(),
    distance: z.number(), // meters
    points: z.string(), // Encoded polyline
    starred: z.boolean().optional(), // Only included if authenticated
});

// Based on https://developers.strava.com/docs/reference/#api-models-ExplorerResponse
const ExplorerResponseSchema = z.object({
    segments: z.array(ExplorerSegmentSchema),
});
export type StravaExplorerSegment = z.infer<typeof ExplorerSegmentSchema>;
export type StravaExplorerResponse = z.infer<typeof ExplorerResponseSchema>;

// --- Detailed Activity Schema ---
// Based on https://developers.strava.com/docs/reference/#api-models-DetailedActivity
const DetailedActivitySchema = z.object({
    id: z.number().int(),
    resource_state: z.number().int(), // Should be 3 for detailed
    athlete: BaseAthleteSchema, // Contains athlete ID
    name: z.string(),
    distance: z.number().optional(), // Optional for stationary activities
    moving_time: z.number().int().optional(),
    elapsed_time: z.number().int(),
    total_elevation_gain: z.number().optional(),
    type: z.string(), // e.g., "Run", "Ride"
    sport_type: z.string(),
    start_date: z.string().datetime(),
    start_date_local: z.string().datetime(),
    timezone: z.string(),
    start_latlng: z.array(z.number()).nullable(),
    end_latlng: z.array(z.number()).nullable(),
    achievement_count: z.number().int().optional(),
    kudos_count: z.number().int(),
    comment_count: z.number().int(),
    athlete_count: z.number().int().optional(), // Number of athletes on the activity
    photo_count: z.number().int(),
    map: MapSchema,
    trainer: z.boolean(),
    commute: z.boolean(),
    manual: z.boolean(),
    private: z.boolean(),
    flagged: z.boolean(),
    gear_id: z.string().nullable(), // ID of the gear used
    average_speed: z.number().optional(),
    max_speed: z.number().optional(),
    average_cadence: z.number().optional().nullable(),
    average_temp: z.number().int().optional().nullable(),
    average_watts: z.number().optional().nullable(), // Rides only
    max_watts: z.number().int().optional().nullable(), // Rides only
    weighted_average_watts: z.number().int().optional().nullable(), // Rides only
    kilojoules: z.number().optional().nullable(), // Rides only
    device_watts: z.boolean().optional().nullable(), // Rides only
    has_heartrate: z.boolean(),
    average_heartrate: z.number().optional().nullable(),
    max_heartrate: z.number().optional().nullable(),
    calories: z.number().optional(),
    description: z.string().nullable(),
    // photos: // Add PhotosSummary schema if needed
    gear: SummaryGearSchema,
    device_name: z.string().nullable(),
    // segment_efforts: // Add DetailedSegmentEffort schema if needed
    // splits_metric: // Add Split schema if needed
    // splits_standard: // Add Split schema if needed
    // laps: // Add Lap schema if needed
    // best_efforts: // Add DetailedSegmentEffort schema if needed
});
export type StravaDetailedActivity = z.infer<typeof DetailedActivitySchema>;

// --- Meta Schemas ---
// Based on https://developers.strava.com/docs/reference/#api-models-MetaActivity
const MetaActivitySchema = z.object({
    id: z.number().int(),
});

// BaseAthleteSchema serves as MetaAthleteSchema (id only needed for effort)

// --- Segment Effort Schema ---
// Based on https://developers.strava.com/docs/reference/#api-models-DetailedSegmentEffort
const DetailedSegmentEffortSchema = z.object({
    id: z.number().int(),
    activity: MetaActivitySchema,
    athlete: BaseAthleteSchema,
    segment: SummarySegmentSchema, // Reuse SummarySegmentSchema
    name: z.string(), // Segment name
    elapsed_time: z.number().int(), // seconds
    moving_time: z.number().int(), // seconds
    start_date: z.string().datetime(),
    start_date_local: z.string().datetime(),
    distance: z.number(), // meters
    start_index: z.number().int().optional().nullable(),
    end_index: z.number().int().optional().nullable(),
    average_cadence: z.number().optional().nullable(),
    device_watts: z.boolean().optional().nullable(),
    average_watts: z.number().optional().nullable(),
    average_heartrate: z.number().optional().nullable(),
    max_heartrate: z.number().optional().nullable(),
    kom_rank: z.number().int().optional().nullable(), // 1-10, null if not in top 10
    pr_rank: z.number().int().optional().nullable(), // 1, 2, 3, or null
    hidden: z.boolean().optional().nullable(),
});
export type StravaDetailedSegmentEffort = z.infer<typeof DetailedSegmentEffortSchema>;

// --- Route Schema ---
// Based on https://developers.strava.com/docs/reference/#api-models-Route
const RouteSchema = z.object({
    athlete: BaseAthleteSchema, // Reuse BaseAthleteSchema
    description: z.string().nullable(),
    distance: z.number(), // meters
    elevation_gain: z.number().nullable(), // meters
    id: z.number().int(),
    id_str: z.string(),
    map: MapSchema, // Reuse MapSchema
    map_urls: z.object({ // Assuming structure based on context
        retina_url: z.string().url().optional().nullable(),
        url: z.string().url().optional().nullable(),
    }).optional().nullable(),
    name: z.string(),
    private: z.boolean(),
    resource_state: z.number().int(),
    starred: z.boolean(),
    sub_type: z.number().int(), // 1 for "road", 2 for "mtb", 3 for "cx", 4 for "trail", 5 for "mixed"
    type: z.number().int(), // 1 for "ride", 2 for "run"
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    estimated_moving_time: z.number().int().optional().nullable(), // seconds
    segments: z.array(SummarySegmentSchema).optional().nullable(), // Array of segments within the route
    timestamp: z.number().int().optional().nullable(), // Added based on common patterns
});
export type StravaRoute = z.infer<typeof RouteSchema>;
const StravaRoutesResponseSchema = z.array(RouteSchema);

// --- Token Refresh Functionality ---
// Calculate path to .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');

/**
 * Updates the .env file with new access and refresh tokens
 * @param accessToken - The new access token
 * @param refreshToken - The new refresh token
 */
async function updateTokensInEnvFile(accessToken: string, refreshToken: string): Promise<void> {
    try {
        let envContent = await fs.readFile(envPath, 'utf-8');
        const lines = envContent.split('\n');
        const newLines: string[] = [];
        let accessTokenUpdated = false;
        let refreshTokenUpdated = false;

        for (const line of lines) {
            if (line.startsWith('STRAVA_ACCESS_TOKEN=')) {
                newLines.push(`STRAVA_ACCESS_TOKEN=${accessToken}`);
                accessTokenUpdated = true;
            } else if (line.startsWith('STRAVA_REFRESH_TOKEN=')) {
                newLines.push(`STRAVA_REFRESH_TOKEN=${refreshToken}`);
                refreshTokenUpdated = true;
            } else if (line.trim() !== '') {
                newLines.push(line);
            }
        }

        if (!accessTokenUpdated) {
            newLines.push(`STRAVA_ACCESS_TOKEN=${accessToken}`);
        }
        if (!refreshTokenUpdated) {
            newLines.push(`STRAVA_REFRESH_TOKEN=${refreshToken}`);
        }

        await fs.writeFile(envPath, newLines.join('\n').trim() + '\n');
        console.error('✅ Tokens successfully refreshed and updated in .env file.');
    } catch (error) {
        console.error('Failed to update tokens in .env file:', error);
        // Continue execution even if file update fails
    }
}

/**
 * Refreshes the Strava API access token using the refresh token
 * @returns The new access token
 */
async function refreshAccessToken(): Promise<string> {
    const refreshToken = process.env.STRAVA_REFRESH_TOKEN;
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;
    
    if (!refreshToken || !clientId || !clientSecret) {
        throw new Error("Missing refresh credentials in .env (STRAVA_REFRESH_TOKEN, STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET)");
    }
    
    try {
        console.error('🔄 Refreshing Strava access token...');
        const response = await axios.post('https://www.strava.com/oauth/token', {
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
        });
        
        // Update tokens in environment variables for the current process
        const newAccessToken = response.data.access_token;
        const newRefreshToken = response.data.refresh_token;
        
        if (!newAccessToken || !newRefreshToken) {
            throw new Error('Refresh response missing required tokens');
        }
        
        process.env.STRAVA_ACCESS_TOKEN = newAccessToken;
        process.env.STRAVA_REFRESH_TOKEN = newRefreshToken;
        
        // Also update .env file for persistence
        await updateTokensInEnvFile(newAccessToken, newRefreshToken);
        
        console.error(`✅ Token refreshed. New token expires: ${new Date(response.data.expires_at * 1000).toLocaleString()}`);
        return newAccessToken;
    } catch (error) {
        console.error('Failed to refresh access token:', error);
        throw new Error(`Failed to refresh Strava access token: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Helper function to handle API errors with token refresh capability
 * @param error - The caught error
 * @param context - The context in which the error occurred
 * @param retryFn - Optional function to retry after token refresh
 * @returns Never returns normally, always throws an error or returns via retryFn
 */
export async function handleApiError<T>(error: unknown, context: string, retryFn?: () => Promise<T>): Promise<T> {
    // Check if it's an authentication error (401) that might be fixed by refreshing the token
    if (axios.isAxiosError(error) && error.response?.status === 401 && retryFn) {
        try {
            console.error(`🔑 Authentication error in ${context}. Attempting to refresh token...`);
            await refreshAccessToken();
            
            // Return the result of the retry function if it succeeds
            console.error(`🔄 Retrying ${context} after token refresh...`);
            return await retryFn();
        } catch (refreshError) {
            console.error(`❌ Token refresh failed: ${refreshError instanceof Error ? refreshError.message : String(refreshError)}`);
            // Fall through to normal error handling if refresh fails
        }
    }
    
    // Standard error handling (existing code)
    if (axios.isAxiosError(error)) {
        const status = error.response?.status || 'Unknown';
        const responseData = error.response?.data;
        const message = (typeof responseData === 'object' && responseData !== null && 'message' in responseData && typeof responseData.message === 'string')
            ? responseData.message
            : error.message;
        console.error(`Strava API request failed in ${context} with status ${status}: ${message}`);
        // Include response data in error log if helpful (be careful with sensitive data)
        if (responseData) {
             console.error(`Response data (${context}):`, JSON.stringify(responseData, null, 2));
        }
        throw new Error(`Strava API Error in ${context} (${status}): ${message}`);
    } else if (error instanceof Error) {
        console.error(`An unexpected error occurred in ${context}:`, error);
        throw new Error(`An unexpected error occurred in ${context}: ${error.message}`);
    } else {
        console.error(`An unknown error object was caught in ${context}:`, error);
        throw new Error(`An unknown error occurred in ${context}: ${String(error)}`);
    }
}

/**
 * Fetches recent activities for the authenticated athlete from the Strava API.
 *
 * @param accessToken - The Strava API access token.
 * @param perPage - The number of activities to fetch per page (default: 30).
 * @returns A promise that resolves to an array of Strava activities.
 * @throws Throws an error if the API request fails or the response format is unexpected.
 */
export async function getRecentActivities(accessToken: string, perPage = 30): Promise<any[]> {
    if (!accessToken) {
        throw new Error("Strava access token is required.");
    }

    try {
        const response = await stravaApi.get<unknown>("athlete/activities", {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { per_page: perPage }
        });

        const validationResult = StravaActivitiesResponseSchema.safeParse(response.data);

        if (!validationResult.success) {
            console.error("Strava API response validation failed (getRecentActivities):", validationResult.error);
            throw new Error(`Invalid data format received from Strava API: ${validationResult.error.message}`);
        }

        return validationResult.data;
    } catch (error) {
        // Pass a retry function to handleApiError
        return await handleApiError<any[]>(error, 'getRecentActivities', async () => {
            // Use new token from environment after refresh
            const newToken = process.env.STRAVA_ACCESS_TOKEN!;
            return getRecentActivities(newToken, perPage);
        });
    }
}

/**
 * Fetches profile information for the authenticated athlete.
 *
 * @param accessToken - The Strava API access token.
 * @returns A promise that resolves to the detailed athlete profile.
 * @throws Throws an error if the API request fails or the response format is unexpected.
 */
export async function getAuthenticatedAthlete(accessToken: string): Promise<StravaAthlete> {
    if (!accessToken) {
        throw new Error("Strava access token is required.");
    }

    try {
        const response = await stravaApi.get<unknown>("athlete", {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        // Validate the response data against the Zod schema
        const validationResult = DetailedAthleteSchema.safeParse(response.data);

        if (!validationResult.success) {
             // Log the raw response data on validation failure for debugging
             console.error("Strava API raw response data (getAuthenticatedAthlete):", JSON.stringify(response.data, null, 2));
             console.error("Strava API response validation failed (getAuthenticatedAthlete):", validationResult.error);
            throw new Error(`Invalid data format received from Strava API: ${validationResult.error.message}`);
        }
        // Type assertion is safe here due to successful validation
        return validationResult.data;

    } catch (error) {
         return await handleApiError<StravaAthlete>(error, 'getAuthenticatedAthlete', async () => {
             // Use new token from environment after refresh
             const newToken = process.env.STRAVA_ACCESS_TOKEN!;
             return getAuthenticatedAthlete(newToken);
         });
    }
}

/**
 * Fetches activity statistics for a specific athlete.
 *
 * @param accessToken - The Strava API access token.
 * @param athleteId - The ID of the athlete whose stats are being requested.
 * @returns A promise that resolves to the athlete's activity statistics.
 * @throws Throws an error if the API request fails or the response format is unexpected.
 */
export async function getAthleteStats(accessToken: string, athleteId: number): Promise<StravaStats> {
    if (!accessToken) {
        throw new Error("Strava access token is required.");
    }
     if (!athleteId) {
        throw new Error("Athlete ID is required to fetch stats.");
    }

    try {
        const response = await stravaApi.get<unknown>(`athletes/${athleteId}/stats`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const validationResult = ActivityStatsSchema.safeParse(response.data);

        if (!validationResult.success) {
             console.error("Strava API response validation failed (getAthleteStats):", validationResult.error);
            throw new Error(`Invalid data format received from Strava API: ${validationResult.error.message}`);
        }
        return validationResult.data;

    } catch (error) {
         return await handleApiError<StravaStats>(error, `getAthleteStats for ID ${athleteId}`, async () => {
             // Use new token from environment after refresh
             const newToken = process.env.STRAVA_ACCESS_TOKEN!;
             return getAthleteStats(newToken, athleteId);
         });
    }
}

/**
 * Fetches detailed information for a specific activity by its ID.
 *
 * @param accessToken - The Strava API access token.
 * @param activityId - The ID of the activity to fetch.
 * @returns A promise that resolves to the detailed activity data.
 * @throws Throws an error if the API request fails or the response format is unexpected.
 */
export async function getActivityById(accessToken: string, activityId: number): Promise<StravaDetailedActivity> {
    if (!accessToken) {
        throw new Error("Strava access token is required.");
    }
     if (!activityId) {
        throw new Error("Activity ID is required to fetch details.");
    }

    try {
        const response = await stravaApi.get<unknown>(`activities/${activityId}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const validationResult = DetailedActivitySchema.safeParse(response.data);

        if (!validationResult.success) {
             console.error(`Strava API validation failed (getActivityById: ${activityId}):`, validationResult.error);
            throw new Error(`Invalid data format received from Strava API: ${validationResult.error.message}`);
        }
        return validationResult.data;

    } catch (error) {
         return await handleApiError<StravaDetailedActivity>(error, `getActivityById for ID ${activityId}`, async () => {
             // Use new token from environment after refresh
             const newToken = process.env.STRAVA_ACCESS_TOKEN!;
             return getActivityById(newToken, activityId);
         });
    }
}

/**
 * Lists the clubs the authenticated athlete belongs to.
 *
 * @param accessToken - The Strava API access token.
 * @returns A promise that resolves to an array of the athlete's clubs.
 * @throws Throws an error if the API request fails or the response format is unexpected.
 */
export async function listAthleteClubs(accessToken: string): Promise<StravaClub[]> {
    if (!accessToken) {
        throw new Error("Strava access token is required.");
    }

    try {
        const response = await stravaApi.get<unknown>("athlete/clubs", {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const validationResult = StravaClubsResponseSchema.safeParse(response.data);

        if (!validationResult.success) {
             console.error("Strava API validation failed (listAthleteClubs):", validationResult.error);
            throw new Error(`Invalid data format received from Strava API: ${validationResult.error.message}`);
        }
        return validationResult.data;

    } catch (error) {
         return await handleApiError<StravaClub[]>(error, 'listAthleteClubs', async () => {
             // Use new token from environment after refresh
             const newToken = process.env.STRAVA_ACCESS_TOKEN!;
             return listAthleteClubs(newToken);
         });
    }
}

/**
 * Lists the segments starred by the authenticated athlete.
 *
 * @param accessToken - The Strava API access token.
 * @returns A promise that resolves to an array of the athlete's starred segments.
 * @throws Throws an error if the API request fails or the response format is unexpected.
 */
export async function listStarredSegments(accessToken: string): Promise<StravaSegment[]> {
    if (!accessToken) {
        throw new Error("Strava access token is required.");
    }

    try {
        // Strava API uses page/per_page but often defaults reasonably for lists like this.
        // Add pagination parameters if needed later.
        const response = await stravaApi.get<unknown>("segments/starred", {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const validationResult = StravaSegmentsResponseSchema.safeParse(response.data);

        if (!validationResult.success) {
            console.error("Strava API validation failed (listStarredSegments):", validationResult.error);
            throw new Error(`Invalid data format received from Strava API: ${validationResult.error.message}`);
        }
        return validationResult.data;

    } catch (error) {
        return await handleApiError<StravaSegment[]>(error, 'listStarredSegments', async () => {
            // Use new token from environment after refresh
            const newToken = process.env.STRAVA_ACCESS_TOKEN!;
            return listStarredSegments(newToken);
        });
    }
}

/**
 * Fetches detailed information for a specific segment by its ID.
 *
 * @param accessToken - The Strava API access token.
 * @param segmentId - The ID of the segment to fetch.
 * @returns A promise that resolves to the detailed segment data.
 * @throws Throws an error if the API request fails or the response format is unexpected.
 */
export async function getSegmentById(accessToken: string, segmentId: number): Promise<StravaDetailedSegment> {
    if (!accessToken) {
        throw new Error("Strava access token is required.");
    }
    if (!segmentId) {
        throw new Error("Segment ID is required.");
    }

    try {
        const response = await stravaApi.get<unknown>(`segments/${segmentId}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const validationResult = DetailedSegmentSchema.safeParse(response.data);

        if (!validationResult.success) {
            console.error(`Strava API validation failed (getSegmentById: ${segmentId}):`, validationResult.error);
            throw new Error(`Invalid data format received from Strava API: ${validationResult.error.message}`);
        }
        return validationResult.data;

    } catch (error) {
        return await handleApiError<StravaDetailedSegment>(error, `getSegmentById for ID ${segmentId}`, async () => {
            // Use new token from environment after refresh
            const newToken = process.env.STRAVA_ACCESS_TOKEN!;
            return getSegmentById(newToken, segmentId);
        });
    }
}

/**
 * Returns the top 10 segments matching a specified query.
 *
 * @param accessToken - The Strava API access token.
 * @param bounds - String representing the latitudes and longitudes for the corners of the search map, `latitude,longitude,latitude,longitude`.
 * @param activityType - Optional filter for activity type ("running" or "riding").
 * @param minCat - Optional minimum climb category filter.
 * @param maxCat - Optional maximum climb category filter.
 * @returns A promise that resolves to the explorer response containing matching segments.
 * @throws Throws an error if the API request fails or the response format is unexpected.
 */
export async function exploreSegments(
    accessToken: string,
    bounds: string,
    activityType?: 'running' | 'riding',
    minCat?: number,
    maxCat?: number
): Promise<StravaExplorerResponse> {
    if (!accessToken) {
        throw new Error("Strava access token is required.");
    }
    if (!bounds || !/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(bounds)) {
        throw new Error("Valid bounds (lat,lng,lat,lng) are required for exploring segments.");
    }

    const params: Record<string, any> = {
        bounds: bounds,
    };
    if (activityType) params.activity_type = activityType;
    if (minCat !== undefined) params.min_cat = minCat;
    if (maxCat !== undefined) params.max_cat = maxCat;

    try {
        const response = await stravaApi.get<unknown>("segments/explore", {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: params
        });

        const validationResult = ExplorerResponseSchema.safeParse(response.data);

        if (!validationResult.success) {
            console.error("Strava API validation failed (exploreSegments):", validationResult.error);
            throw new Error(`Invalid data format received from Strava API: ${validationResult.error.message}`);
        }
        return validationResult.data;

    } catch (error) {
        return await handleApiError<StravaExplorerResponse>(error, `exploreSegments with bounds ${bounds}`, async () => {
            // Use new token from environment after refresh
            const newToken = process.env.STRAVA_ACCESS_TOKEN!;
            return exploreSegments(newToken, bounds, activityType);
        });
    }
}

/**
 * Stars or unstars a segment for the authenticated athlete.
 *
 * @param accessToken - The Strava API access token.
 * @param segmentId - The ID of the segment to star/unstar.
 * @param starred - Boolean indicating whether to star (true) or unstar (false) the segment.
 * @returns A promise that resolves to the detailed segment data after the update.
 * @throws Throws an error if the API request fails or the response format is unexpected.
 */
export async function starSegment(accessToken: string, segmentId: number, starred: boolean): Promise<StravaDetailedSegment> {
    if (!accessToken) {
        throw new Error("Strava access token is required.");
    }
    if (!segmentId) {
        throw new Error("Segment ID is required to star/unstar.");
    }
    if (starred === undefined) {
        throw new Error("Starred status (true/false) is required.");
    }

    try {
        const response = await stravaApi.put<unknown>(
            `segments/${segmentId}/starred`,
            { starred: starred }, // Data payload for the PUT request
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json' // Important for PUT requests with body
                }
            }
        );

        // The response is expected to be the updated DetailedSegment
        const validationResult = DetailedSegmentSchema.safeParse(response.data);

        if (!validationResult.success) {
            console.error(`Strava API validation failed (starSegment: ${segmentId}):`, validationResult.error);
            throw new Error(`Invalid data format received from Strava API: ${validationResult.error.message}`);
        }
        return validationResult.data;

    } catch (error) {
        return await handleApiError<StravaDetailedSegment>(error, `starSegment for ID ${segmentId} with starred=${starred}`, async () => {
            // Use new token from environment after refresh
            const newToken = process.env.STRAVA_ACCESS_TOKEN!;
            return starSegment(newToken, segmentId, starred);
        });
    }
}

/**
 * Fetches detailed information about a specific segment effort by its ID.
 *
 * @param accessToken - The Strava API access token.
 * @param effortId - The ID of the segment effort to fetch.
 * @returns A promise that resolves to the detailed segment effort data.
 * @throws Throws an error if the API request fails or the response format is unexpected.
 */
export async function getSegmentEffort(accessToken: string, effortId: number): Promise<StravaDetailedSegmentEffort> {
    if (!accessToken) {
        throw new Error("Strava access token is required.");
    }
     if (!effortId) {
        throw new Error("Segment Effort ID is required to fetch details.");
    }

    try {
        const response = await stravaApi.get<unknown>(`segment_efforts/${effortId}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const validationResult = DetailedSegmentEffortSchema.safeParse(response.data);

        if (!validationResult.success) {
             console.error(`Strava API validation failed (getSegmentEffort: ${effortId}):`, validationResult.error);
            throw new Error(`Invalid data format received from Strava API: ${validationResult.error.message}`);
        }
        return validationResult.data;

    } catch (error) {
        return await handleApiError<StravaDetailedSegmentEffort>(error, `getSegmentEffort for ID ${effortId}`, async () => {
            // Use new token from environment after refresh
            const newToken = process.env.STRAVA_ACCESS_TOKEN!;
            return getSegmentEffort(newToken, effortId);
        });
    }
}

/**
 * Fetches a list of segment efforts for a given segment, filtered by date range for the authenticated athlete.
 *
 * @param accessToken - The Strava API access token.
 * @param segmentId - The ID of the segment.
 * @param startDateLocal - Optional ISO 8601 start date.
 * @param endDateLocal - Optional ISO 8601 end date.
 * @param perPage - Optional number of items per page.
 * @returns A promise that resolves to an array of segment efforts.
 * @throws Throws an error if the API request fails or the response format is unexpected.
 */
export async function listSegmentEfforts(
    accessToken: string,
    segmentId: number,
    params: SegmentEffortsParams = {}
): Promise<StravaDetailedSegmentEffort[]> {
    if (!accessToken) {
        throw new Error("Strava access token is required.");
    }
    if (!segmentId) {
        throw new Error("Segment ID is required to list efforts.");
    }

    const { startDateLocal, endDateLocal, perPage } = params;

    const queryParams: Record<string, any> = {
        segment_id: segmentId,
    };
    if (startDateLocal) queryParams.start_date_local = startDateLocal;
    if (endDateLocal) queryParams.end_date_local = endDateLocal;
    if (perPage) queryParams.per_page = perPage;

    try {
        const response = await stravaApi.get<unknown>("segment_efforts", {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: queryParams
        });

        // Response is an array of DetailedSegmentEffort
        const validationResult = z.array(DetailedSegmentEffortSchema).safeParse(response.data);

        if (!validationResult.success) {
            console.error(`Strava API validation failed (listSegmentEfforts: segment ${segmentId}):`, validationResult.error);
            throw new Error(`Invalid data format received from Strava API: ${validationResult.error.message}`);
        }
        return validationResult.data;

    } catch (error) {
        return await handleApiError<StravaDetailedSegmentEffort[]>(error, `listSegmentEfforts for segment ID ${segmentId}`, async () => {
            // Use new token from environment after refresh
            const newToken = process.env.STRAVA_ACCESS_TOKEN!;
            return listSegmentEfforts(newToken, segmentId, params);
        });
    }
}

// Add the missing interface for segment efforts parameters
export interface SegmentEffortsParams {
    startDateLocal?: string;
    endDateLocal?: string;
    perPage?: number;
}

/**
 * Lists routes created by a specific athlete.
 *
 * @param accessToken - The Strava API access token.
 * @param athleteId - The ID of the athlete whose routes are being requested.
 * @param page - Optional page number for pagination.
 * @param perPage - Optional number of items per page.
 * @returns A promise that resolves to an array of the athlete's routes.
 * @throws Throws an error if the API request fails or the response format is unexpected.
 */
export async function listAthleteRoutes(accessToken: string, page = 1, perPage = 30): Promise<StravaRoute[]> {
    if (!accessToken) {
        throw new Error("Strava access token is required.");
    }

    try {
        const response = await stravaApi.get<unknown>("athlete/routes", {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { 
                page: page,
                per_page: perPage
            }
        });

        const validationResult = StravaRoutesResponseSchema.safeParse(response.data);

        if (!validationResult.success) {
            console.error("Strava API validation failed (listAthleteRoutes):", validationResult.error);
            throw new Error(`Invalid data format received from Strava API: ${validationResult.error.message}`);
        }
        return validationResult.data;

    } catch (error) {
        return await handleApiError<StravaRoute[]>(error, 'listAthleteRoutes', async () => {
            // Use new token from environment after refresh
            const newToken = process.env.STRAVA_ACCESS_TOKEN!;
            return listAthleteRoutes(newToken, page, perPage);
        });
    }
}

/**
 * Fetches detailed information for a specific route by its ID.
 *
 * @param accessToken - The Strava API access token.
 * @param routeId - The ID of the route to fetch.
 * @returns A promise that resolves to the detailed route data.
 * @throws Throws an error if the API request fails or the response format is unexpected.
 */
export async function getRouteById(accessToken: string, routeId: number): Promise<StravaRoute> {
    const url = `routes/${routeId}`;
    try {
        const response = await stravaApi.get(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        // Validate the response against the Zod schema
        const validatedRoute = RouteSchema.parse(response.data);
        return validatedRoute;
    } catch (error) {
        return await handleApiError<StravaRoute>(error, `fetching route ${routeId}`, async () => {
            // Use new token from environment after refresh
            const newToken = process.env.STRAVA_ACCESS_TOKEN!;
            return getRouteById(newToken, routeId);
        });
    }
}

/**
 * Fetches the GPX data for a specific route.
 * Note: This endpoint returns raw GPX data (XML string), not JSON.
 * @param accessToken Strava API access token
 * @param routeId The ID of the route to export
 * @returns Promise resolving to the GPX data as a string
 */
export async function exportRouteGpx(accessToken: string, routeId: number): Promise<string> {
    const url = `routes/${routeId}/export_gpx`;
    try {
        // Expecting text/xml response, Axios should handle it as string
        const response = await stravaApi.get<string>(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
            // Ensure response is treated as text
            responseType: 'text',
        });
        if (typeof response.data !== 'string') {
             throw new Error('Invalid response format received from Strava API for GPX export.');
        }
        return response.data;
    } catch (error) {
        return await handleApiError<string>(error, `exporting route ${routeId} as GPX`, async () => {
            // Use new token from environment after refresh
            const newToken = process.env.STRAVA_ACCESS_TOKEN!;
            return exportRouteGpx(newToken, routeId);
        });
    }
}

/**
 * Fetches the TCX data for a specific route.
 * Note: This endpoint returns raw TCX data (XML string), not JSON.
 * @param accessToken Strava API access token
 * @param routeId The ID of the route to export
 * @returns Promise resolving to the TCX data as a string
 */
export async function exportRouteTcx(accessToken: string, routeId: number): Promise<string> {
    const url = `routes/${routeId}/export_tcx`;
    try {
        // Expecting text/xml response, Axios should handle it as string
        const response = await stravaApi.get<string>(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
             // Ensure response is treated as text
             responseType: 'text',
        });
        if (typeof response.data !== 'string') {
            throw new Error('Invalid response format received from Strava API for TCX export.');
       }
        return response.data;
    } catch (error) {
        return await handleApiError<string>(error, `exporting route ${routeId} as TCX`, async () => {
            // Use new token from environment after refresh
            const newToken = process.env.STRAVA_ACCESS_TOKEN!;
            return exportRouteTcx(newToken, routeId);
        });
    }
}

// --- Lap Schema ---
// Based on https://developers.strava.com/docs/reference/#api-models-Lap and user-provided image
const LapSchema = z.object({
    id: z.number().int(),
    resource_state: z.number().int(),
    name: z.string(),
    activity: BaseAthleteSchema, // Reusing BaseAthleteSchema for {id, resource_state}
    athlete: BaseAthleteSchema, // Reusing BaseAthleteSchema for {id, resource_state}
    elapsed_time: z.number().int(), // In seconds
    moving_time: z.number().int(), // In seconds
    start_date: z.string().datetime(),
    start_date_local: z.string().datetime(),
    distance: z.number(), // In meters
    start_index: z.number().int().optional().nullable(), // Index in the activity stream
    end_index: z.number().int().optional().nullable(), // Index in the activity stream
    total_elevation_gain: z.number().optional().nullable(), // In meters
    average_speed: z.number().optional().nullable(), // In meters per second
    max_speed: z.number().optional().nullable(), // In meters per second
    average_cadence: z.number().optional().nullable(), // RPM
    average_watts: z.number().optional().nullable(), // Rides only
    device_watts: z.boolean().optional().nullable(), // Whether power sensor was used
    average_heartrate: z.number().optional().nullable(), // Average heart rate during lap
    max_heartrate: z.number().optional().nullable(), // Max heart rate during lap
    lap_index: z.number().int(), // The position of this lap in the activity
    split: z.number().int().optional().nullable(), // Associated split number (e.g., for marathons)
});

export type StravaLap = z.infer<typeof LapSchema>;
const StravaLapsResponseSchema = z.array(LapSchema);

/**
 * Retrieves the laps for a specific activity.
 * @param accessToken The Strava API access token.
 * @param activityId The ID of the activity.
 * @returns A promise resolving to an array of lap objects.
 */
export async function getActivityLaps(accessToken: string, activityId: number | string): Promise<StravaLap[]> {
    if (!accessToken) {
        throw new Error("Strava access token is required.");
    }

    try {
        const response = await stravaApi.get(`/activities/${activityId}/laps`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        
        const validationResult = StravaLapsResponseSchema.safeParse(response.data);
        
        if (!validationResult.success) {
            console.error(`Strava API validation failed (getActivityLaps: ${activityId}):`, validationResult.error);
            throw new Error(`Invalid data format received from Strava API: ${validationResult.error.message}`);
        }
        
        return validationResult.data;
    } catch (error) {
        return await handleApiError<StravaLap[]>(error, `getActivityLaps(${activityId})`, async () => {
            // Use new token from environment after refresh
            const newToken = process.env.STRAVA_ACCESS_TOKEN!;
            return getActivityLaps(newToken, activityId);
        });
    }
}