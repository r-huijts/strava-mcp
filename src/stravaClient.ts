import axios from "axios";
import { z } from "zod";
import { loadConfig, updateTokens } from "./config.js";

export const stravaApi = axios.create({
  baseURL: "https://www.strava.com/api/v3",
});

stravaApi.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    console.error("[DEBUG stravaClient] Request Error Interceptor:", error);
    return Promise.reject(error);
  },
);

async function refreshAccessToken(): Promise<string> {
  const config = await loadConfig();
  const refreshToken = config.refreshToken;
  const clientId = config.clientId;
  const clientSecret = config.clientSecret;

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error(
      "Missing refresh credentials. Please connect your Strava account first using the 'connect-strava' tool.",
    );
  }

  try {
    console.error("🔄 Refreshing Strava access token...");
    const response = await axios.post("https://www.strava.com/oauth/token", {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    const newAccessToken = response.data.access_token;
    const newRefreshToken = response.data.refresh_token;
    const expiresAt = response.data.expires_at;

    if (!newAccessToken || !newRefreshToken) {
      throw new Error("Refresh response missing required tokens");
    }

    await updateTokens(newAccessToken, newRefreshToken, expiresAt);
    console.error(
      `✅ Token refreshed. New token expires: ${new Date(expiresAt * 1000).toLocaleString()}`,
    );
    return newAccessToken;
  } catch (error) {
    console.error("Failed to refresh access token:", error);
    throw new Error(
      `Failed to refresh Strava access token: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function handleApiError<T>(
  error: unknown,
  context: string,
  retryFn?: () => Promise<T>,
): Promise<T> {
  if (axios.isAxiosError(error) && error.response?.status === 401 && retryFn) {
    try {
      console.error(
        `🔑 Authentication error in ${context}. Attempting to refresh token...`,
      );
      await refreshAccessToken();
      console.error(`🔄 Retrying ${context} after token refresh...`);
      return await retryFn();
    } catch (refreshError) {
      console.error(
        `❌ Token refresh failed: ${refreshError instanceof Error ? refreshError.message : String(refreshError)}`,
      );
    }
  }

  if (axios.isAxiosError(error) && error.response?.status === 402) {
    console.error(`🔒 Subscription Required in ${context}. Status: 402`);
    throw new Error(
      `SUBSCRIPTION_REQUIRED: Access to this feature requires a Strava subscription. Context: ${context}`,
    );
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status || "Unknown";
    const responseData = error.response?.data;
    const message =
      typeof responseData === "object" &&
      responseData !== null &&
      "message" in responseData &&
      typeof responseData.message === "string"
        ? responseData.message
        : error.message;
    console.error(
      `Strava API request failed in ${context} with status ${status}: ${message}`,
    );
    if (responseData) {
      console.error(
        `Response data (${context}):`,
        JSON.stringify(responseData, null, 2),
      );
    }
    throw new Error(`Strava API Error in ${context} (${status}): ${message}`);
  } else if (error instanceof Error) {
    console.error(`An unexpected error occurred in ${context}:`, error);
    throw new Error(
      `An unexpected error occurred in ${context}: ${error.message}`,
    );
  } else {
    console.error(`An unknown error object was caught in ${context}:`, error);
    throw new Error(
      `An unknown error occurred in ${context}: ${String(error)}`,
    );
  }
}

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
  bikes: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        primary: z.boolean().optional(),
        resource_state: z.number().int().optional(),
        distance: z.number().optional(),
      }),
    )
    .optional()
    .nullable(),
  shoes: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        primary: z.boolean().optional(),
        resource_state: z.number().int().optional(),
        distance: z.number().optional(),
        converted_distance: z.number().optional(),
      }),
    )
    .optional()
    .nullable(),
});

export type StravaAthlete = z.infer<typeof DetailedAthleteSchema>;

const ActivityTotalSchema = z.object({
  count: z.number().int(),
  distance: z.number(),
  moving_time: z.number().int(),
  elapsed_time: z.number().int(),
  elevation_gain: z.number(),
  achievement_count: z.number().int().optional().nullable(),
});

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

const DistributionBucketSchema = z.object({
  max: z.number(),
  min: z.number(),
  time: z.number().int(),
});

const ZoneSchema = z.object({
  min: z.number(),
  max: z.number().optional(),
});

const HeartRateZoneSchema = z.object({
  custom_zones: z.boolean(),
  zones: z.array(ZoneSchema),
  distribution_buckets: z.array(DistributionBucketSchema).optional(),
  resource_state: z.number().int().optional(),
  sensor_based: z.boolean().optional(),
  points: z.number().int().optional(),
  type: z.literal("heartrate").optional(),
});

const PowerZoneSchema = z.object({
  zones: z.array(ZoneSchema),
  distribution_buckets: z.array(DistributionBucketSchema).optional(),
  resource_state: z.number().int().optional(),
  sensor_based: z.boolean().optional(),
  points: z.number().int().optional(),
  type: z.literal("power").optional(),
});

const AthleteZonesSchema = z.object({
  heart_rate: HeartRateZoneSchema.optional(),
  power: PowerZoneSchema.optional(),
});

export type StravaAthleteZones = z.infer<typeof AthleteZonesSchema>;

export async function getLoggedInAthlete(
  accessToken: string,
): Promise<StravaAthlete> {
  if (!accessToken) throw new Error("Strava access token is required.");
  try {
    const response = await stravaApi.get<unknown>("athlete", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const validationResult = DetailedAthleteSchema.safeParse(response.data);
    if (!validationResult.success) {
      console.error(
        "Strava API raw response data (getLoggedInAthlete):",
        JSON.stringify(response.data, null, 2),
      );
      console.error(
        "Strava API response validation failed (getLoggedInAthlete):",
        validationResult.error,
      );
      throw new Error(
        `Invalid data format received from Strava API: ${validationResult.error.message}`,
      );
    }
    return validationResult.data;
  } catch (error) {
    return await handleApiError<StravaAthlete>(
      error,
      "getLoggedInAthlete",
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return getLoggedInAthlete(newToken);
      },
    );
  }
}

export async function updateLoggedInAthlete(
  accessToken: string,
  weight: number,
): Promise<any> {
  if (!accessToken) throw new Error("Strava access token is required.");
  try {
    const response = await stravaApi.put(
      "athlete",
      { weight },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    return response.data;
  } catch (error) {
    return await handleApiError<any>(
      error,
      "updateLoggedInAthlete",
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return updateLoggedInAthlete(newToken, weight);
      },
    );
  }
}

export async function getLoggedInAthleteZones(
  accessToken: string,
): Promise<StravaAthleteZones> {
  if (!accessToken) throw new Error("Strava access token is required.");
  try {
    const response = await stravaApi.get<unknown>("/athlete/zones", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const validationResult = AthleteZonesSchema.safeParse(response.data);
    if (!validationResult.success) {
      console.error(
        `Strava API validation failed (getLoggedInAthleteZones):`,
        validationResult.error,
      );
      throw new Error(
        `Invalid data format received from Strava API: ${validationResult.error.message}`,
      );
    }
    return validationResult.data;
  } catch (error) {
    return await handleApiError<StravaAthleteZones>(
      error,
      `getLoggedInAthleteZones`,
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return getLoggedInAthleteZones(newToken);
      },
    );
  }
}

export async function getAthleteStats(
  accessToken: string,
  athleteId: number,
): Promise<StravaStats> {
  if (!accessToken) throw new Error("Strava access token is required.");
  if (!athleteId) throw new Error("Athlete ID is required to fetch stats.");
  try {
    const response = await stravaApi.get<unknown>(
      `athletes/${athleteId}/stats`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    const validationResult = ActivityStatsSchema.safeParse(response.data);
    if (!validationResult.success) {
      console.error(
        "Strava API response validation failed (getAthleteStats):",
        validationResult.error,
      );
      throw new Error(
        `Invalid data format received from Strava API: ${validationResult.error.message}`,
      );
    }
    return validationResult.data;
  } catch (error) {
    return await handleApiError<StravaStats>(
      error,
      `getAthleteStats for ID ${athleteId}`,
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return getAthleteStats(newToken, athleteId);
      },
    );
  }
}

const StravaActivitySchema = z.object({
  id: z.number().int().optional(),
  name: z.string(),
  distance: z.number(),
  start_date: z.string().datetime(),
  type: z.string().optional(),
  sport_type: z.string().optional(),
  moving_time: z.number().int().optional(),
});

const StravaActivitiesResponseSchema = z.array(StravaActivitySchema);

const SummaryGearSchema = z
  .object({
    id: z.string(),
    resource_state: z.number().int(),
    primary: z.boolean(),
    name: z.string(),
    distance: z.number(),
  })
  .nullable()
  .optional();

const MapSchema = z
  .object({
    id: z.string(),
    summary_polyline: z.string().optional().nullable(),
    resource_state: z.number().int(),
  })
  .nullable();

const DetailedActivitySchema = z.object({
  id: z.number().int(),
  resource_state: z.number().int(),
  athlete: BaseAthleteSchema,
  name: z.string(),
  distance: z.number().optional(),
  moving_time: z.number().int().optional(),
  elapsed_time: z.number().int(),
  total_elevation_gain: z.number().optional(),
  type: z.string(),
  sport_type: z.string(),
  start_date: z.string().datetime(),
  start_date_local: z.string().datetime(),
  timezone: z.string(),
  start_latlng: z.array(z.number()).nullable(),
  end_latlng: z.array(z.number()).nullable(),
  achievement_count: z.number().int().optional(),
  kudos_count: z.number().int(),
  comment_count: z.number().int(),
  athlete_count: z.number().int().optional(),
  photo_count: z.number().int(),
  map: MapSchema,
  trainer: z.boolean(),
  commute: z.boolean(),
  manual: z.boolean(),
  private: z.boolean(),
  flagged: z.boolean(),
  gear_id: z.string().nullable(),
  average_speed: z.number().optional(),
  max_speed: z.number().optional(),
  average_cadence: z.number().optional().nullable(),
  average_temp: z.number().int().optional().nullable(),
  average_watts: z.number().optional().nullable(),
  max_watts: z.number().int().optional().nullable(),
  weighted_average_watts: z.number().int().optional().nullable(),
  kilojoules: z.number().optional().nullable(),
  device_watts: z.boolean().optional().nullable(),
  has_heartrate: z.boolean(),
  average_heartrate: z.number().optional().nullable(),
  max_heartrate: z.number().optional().nullable(),
  calories: z.number().optional(),
  description: z.string().nullable(),
  gear: SummaryGearSchema,
  device_name: z.string().optional().nullable(),
  perceived_exertion: z.number().optional().nullable(),
  suffer_score: z.number().optional().nullable(),
});

export type StravaDetailedActivity = z.infer<typeof DetailedActivitySchema>;

const PhotoSchema = z.object({
  id: z.number().int().nullable().optional(),
  unique_id: z.string().nullable().optional(),
  urls: z.record(z.string()).optional(),
  source: z.number().int().optional(),
  uploaded_at: z.string().optional().nullable(),
  created_at: z.string().optional().nullable(),
  created_at_local: z.string().optional().nullable(),
  location: z.array(z.number()).nullable().optional(),
  caption: z.string().nullable().optional(),
  activity_id: z.number().int().optional(),
  activity_name: z.string().optional().nullable(),
  resource_state: z.number().int().optional(),
  athlete_id: z.number().int().optional().nullable(),
  post_id: z.number().int().nullable().optional(),
  default_photo: z.boolean().optional(),
  type: z.union([z.string(), z.number()]).optional(),
  status: z.number().int().optional(),
  placeholder_image: z
    .object({
      light_url: z.string().optional(),
      dark_url: z.string().optional(),
    })
    .nullable()
    .optional(),
  sizes: z.record(z.array(z.number())).optional(),
  cursor: z.any().nullable().optional(),
});

export type StravaPhoto = z.infer<typeof PhotoSchema>;
const StravaPhotosResponseSchema = z.array(PhotoSchema);

const LapSchema = z.object({
  id: z.number().int(),
  resource_state: z.number().int(),
  name: z.string(),
  activity: BaseAthleteSchema,
  athlete: BaseAthleteSchema,
  elapsed_time: z.number().int(),
  moving_time: z.number().int(),
  start_date: z.string().datetime(),
  start_date_local: z.string().datetime(),
  distance: z.number(),
  start_index: z.number().int().optional().nullable(),
  end_index: z.number().int().optional().nullable(),
  total_elevation_gain: z.number().optional().nullable(),
  average_speed: z.number().optional().nullable(),
  max_speed: z.number().optional().nullable(),
  average_cadence: z.number().optional().nullable(),
  average_watts: z.number().optional().nullable(),
  device_watts: z.boolean().optional().nullable(),
  average_heartrate: z.number().optional().nullable(),
  max_heartrate: z.number().optional().nullable(),
  lap_index: z.number().int(),
  split: z.number().int().optional().nullable(),
});

export type StravaLap = z.infer<typeof LapSchema>;
const StravaLapsResponseSchema = z.array(LapSchema);

export interface GetAllActivitiesParams {
  page?: number;
  perPage?: number;
  before?: number;
  after?: number;
  onProgress?: (fetched: number, page: number) => void;
}

export async function getLoggedInAthleteActivities(
  accessToken: string,
  perPage = 30,
): Promise<any[]> {
  if (!accessToken) throw new Error("Strava access token is required.");
  try {
    const response = await stravaApi.get<unknown>("athlete/activities", {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { per_page: perPage },
    });
    const validationResult = StravaActivitiesResponseSchema.safeParse(
      response.data,
    );
    if (!validationResult.success) {
      console.error(
        "Strava API response validation failed (getLoggedInAthleteActivities):",
        validationResult.error,
      );
      throw new Error(
        `Invalid data format received from Strava API: ${validationResult.error.message}`,
      );
    }
    return validationResult.data;
  } catch (error) {
    return await handleApiError<any[]>(
      error,
      "getLoggedInAthleteActivities",
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return getLoggedInAthleteActivities(newToken, perPage);
      },
    );
  }
}

export async function getAllActivities(
  accessToken: string,
  params: GetAllActivitiesParams = {},
): Promise<any[]> {
  if (!accessToken) throw new Error("Strava access token is required.");
  const { page = 1, perPage = 200, before, after, onProgress } = params;
  const allActivities: any[] = [];
  let currentPage = page;
  let hasMore = true;

  try {
    while (hasMore) {
      const queryParams: Record<string, any> = {
        page: currentPage,
        per_page: perPage,
      };
      if (before !== undefined) queryParams.before = before;
      if (after !== undefined) queryParams.after = after;

      const response = await stravaApi.get<unknown>("athlete/activities", {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: queryParams,
      });

      const validationResult = StravaActivitiesResponseSchema.safeParse(
        response.data,
      );
      if (!validationResult.success) {
        console.error(
          `Strava API response validation failed (getAllActivities page ${currentPage}):`,
          validationResult.error,
        );
        throw new Error(
          `Invalid data format received from Strava API: ${validationResult.error.message}`,
        );
      }

      const activities = validationResult.data;
      allActivities.push(...activities);
      if (onProgress) onProgress(allActivities.length, currentPage);

      hasMore = activities.length === perPage;
      currentPage++;

      if (hasMore) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    return allActivities;
  } catch (error) {
    if (currentPage === 1) {
      return await handleApiError<any[]>(
        error,
        "getAllActivities",
        async () => {
          const newToken = process.env.STRAVA_ACCESS_TOKEN!;
          return getAllActivities(newToken, params);
        },
      );
    }
    throw error;
  }
}

export async function getActivityById(
  accessToken: string,
  activityId: number,
): Promise<StravaDetailedActivity> {
  if (!accessToken) throw new Error("Strava access token is required.");
  if (!activityId) throw new Error("Activity ID is required to fetch details.");
  try {
    const response = await stravaApi.get<unknown>(`activities/${activityId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const validationResult = DetailedActivitySchema.safeParse(response.data);
    if (!validationResult.success) {
      console.error(
        `Strava API validation failed (getActivityById: ${activityId}):`,
        validationResult.error,
      );
      throw new Error(
        `Invalid data format received from Strava API: ${validationResult.error.message}`,
      );
    }
    return validationResult.data;
  } catch (error) {
    return await handleApiError<StravaDetailedActivity>(
      error,
      `getActivityById for ID ${activityId}`,
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return getActivityById(newToken, activityId);
      },
    );
  }
}

export interface CreateActivityOptions {
  type?: string;
  description?: string;
  distance?: number;
  trainer?: number;
  commute?: number;
}

export async function createActivity(
  accessToken: string,
  name: string,
  sportType: string,
  startDateLocal: string,
  elapsedTime: number,
  options: CreateActivityOptions = {},
): Promise<any> {
  if (!accessToken) throw new Error("Strava access token is required.");
  try {
    const response = await stravaApi.post(
      "activities",
      {
        name,
        sport_type: sportType,
        start_date_local: startDateLocal,
        elapsed_time: elapsedTime,
        ...options,
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    return response.data;
  } catch (error) {
    return await handleApiError<any>(error, "createActivity", async () => {
      const newToken = process.env.STRAVA_ACCESS_TOKEN!;
      return createActivity(
        newToken,
        name,
        sportType,
        startDateLocal,
        elapsedTime,
        options,
      );
    });
  }
}

export async function updateActivityById(
  accessToken: string,
  activityId: number,
  activity: {
    name?: string;
    sport_type?: string;
    type?: string;
    description?: string;
    trainer?: boolean;
    commute?: boolean;
    gear_id?: string;
  },
): Promise<any> {
  if (!accessToken) throw new Error("Strava access token is required.");
  try {
    const response = await stravaApi.put(`activities/${activityId}`, activity, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch (error) {
    return await handleApiError<any>(
      error,
      `updateActivityById for ID ${activityId}`,
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return updateActivityById(newToken, activityId, activity);
      },
    );
  }
}

export async function getLapsByActivityId(
  accessToken: string,
  activityId: number | string,
): Promise<StravaLap[]> {
  if (!accessToken) throw new Error("Strava access token is required.");
  try {
    const response = await stravaApi.get(`/activities/${activityId}/laps`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const validationResult = StravaLapsResponseSchema.safeParse(response.data);
    if (!validationResult.success) {
      console.error(
        `Strava API validation failed (getLapsByActivityId: ${activityId}):`,
        validationResult.error,
      );
      throw new Error(
        `Invalid data format received from Strava API: ${validationResult.error.message}`,
      );
    }
    return validationResult.data;
  } catch (error) {
    return await handleApiError<StravaLap[]>(
      error,
      `getLapsByActivityId(${activityId})`,
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return getLapsByActivityId(newToken, activityId);
      },
    );
  }
}

export async function getCommentsByActivityId(
  accessToken: string,
  activityId: number,
  page = 1,
  perPage = 30,
): Promise<any[]> {
  if (!accessToken) throw new Error("Strava access token is required.");
  try {
    const response = await stravaApi.get(`activities/${activityId}/comments`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { page, per_page: perPage },
    });
    return response.data;
  } catch (error) {
    return await handleApiError<any[]>(
      error,
      `getCommentsByActivityId for ID ${activityId}`,
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return getCommentsByActivityId(newToken, activityId, page, perPage);
      },
    );
  }
}

export async function getKudoersByActivityId(
  accessToken: string,
  activityId: number,
  page = 1,
  perPage = 30,
): Promise<any[]> {
  if (!accessToken) throw new Error("Strava access token is required.");
  try {
    const response = await stravaApi.get(`activities/${activityId}/kudoers`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { page, per_page: perPage },
    });
    return response.data;
  } catch (error) {
    return await handleApiError<any[]>(
      error,
      `getKudoersByActivityId for ID ${activityId}`,
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return getKudoersByActivityId(newToken, activityId, page, perPage);
      },
    );
  }
}

export async function getZonesByActivityId(
  accessToken: string,
  activityId: number,
): Promise<any[]> {
  if (!accessToken) throw new Error("Strava access token is required.");
  try {
    const response = await stravaApi.get(`activities/${activityId}/zones`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch (error) {
    return await handleApiError<any[]>(
      error,
      `getZonesByActivityId for ID ${activityId}`,
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return getZonesByActivityId(newToken, activityId);
      },
    );
  }
}

export async function getActivityPhotos(
  accessToken: string,
  activityId: number,
  size: number = 2048,
): Promise<StravaPhoto[]> {
  if (!accessToken) throw new Error("Strava access token is required.");
  if (!activityId) throw new Error("Activity ID is required to fetch photos.");
  const params: Record<string, any> = { photo_sources: true, size: size };
  try {
    const response = await stravaApi.get<unknown>(
      `activities/${activityId}/photos`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: params,
      },
    );
    const validationResult = StravaPhotosResponseSchema.safeParse(
      response.data,
    );
    if (!validationResult.success) {
      console.error(
        `Strava API validation failed (getActivityPhotos: ${activityId}):`,
        JSON.stringify(validationResult.error.errors, null, 2),
      );
      throw new Error(
        `Invalid data format received from Strava API: ${validationResult.error.message}`,
      );
    }
    return validationResult.data;
  } catch (error) {
    return await handleApiError<StravaPhoto[]>(
      error,
      `getActivityPhotos for ID ${activityId}`,
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return getActivityPhotos(newToken, activityId, size);
      },
    );
  }
}

