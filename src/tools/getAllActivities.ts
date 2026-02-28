import { z } from "zod";
import { getAllActivities as fetchAllActivities } from "../stravaClient.js";

// Common activity types
export const ACTIVITY_TYPES = {
    // Core types
    RIDE: "Ride",
    RUN: "Run", 
    SWIM: "Swim",
    
    // Common types
    WALK: "Walk",
    HIKE: "Hike",
    VIRTUAL_RIDE: "VirtualRide",
    VIRTUAL_RUN: "VirtualRun",
    WORKOUT: "Workout",
    WEIGHT_TRAINING: "WeightTraining",
    YOGA: "Yoga",
    
    // Winter sports
    ALPINE_SKI: "AlpineSki",
    BACKCOUNTRY_SKI: "BackcountrySki",
    NORDIC_SKI: "NordicSki",
    SNOWBOARD: "Snowboard",
    ICE_SKATE: "IceSkate",
    
    // Water sports
    KAYAKING: "Kayaking",
    ROWING: "Rowing",
    STAND_UP_PADDLING: "StandUpPaddling",
    SURFING: "Surfing",
    
    // Other
    GOLF: "Golf",
    ROCK_CLIMBING: "RockClimbing",
    SOCCER: "Soccer",
    ELLIPTICAL: "Elliptical",
    STAIR_STEPPER: "StairStepper"
} as const;

// Common sport types (more granular)
export const SPORT_TYPES = {
    MOUNTAIN_BIKE_RIDE: "MountainBikeRide",
    GRAVEL_RIDE: "GravelRide",
    E_BIKE_RIDE: "EBikeRide",
    TRAIL_RUN: "TrailRun",
    VIRTUAL_RIDE: "VirtualRide",
    VIRTUAL_RUN: "VirtualRun"
} as const;

const GetAllActivitiesInputSchema = z.object({
    startDate: z.string().optional().describe("ISO date string for activities after this date (e.g., '2024-01-01')"),
    endDate: z.string().optional().describe("ISO date string for activities before this date (e.g., '2024-12-31')"),
    activityTypes: z.array(z.string()).optional().describe("Array of activity types to filter (e.g., ['Run', 'Ride'])"),
    sportTypes: z.array(z.string()).optional().describe("Array of sport types for granular filtering (e.g., ['MountainBikeRide', 'TrailRun'])"),
    maxActivities: z.number().int().positive().optional().default(500).describe("Maximum activities to return after filtering (default: 500)"),
    maxApiCalls: z.number().int().positive().optional().default(10).describe("Maximum API calls to prevent quota exhaustion (default: 10 = ~2000 activities)"),
    perPage: z.number().int().positive().min(1).max(200).optional().default(200).describe("Activities per API call (default: 200, max: 200)")
});

type GetAllActivitiesInput = z.infer<typeof GetAllActivitiesInputSchema>;

// Helper function to format activity summary
function formatActivitySummary(activity: any): string {
    const date = activity.start_date ?? 'N/A';
    const distance = activity.distance ? `${(activity.distance / 1000).toFixed(2)} km` : 'N/A';
    const duration = activity.moving_time ? formatDuration(activity.moving_time) : 'N/A';
    const type = activity.sport_type || activity.type || 'Unknown';
    const activityId = activity.id ?? 'N/A';

    let emoji = '🏃';
    if (type.toLowerCase().includes('ride') || type.toLowerCase().includes('bike')) emoji = '🚴';
    else if (type.toLowerCase().includes('swim')) emoji = '🏊';
    else if (type.toLowerCase().includes('ski')) emoji = '⛷️';
    else if (type.toLowerCase().includes('hike') || type.toLowerCase().includes('walk')) emoji = '🥾';
    else if (type.toLowerCase().includes('yoga')) emoji = '🧘';
    else if (type.toLowerCase().includes('weight')) emoji = '💪';

    const stravaUrl = activityId !== 'N/A' ? `https://www.strava.com/activities/${activityId}` : '';
    return `${emoji} ${activity.name} (ID: ${activityId}) - ${type} - ${distance} in ${duration} on ${date}${stravaUrl ? `\n   URL: ${stravaUrl}` : ''}`;
}

// Helper function to format duration
function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
}

