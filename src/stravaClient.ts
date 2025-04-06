import axios from "axios";
import { z } from "zod";

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
    measurement_preference: z.enum(["feet", "meters"]),
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
}).nullable(); // Activity might not have gear

// --- Map Schema ---
const MapSchema = z.object({
    id: z.string(),
    summary_polyline: z.string().nullable(),
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
            console.error("Strava API response validation failed (getRecentActivities):", validationResult.error);
            throw new Error(`Invalid data format received from Strava API: ${validationResult.error.message}`);
        }

        return validationResult.data;
    } catch (error) {
        handleApiError(error, 'getRecentActivities');
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
        const response = await axios.get<unknown>("https://www.strava.com/api/v3/athlete", {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        // Validate the response data against the Zod schema
        const validationResult = DetailedAthleteSchema.safeParse(response.data);

        if (!validationResult.success) {
             console.error("Strava API response validation failed (getAuthenticatedAthlete):", validationResult.error);
            throw new Error(`Invalid data format received from Strava API: ${validationResult.error.message}`);
        }
        // Type assertion is safe here due to successful validation
        return validationResult.data;

    } catch (error) {
         handleApiError(error, 'getAuthenticatedAthlete');
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
        const response = await axios.get<unknown>(`https://www.strava.com/api/v3/athletes/${athleteId}/stats`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const validationResult = ActivityStatsSchema.safeParse(response.data);

        if (!validationResult.success) {
             console.error("Strava API response validation failed (getAthleteStats):", validationResult.error);
            throw new Error(`Invalid data format received from Strava API: ${validationResult.error.message}`);
        }
        return validationResult.data;

    } catch (error) {
         handleApiError(error, `getAthleteStats for ID ${athleteId}`);
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
        const response = await axios.get<unknown>(`https://www.strava.com/api/v3/activities/${activityId}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const validationResult = DetailedActivitySchema.safeParse(response.data);

        if (!validationResult.success) {
             console.error(`Strava API validation failed (getActivityById: ${activityId}):`, validationResult.error);
            throw new Error(`Invalid data format received from Strava API: ${validationResult.error.message}`);
        }
        return validationResult.data;

    } catch (error) {
         handleApiError(error, `getActivityById for ID ${activityId}`);
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
        const response = await axios.get<unknown>("https://www.strava.com/api/v3/athlete/clubs", {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const validationResult = StravaClubsResponseSchema.safeParse(response.data);

        if (!validationResult.success) {
             console.error("Strava API validation failed (listAthleteClubs):", validationResult.error);
            throw new Error(`Invalid data format received from Strava API: ${validationResult.error.message}`);
        }
        return validationResult.data;

    } catch (error) {
         handleApiError(error, 'listAthleteClubs');
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
        const response = await axios.get<unknown>("https://www.strava.com/api/v3/segments/starred", {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const validationResult = StravaSegmentsResponseSchema.safeParse(response.data);

        if (!validationResult.success) {
             console.error("Strava API validation failed (listStarredSegments):", validationResult.error);
            throw new Error(`Invalid data format received from Strava API: ${validationResult.error.message}`);
        }
        return validationResult.data;

    } catch (error) {
         handleApiError(error, 'listStarredSegments');
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
        throw new Error("Segment ID is required to fetch details.");
    }

    try {
        const response = await axios.get<unknown>(`https://www.strava.com/api/v3/segments/${segmentId}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const validationResult = DetailedSegmentSchema.safeParse(response.data);

        if (!validationResult.success) {
             console.error(`Strava API validation failed (getSegmentById: ${segmentId}):`, validationResult.error);
            throw new Error(`Invalid data format received from Strava API: ${validationResult.error.message}`);
        }
        return validationResult.data;

    } catch (error) {
         handleApiError(error, `getSegmentById for ID ${segmentId}`);
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
        const response = await axios.get<unknown>("https://www.strava.com/api/v3/segments/explore", {
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
        handleApiError(error, `exploreSegments with bounds ${bounds}`);
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
        const response = await axios.put<unknown>(
            `https://www.strava.com/api/v3/segments/${segmentId}/starred`,
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
        handleApiError(error, `starSegment for ID ${segmentId} with starred=${starred}`);
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
export async function getSegmentEffortById(accessToken: string, effortId: number): Promise<StravaDetailedSegmentEffort> {
    if (!accessToken) {
        throw new Error("Strava access token is required.");
    }
     if (!effortId) {
        throw new Error("Segment Effort ID is required to fetch details.");
    }

    try {
        const response = await axios.get<unknown>(`https://www.strava.com/api/v3/segment_efforts/${effortId}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const validationResult = DetailedSegmentEffortSchema.safeParse(response.data);

        if (!validationResult.success) {
             console.error(`Strava API validation failed (getSegmentEffortById: ${effortId}):`, validationResult.error);
            throw new Error(`Invalid data format received from Strava API: ${validationResult.error.message}`);
        }
        return validationResult.data;

    } catch (error) {
         handleApiError(error, `getSegmentEffortById for ID ${effortId}`);
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
    startDateLocal?: string,
    endDateLocal?: string,
    perPage?: number
): Promise<StravaDetailedSegmentEffort[]> {
    if (!accessToken) {
        throw new Error("Strava access token is required.");
    }
    if (!segmentId) {
        throw new Error("Segment ID is required to list efforts.");
    }

    const params: Record<string, any> = {
        segment_id: segmentId,
    };
    if (startDateLocal) params.start_date_local = startDateLocal;
    if (endDateLocal) params.end_date_local = endDateLocal;
    if (perPage) params.per_page = perPage;

    try {
        const response = await axios.get<unknown>("https://www.strava.com/api/v3/segment_efforts", {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: params
        });

        // Response is an array of DetailedSegmentEffort
        const validationResult = z.array(DetailedSegmentEffortSchema).safeParse(response.data);

        if (!validationResult.success) {
            console.error(`Strava API validation failed (listSegmentEfforts: segment ${segmentId}):`, validationResult.error);
            throw new Error(`Invalid data format received from Strava API: ${validationResult.error.message}`);
        }
        return validationResult.data;

    } catch (error) {
        handleApiError(error, `listSegmentEfforts for segment ID ${segmentId}`);
    }
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
export async function listAthleteRoutes(
    accessToken: string,
    athleteId: number,
    page?: number,
    perPage?: number
): Promise<StravaRoute[]> {
    if (!accessToken) {
        throw new Error("Strava access token is required.");
    }
    if (!athleteId) {
        throw new Error("Athlete ID is required to list routes.");
    }

    const params: Record<string, any> = {};
    if (page) params.page = page;
    if (perPage) params.per_page = perPage;

    try {
        const response = await axios.get<unknown>(`https://www.strava.com/api/v3/athletes/${athleteId}/routes`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: params
        });

        const validationResult = StravaRoutesResponseSchema.safeParse(response.data);

        if (!validationResult.success) {
            console.error(`Strava API validation failed (listAthleteRoutes for athlete ${athleteId}):`, validationResult.error);
            throw new Error(`Invalid data format received from Strava API: ${validationResult.error.message}`);
        }
        return validationResult.data;

    } catch (error) {
        handleApiError(error, `listAthleteRoutes for athlete ID ${athleteId}`);
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
    const url = `https://www.strava.com/api/v3/routes/${routeId}`;
    try {
        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        // Validate the response against the Zod schema
        const validatedRoute = RouteSchema.parse(response.data);
        return validatedRoute;
    } catch (error) {
        handleApiError(error, `fetching route ${routeId}`);
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
    const url = `https://www.strava.com/api/v3/routes/${routeId}/export_gpx`;
    try {
        // Expecting text/xml response, Axios should handle it as string
        const response = await axios.get<string>(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
            // Ensure response is treated as text
            responseType: 'text',
        });
        if (typeof response.data !== 'string') {
             throw new Error('Invalid response format received from Strava API for GPX export.');
        }
        return response.data;
    } catch (error) {
        handleApiError(error, `exporting route ${routeId} as GPX`);
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
    const url = `https://www.strava.com/api/v3/routes/${routeId}/export_tcx`;
    try {
        // Expecting text/xml response, Axios should handle it as string
        const response = await axios.get<string>(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
             // Ensure response is treated as text
             responseType: 'text',
        });
        if (typeof response.data !== 'string') {
            throw new Error('Invalid response format received from Strava API for TCX export.');
       }
        return response.data;
    } catch (error) {
        handleApiError(error, `exporting route ${routeId} as TCX`);
    }
}

// --- Error Handling Helper ---

/**
 * Centralized error handler for Strava API calls.
 * Logs the error details and throws a standardized error.
 * @param error - The error object caught (potentially unknown).
 * @param context - String identifying the function where the error occurred.
 */
function handleApiError(error: unknown, context: string): never {
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