const SummaryClubSchema = z.object({
  id: z.number().int(),
  resource_state: z.number().int(),
  name: z.string(),
  profile_medium: z.string().url(),
  cover_photo: z.string().url().nullable(),
  cover_photo_small: z.string().url().nullable(),
  sport_type: z.string(),
  activity_types: z.array(z.string()),
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

export async function getLoggedInAthleteClubs(
  accessToken: string,
): Promise<StravaClub[]> {
  if (!accessToken) throw new Error("Strava access token is required.");
  try {
    const response = await stravaApi.get<unknown>("athlete/clubs", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const validationResult = StravaClubsResponseSchema.safeParse(response.data);
    if (!validationResult.success) {
      console.error(
        "Strava API validation failed (getLoggedInAthleteClubs):",
        validationResult.error,
      );
      throw new Error(
        `Invalid data format received from Strava API: ${validationResult.error.message}`,
      );
    }
    return validationResult.data;
  } catch (error) {
    return await handleApiError<StravaClub[]>(
      error,
      "getLoggedInAthleteClubs",
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return getLoggedInAthleteClubs(newToken);
      },
    );
  }
}

export async function getClubById(
  accessToken: string,
  clubId: number,
): Promise<any> {
  if (!accessToken) throw new Error("Strava access token is required.");
  try {
    const response = await stravaApi.get(`clubs/${clubId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch (error) {
    return await handleApiError<any>(
      error,
      `getClubById for ID ${clubId}`,
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return getClubById(newToken, clubId);
      },
    );
  }
}

export async function getClubActivitiesById(
  accessToken: string,
  clubId: number,
  page = 1,
  perPage = 30,
): Promise<any[]> {
  if (!accessToken) throw new Error("Strava access token is required.");
  try {
    const response = await stravaApi.get(`clubs/${clubId}/activities`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { page, per_page: perPage },
    });
    return response.data;
  } catch (error) {
    return await handleApiError<any[]>(
      error,
      `getClubActivitiesById for ID ${clubId}`,
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return getClubActivitiesById(newToken, clubId, page, perPage);
      },
    );
  }
}

export async function getClubMembersById(
  accessToken: string,
  clubId: number,
  page = 1,
  perPage = 30,
): Promise<any[]> {
  if (!accessToken) throw new Error("Strava access token is required.");
  try {
    const response = await stravaApi.get(`clubs/${clubId}/members`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { page, per_page: perPage },
    });
    return response.data;
  } catch (error) {
    return await handleApiError<any[]>(
      error,
      `getClubMembersById for ID ${clubId}`,
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return getClubMembersById(newToken, clubId, page, perPage);
      },
    );
  }
}

export async function getClubAdminsById(
  accessToken: string,
  clubId: number,
  page = 1,
  perPage = 30,
): Promise<any[]> {
  if (!accessToken) throw new Error("Strava access token is required.");
  try {
    const response = await stravaApi.get(`clubs/${clubId}/admins`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { page, per_page: perPage },
    });
    return response.data;
  } catch (error) {
    return await handleApiError<any[]>(
      error,
      `getClubAdminsById for ID ${clubId}`,
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return getClubAdminsById(newToken, clubId, page, perPage);
      },
    );
  }
}

const RouteSchema = z.object({
  athlete: BaseAthleteSchema,
  description: z.string().nullable(),
  distance: z.number(),
  elevation_gain: z.number().nullable(),
  id: z.number().int(),
  id_str: z.string(),
  map: MapSchema,
  map_urls: z
    .object({
      retina_url: z.string().url().optional().nullable(),
      url: z.string().url().optional().nullable(),
    })
    .optional()
    .nullable(),
  name: z.string(),
  private: z.boolean(),
  resource_state: z.number().int(),
  starred: z.boolean(),
  sub_type: z.number().int(),
  type: z.number().int(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  estimated_moving_time: z.number().int().optional().nullable(),
  timestamp: z.number().int().optional().nullable(),
  segments: z.array(z.any()).optional().nullable(),
});

export type StravaRoute = z.infer<typeof RouteSchema>;
const StravaRoutesResponseSchema = z.array(RouteSchema);

export async function getRoutesByAthleteId(
  accessToken: string,
  page = 1,
  perPage = 30,
): Promise<StravaRoute[]> {
  if (!accessToken) throw new Error("Strava access token is required.");
  try {
    const response = await stravaApi.get<unknown>("athlete/routes", {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { page: page, per_page: perPage },
    });
    const validationResult = StravaRoutesResponseSchema.safeParse(
      response.data,
    );
    if (!validationResult.success) {
      console.error(
        "Strava API validation failed (getRoutesByAthleteId):",
        validationResult.error,
      );
      throw new Error(
        `Invalid data format received from Strava API: ${validationResult.error.message}`,
      );
    }
    return validationResult.data;
  } catch (error) {
    return await handleApiError<StravaRoute[]>(
      error,
      "getRoutesByAthleteId",
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return getRoutesByAthleteId(newToken, page, perPage);
      },
    );
  }
}

export async function getRouteById(
  accessToken: string,
  routeId: string,
): Promise<StravaRoute> {
  const url = `routes/${routeId}`;
  try {
    const response = await stravaApi.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return RouteSchema.parse(response.data);
  } catch (error) {
    return await handleApiError<StravaRoute>(
      error,
      `fetching route ${routeId}`,
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return getRouteById(newToken, routeId);
      },
    );
  }
}

export async function getRouteAsGPX(
  accessToken: string,
  routeId: string,
): Promise<string> {
  const url = `routes/${routeId}/export_gpx`;
  try {
    const response = await stravaApi.get<string>(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: "text",
    });
    if (typeof response.data !== "string") {
      throw new Error(
        "Invalid response format received from Strava API for GPX export.",
      );
    }
    return response.data;
  } catch (error) {
    return await handleApiError<string>(
      error,
      `exporting route ${routeId} as GPX`,
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return getRouteAsGPX(newToken, routeId);
      },
    );
  }
}

export async function getRouteAsTCX(
  accessToken: string,
  routeId: string,
): Promise<string> {
  const url = `routes/${routeId}/export_tcx`;
  try {
    const response = await stravaApi.get<string>(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: "text",
    });
    if (typeof response.data !== "string") {
      throw new Error(
        "Invalid response format received from Strava API for TCX export.",
      );
    }
    return response.data;
  } catch (error) {
    return await handleApiError<string>(
      error,
      `exporting route ${routeId} as TCX`,
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return getRouteAsTCX(newToken, routeId);
      },
    );
  }
}

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
  map: MapSchema,
  effort_count: z.number().int(),
  athlete_count: z.number().int(),
  hazardous: z.boolean(),
  star_count: z.number().int(),
});

export type StravaSegment = z.infer<typeof SummarySegmentSchema>;
export type StravaDetailedSegment = z.infer<typeof DetailedSegmentSchema>;
const StravaSegmentsResponseSchema = z.array(SummarySegmentSchema);

const ExplorerSegmentSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  climb_category: z.number().int(),
  climb_category_desc: z.string(),
  avg_grade: z.number(),
  start_latlng: z.array(z.number()),
  end_latlng: z.array(z.number()),
  elev_difference: z.number(),
  distance: z.number(),
  points: z.string(),
  starred: z.boolean().optional(),
});

const ExplorerResponseSchema = z.object({
  segments: z.array(ExplorerSegmentSchema),
});
export type StravaExplorerSegment = z.infer<typeof ExplorerSegmentSchema>;
export type StravaExplorerResponse = z.infer<typeof ExplorerResponseSchema>;

const MetaActivitySchema = z.object({
  id: z.number().int(),
});

const DetailedSegmentEffortSchema = z.object({
  id: z.number().int(),
  activity: MetaActivitySchema,
  athlete: BaseAthleteSchema,
  segment: SummarySegmentSchema,
  name: z.string(),
  elapsed_time: z.number().int(),
  moving_time: z.number().int(),
  start_date: z.string().datetime(),
  start_date_local: z.string().datetime(),
  distance: z.number(),
  start_index: z.number().int().optional().nullable(),
  end_index: z.number().int().optional().nullable(),
  average_cadence: z.number().optional().nullable(),
  device_watts: z.boolean().optional().nullable(),
  average_watts: z.number().optional().nullable(),
  average_heartrate: z.number().optional().nullable(),
  max_heartrate: z.number().optional().nullable(),
  kom_rank: z.number().int().optional().nullable(),
  pr_rank: z.number().int().optional().nullable(),
  hidden: z.boolean().optional().nullable(),
});
export type StravaDetailedSegmentEffort = z.infer<
  typeof DetailedSegmentEffortSchema
>;

const LeaderboardEntrySchema = z
  .object({
    athlete_name: z.string(),
    elapsed_time: z.number(),
    moving_time: z.number(),
    start_date: z.string(),
    rank: z.number(),
    average_watts: z.number().optional(),
    average_hr: z.number().optional(),
  })
  .passthrough();

const LeaderboardResponseSchema = z
  .object({
    effort_count: z.number(),
    entry_count: z.number(),
    entries: z.array(LeaderboardEntrySchema),
  })
  .passthrough();

export type StravaLeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;
export type StravaLeaderboardResponse = z.infer<
  typeof LeaderboardResponseSchema
>;

export interface SegmentEffortsParams {
  startDateLocal?: string;
  endDateLocal?: string;
  perPage?: number;
}

export interface SegmentLeaderboardParams {
  gender?: "M" | "F";
  age_group?: string;
  weight_class?: string;
  following?: boolean;
  club_id?: number;
  date_range?: string;
  per_page?: number;
  page?: number;
}

export async function getLoggedInAthleteStarredSegments(
  accessToken: string,
): Promise<StravaSegment[]> {
  if (!accessToken) throw new Error("Strava access token is required.");
  try {
    const response = await stravaApi.get<unknown>("segments/starred", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const validationResult = StravaSegmentsResponseSchema.safeParse(
      response.data,
    );
    if (!validationResult.success) {
      console.error(
        "Strava API validation failed (getLoggedInAthleteStarredSegments):",
        validationResult.error,
      );
      throw new Error(
        `Invalid data format received from Strava API: ${validationResult.error.message}`,
      );
    }
    return validationResult.data;
  } catch (error) {
    return await handleApiError<StravaSegment[]>(
      error,
      "getLoggedInAthleteStarredSegments",
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return getLoggedInAthleteStarredSegments(newToken);
      },
    );
  }
}

export async function getSegmentById(
  accessToken: string,
  segmentId: number,
): Promise<StravaDetailedSegment> {
  if (!accessToken) throw new Error("Strava access token is required.");
  if (!segmentId) throw new Error("Segment ID is required.");
  try {
    const response = await stravaApi.get<unknown>(`segments/${segmentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const validationResult = DetailedSegmentSchema.safeParse(response.data);
    if (!validationResult.success) {
      console.error(
        `Strava API validation failed (getSegmentById: ${segmentId}):`,
        validationResult.error,
      );
      throw new Error(
        `Invalid data format received from Strava API: ${validationResult.error.message}`,
      );
    }
    return validationResult.data;
  } catch (error) {
    return await handleApiError<StravaDetailedSegment>(
      error,
      `getSegmentById for ID ${segmentId}`,
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return getSegmentById(newToken, segmentId);
      },
    );
  }
}

export async function exploreSegments(
  accessToken: string,
  bounds: string,
  activityType?: "running" | "riding",
  minCat?: number,
  maxCat?: number,
): Promise<StravaExplorerResponse> {
  if (!accessToken) throw new Error("Strava access token is required.");
  if (
    !bounds ||
    !/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(bounds)
  ) {
    throw new Error(
      "Valid bounds (lat,lng,lat,lng) are required for exploring segments.",
    );
  }
  const params: Record<string, any> = { bounds: bounds };
  if (activityType) params.activity_type = activityType;
  if (minCat !== undefined) params.min_cat = minCat;
  if (maxCat !== undefined) params.max_cat = maxCat;
  try {
    const response = await stravaApi.get<unknown>("segments/explore", {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: params,
    });
    const validationResult = ExplorerResponseSchema.safeParse(response.data);
    if (!validationResult.success) {
      console.error(
        "Strava API validation failed (exploreSegments):",
        validationResult.error,
      );
      throw new Error(
        `Invalid data format received from Strava API: ${validationResult.error.message}`,
      );
    }
    return validationResult.data;
  } catch (error) {
    return await handleApiError<StravaExplorerResponse>(
      error,
      `exploreSegments with bounds ${bounds}`,
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return exploreSegments(newToken, bounds, activityType);
      },
    );
  }
}

export async function starSegment(
  accessToken: string,
  segmentId: number,
  starred: boolean,
): Promise<StravaDetailedSegment> {
  if (!accessToken) throw new Error("Strava access token is required.");
  if (!segmentId) throw new Error("Segment ID is required to star/unstar.");
  if (starred === undefined)
    throw new Error("Starred status (true/false) is required.");
  try {
    const response = await stravaApi.put<unknown>(
      `segments/${segmentId}/starred`,
      { starred: starred },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );
    const validationResult = DetailedSegmentSchema.safeParse(response.data);
    if (!validationResult.success) {
      console.error(
        `Strava API validation failed (starSegment: ${segmentId}):`,
        validationResult.error,
      );
      throw new Error(
        `Invalid data format received from Strava API: ${validationResult.error.message}`,
      );
    }
    return validationResult.data;
  } catch (error) {
    return await handleApiError<StravaDetailedSegment>(
      error,
      `starSegment for ID ${segmentId} with starred=${starred}`,
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return starSegment(newToken, segmentId, starred);
      },
    );
  }
}

export async function getSegmentEffort(
  accessToken: string,
  effortId: number,
): Promise<StravaDetailedSegmentEffort> {
  if (!accessToken) throw new Error("Strava access token is required.");
  if (!effortId)
    throw new Error("Segment Effort ID is required to fetch details.");
  try {
    const response = await stravaApi.get<unknown>(
      `segment_efforts/${effortId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    const validationResult = DetailedSegmentEffortSchema.safeParse(
      response.data,
    );
    if (!validationResult.success) {
      console.error(
        `Strava API validation failed (getSegmentEffort: ${effortId}):`,
        validationResult.error,
      );
      throw new Error(
        `Invalid data format received from Strava API: ${validationResult.error.message}`,
      );
    }
    return validationResult.data;
  } catch (error) {
    return await handleApiError<StravaDetailedSegmentEffort>(
      error,
      `getSegmentEffort for ID ${effortId}`,
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return getSegmentEffort(newToken, effortId);
      },
    );
  }
}

export async function getEffortsBySegmentId(
  accessToken: string,
  segmentId: number,
  params: SegmentEffortsParams = {},
): Promise<StravaDetailedSegmentEffort[]> {
  if (!accessToken) throw new Error("Strava access token is required.");
  if (!segmentId) throw new Error("Segment ID is required to list efforts.");
  const { startDateLocal, endDateLocal, perPage } = params;
  const queryParams: Record<string, any> = { segment_id: segmentId };
  if (startDateLocal) queryParams.start_date_local = startDateLocal;
  if (endDateLocal) queryParams.end_date_local = endDateLocal;
  if (perPage) queryParams.per_page = perPage;
  try {
    const response = await stravaApi.get<unknown>("segment_efforts", {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: queryParams,
    });
    const validationResult = z
      .array(DetailedSegmentEffortSchema)
      .safeParse(response.data);
    if (!validationResult.success) {
      console.error(
        `Strava API validation failed (getEffortsBySegmentId: segment ${segmentId}):`,
        validationResult.error,
      );
      throw new Error(
        `Invalid data format received from Strava API: ${validationResult.error.message}`,
      );
    }
    return validationResult.data;
  } catch (error) {
    return await handleApiError<StravaDetailedSegmentEffort[]>(
      error,
      `getEffortsBySegmentId for segment ID ${segmentId}`,
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return getEffortsBySegmentId(newToken, segmentId, params);
      },
    );
  }
}

export async function getSegmentLeaderboard(
  accessToken: string,
  segmentId: number,
  params: SegmentLeaderboardParams = {},
): Promise<StravaLeaderboardResponse> {
  if (!accessToken) throw new Error("Strava access token is required.");
  if (!segmentId) throw new Error("Segment ID is required.");
  const queryParams: Record<string, any> = {};
  if (params.per_page != null) queryParams.per_page = params.per_page;
  if (params.page != null) queryParams.page = params.page;
  if (params.gender) queryParams.gender = params.gender;
  if (params.age_group) queryParams.age_group = params.age_group;
  if (params.weight_class) queryParams.weight_class = params.weight_class;
  if (params.following) queryParams.following = params.following;
  if (params.club_id) queryParams.club_id = params.club_id;
  if (params.date_range) queryParams.date_range = params.date_range;
  try {
    const response = await stravaApi.get<unknown>(
      `segments/${segmentId}/leaderboard`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: queryParams,
      },
    );
    const validationResult = LeaderboardResponseSchema.safeParse(response.data);
    if (!validationResult.success) {
      console.error(
        `Strava API validation failed (getSegmentLeaderboard: ${segmentId}):`,
        validationResult.error,
      );
      throw new Error(
        `Invalid data format received from Strava API: ${validationResult.error.message}`,
      );
    }
    return validationResult.data;
  } catch (error) {
    return await handleApiError<StravaLeaderboardResponse>(
      error,
      `getSegmentLeaderboard for segment ${segmentId}`,
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return getSegmentLeaderboard(newToken, segmentId, params);
      },
    );
  }
}

export async function getActivityStreams(
  accessToken: string,
  activityId: number | string,
  keys: string[],
): Promise<any[]> {
  if (!accessToken) throw new Error("Strava access token is required.");
  try {
    const response = await stravaApi.get(`/activities/${activityId}/streams`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { keys: keys.join(","), key_by_type: true },
    });
    return response.data;
  } catch (error) {
    return await handleApiError<any[]>(
      error,
      `getActivityStreams(${activityId})`,
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return getActivityStreams(newToken, activityId, keys);
      },
    );
  }
}

export async function getRouteStreams(
  accessToken: string,
  routeId: number,
): Promise<any[]> {
  if (!accessToken) throw new Error("Strava access token is required.");
  try {
    const response = await stravaApi.get(`routes/${routeId}/streams`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch (error) {
    return await handleApiError<any[]>(
      error,
      `getRouteStreams for route ID ${routeId}`,
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return getRouteStreams(newToken, routeId);
      },
    );
  }
}

export async function getSegmentEffortStreams(
  accessToken: string,
  effortId: number,
  keys: string[],
): Promise<any[]> {
  if (!accessToken) throw new Error("Strava access token is required.");
  try {
    const response = await stravaApi.get(
      `segment_efforts/${effortId}/streams`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { keys: keys.join(","), key_by_type: true },
      },
    );
    return response.data;
  } catch (error) {
    return await handleApiError<any[]>(
      error,
      `getSegmentEffortStreams for effort ID ${effortId}`,
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return getSegmentEffortStreams(newToken, effortId, keys);
      },
    );
  }
}

export async function getSegmentStreams(
  accessToken: string,
  segmentId: number,
  keys: string[],
): Promise<any[]> {
  if (!accessToken) throw new Error("Strava access token is required.");
  try {
    const response = await stravaApi.get(`segments/${segmentId}/streams`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { keys: keys.join(","), key_by_type: true },
    });
    return response.data;
  } catch (error) {
    return await handleApiError<any[]>(
      error,
      `getSegmentStreams for segment ID ${segmentId}`,
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return getSegmentStreams(newToken, segmentId, keys);
      },
    );
  }
}

export async function createUpload(
  accessToken: string,
  fileBase64: string,
  dataType: "fit" | "fit.gz" | "tcx" | "tcx.gz" | "gpx" | "gpx.gz",
  options: {
    name?: string;
    description?: string;
    trainer?: string;
    commute?: string;
    externalId?: string;
  } = {},
): Promise<any> {
  if (!accessToken) throw new Error("Strava access token is required.");
  try {
    const formData = new FormData();
    const buffer = Buffer.from(fileBase64, "base64");
    const blob = new Blob([buffer]);
    formData.append("file", blob, `activity.${dataType}`);
    formData.append("data_type", dataType);
    if (options.name) formData.append("name", options.name);
    if (options.description)
      formData.append("description", options.description);
    if (options.trainer) formData.append("trainer", options.trainer);
    if (options.commute) formData.append("commute", options.commute);
    if (options.externalId) formData.append("external_id", options.externalId);

    const response = await stravaApi.post("uploads", formData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    return await handleApiError<any>(error, "createUpload", async () => {
      const newToken = process.env.STRAVA_ACCESS_TOKEN!;
      return createUpload(newToken, fileBase64, dataType, options);
    });
  }
}

export async function getUploadStatus(
  accessToken: string,
  uploadId: number,
): Promise<any> {
  if (!accessToken) throw new Error("Strava access token is required.");
  try {
    const response = await stravaApi.get(`uploads/${uploadId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch (error) {
    return await handleApiError<any>(
      error,
      `getUploadStatus for ID ${uploadId}`,
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return getUploadStatus(newToken, uploadId);
      },
    );
  }
}

export async function getGearById(
  accessToken: string,
  gearId: string,
): Promise<any> {
  if (!accessToken) throw new Error("Strava access token is required.");
  try {
    const response = await stravaApi.get(`gear/${gearId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch (error) {
    return await handleApiError<any>(
      error,
      `getGearById for ID ${gearId}`,
      async () => {
        const newToken = process.env.STRAVA_ACCESS_TOKEN!;
        return getGearById(newToken, gearId);
      },
    );
  }
}