// Export the tool definition
export const getAllActivities = {
    name: "get-all-activities",
    description: "Fetches complete activity history with optional filtering by date range and activity type. Supports pagination to retrieve all activities.",
    inputSchema: GetAllActivitiesInputSchema,
    execute: async (input: GetAllActivitiesInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;
        
        if (!token || token === 'YOUR_STRAVA_ACCESS_TOKEN_HERE') {
            console.error("Missing or placeholder STRAVA_ACCESS_TOKEN in .env");
            return {
                content: [{ type: "text" as const, text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing or not set in the .env file." }],
                isError: true,
            };
        }

        const {
            startDate,
            endDate,
            activityTypes,
            sportTypes,
            maxActivities = 500,
            maxApiCalls = 10,
            perPage = 200
        } = input;

        try {
            // Convert dates to epoch timestamps if provided
            const before = endDate ? Math.floor(new Date(endDate).getTime() / 1000) : undefined;
            const after = startDate ? Math.floor(new Date(startDate).getTime() / 1000) : undefined;
            
            // Validate date inputs
            if (before && isNaN(before)) {
                return {
                    content: [{ type: "text" as const, text: "❌ Invalid endDate format. Please use ISO date format (e.g., '2024-12-31')." }],
                    isError: true
                };
            }
            if (after && isNaN(after)) {
                return {
                    content: [{ type: "text" as const, text: "❌ Invalid startDate format. Please use ISO date format (e.g., '2024-01-01')." }],
                    isError: true
                };
            }

            console.error(`Fetching activities with filters:`);
            console.error(`  Date range: ${startDate || 'any'} to ${endDate || 'any'}`);
            console.error(`  Activity types: ${activityTypes?.join(', ') || 'any'}`);
            console.error(`  Sport types: ${sportTypes?.join(', ') || 'any'}`);
            console.error(`  Max activities: ${maxActivities}, Max API calls: ${maxApiCalls}`);

            const allActivities: any[] = [];
            const filteredActivities: any[] = [];
            let apiCalls = 0;
            let currentPage = 1;
            let hasMore = true;

            // Progress callback
            const onProgress = (fetched: number, page: number) => {
                console.error(`  Page ${page}: Fetched ${fetched} total activities...`);
            };

            // Fetch activities page by page
            while (hasMore && apiCalls < maxApiCalls && filteredActivities.length < maxActivities) {
                apiCalls++;
                
                // Fetch a page of activities
                const pageActivities = await fetchAllActivities(token, {
                    page: currentPage,
                    perPage,
                    before,
                    after,
                    onProgress
                });

                // Check if we got any activities
                if (pageActivities.length === 0) {
                    hasMore = false;
                    break;
                }

                // Add to all activities
                allActivities.push(...pageActivities);

                // Apply filters if specified
                let toFilter = pageActivities;
                
                // Filter by activity type
                if (activityTypes && activityTypes.length > 0) {
                    toFilter = toFilter.filter(a => 
                        activityTypes.some(type => 
                            a.type?.toLowerCase() === type.toLowerCase()
                        )
                    );
                }
                
                // Filter by sport type (more specific)
                if (sportTypes && sportTypes.length > 0) {
                    toFilter = toFilter.filter(a => 
                        sportTypes.some(type => 
                            a.sport_type?.toLowerCase() === type.toLowerCase()
                        )
                    );
                }

                // Add filtered activities
                filteredActivities.push(...toFilter);

                // Check if we should continue
                hasMore = pageActivities.length === perPage;
                currentPage++;

                // Log progress
                console.error(`  After page ${currentPage - 1}: ${allActivities.length} fetched, ${filteredActivities.length} match filters`);
            }

            // Limit results to maxActivities
            const resultsToReturn = filteredActivities.slice(0, maxActivities);

            // Prepare summary statistics
            const stats = {
                totalFetched: allActivities.length,
                totalMatching: filteredActivities.length,
                returned: resultsToReturn.length,
                apiCalls: apiCalls
            };

            console.error(`\nFetch complete:`);
            console.error(`  Total activities fetched: ${stats.totalFetched}`);
            console.error(`  Activities matching filters: ${stats.totalMatching}`);
            console.error(`  Activities returned: ${stats.returned}`);
            console.error(`  API calls made: ${stats.apiCalls}`);

            if (resultsToReturn.length === 0) {
                return {
                    content: [{ 
                        type: "text" as const, 
                        text: `No activities found matching your criteria.\n\nStatistics:\n- Fetched ${stats.totalFetched} activities\n- ${stats.totalMatching} matched filters\n- Used ${stats.apiCalls} API calls` 
                    }]
                };
            }

            // Format activities for display
            const summaries = resultsToReturn.map(activity => formatActivitySummary(activity));
            
            // Build response text
            let responseText = `**Found ${stats.returned} activities**\n\n`;
            responseText += `📊 Statistics:\n`;
            responseText += `- Total fetched: ${stats.totalFetched}\n`;
            responseText += `- Matching filters: ${stats.totalMatching}\n`;
            responseText += `- API calls: ${stats.apiCalls}\n\n`;
            
            if (stats.returned < stats.totalMatching) {
                responseText += `⚠️ Showing first ${stats.returned} of ${stats.totalMatching} matching activities (limited by maxActivities)\n\n`;
            }
            
            responseText += `**Activities:**\n${summaries.join('\n')}`;

            return { 
                content: [{ type: "text" as const, text: responseText }] 
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            console.error("Error in get-all-activities tool:", errorMessage);
            
            // Check for rate limiting
            if (errorMessage.includes('429')) {
                return {
                    content: [{ 
                        type: "text" as const, 
                        text: `⚠️ Rate limit reached. Please wait a few minutes before trying again.\n\nStrava API limits: 100 requests per 15 minutes, 1000 per day.` 
                    }],
                    isError: true,
                };
            }
            
            return {
                content: [{ type: "text" as const, text: `❌ API Error: ${errorMessage}` }],
                isError: true,
            };
        }
    }
};