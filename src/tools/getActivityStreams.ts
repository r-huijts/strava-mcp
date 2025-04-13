import { z } from 'zod';
import { stravaApi } from '../stravaClient.js';

// Define stream types available in Strava API
const STREAM_TYPES = [
    'time', 'distance', 'latlng', 'altitude', 'velocity_smooth',
    'heartrate', 'cadence', 'watts', 'temp', 'moving', 'grade_smooth'
] as const;

// Define resolution types
const RESOLUTION_TYPES = ['low', 'medium', 'high'] as const;

// Input schema using Zod
export const inputSchema = z.object({
    id: z.number().or(z.string()).describe(
        'The Strava activity identifier to fetch streams for. This can be obtained from activity URLs or the get-activities tool.'
    ),
    types: z.array(z.enum(STREAM_TYPES))
        .default(['time', 'distance', 'heartrate', 'cadence', 'watts'])
        .describe(
            'Array of stream types to fetch. Available types:\n' +
            '- time: Time in seconds from start\n' +
            '- distance: Distance in meters from start\n' +
            '- latlng: Array of [latitude, longitude] pairs\n' +
            '- altitude: Elevation in meters\n' +
            '- velocity_smooth: Smoothed speed in meters/second\n' +
            '- heartrate: Heart rate in beats per minute\n' +
            '- cadence: Cadence in revolutions per minute\n' +
            '- watts: Power output in watts\n' +
            '- temp: Temperature in Celsius\n' +
            '- moving: Boolean indicating if moving\n' +
            '- grade_smooth: Road grade as percentage'
        ),
    resolution: z.enum(RESOLUTION_TYPES).optional()
        .describe(
            'Optional data resolution. Affects number of data points returned:\n' +
            '- low: ~100 points\n' +
            '- medium: ~1000 points\n' +
            '- high: ~10000 points\n' +
            'Default varies based on activity length.'
        ),
    series_type: z.enum(['time', 'distance']).optional()
        .default('distance')
        .describe(
            'Optional base series type for the streams:\n' +
            '- time: Data points are indexed by time (seconds from start)\n' +
            '- distance: Data points are indexed by distance (meters from start)\n' +
            'Useful for comparing different activities or analyzing specific segments.'
        ),
    page: z.number().optional().default(1)
        .describe(
            'Optional page number for paginated results. Use with points_per_page to retrieve specific data ranges.\n' +
            'Example: page=2 with points_per_page=100 gets points 101-200.'
        ),
    points_per_page: z.number().optional().default(100)
        .describe(
            'Optional number of data points per page. Special values:\n' +
            '- Positive number: Returns that many points per page\n' +
            '- -1: Returns ALL data points split into multiple messages (~1000 points each)\n' +
            'Use -1 when you need the complete activity data for analysis.'
        )
});

// Type for the input parameters
type GetActivityStreamsParams = z.infer<typeof inputSchema>;

// Stream interfaces based on Strava API types
interface BaseStream {
    type: string;
    data: any[];
    series_type: 'distance' | 'time';
    original_size: number;
    resolution: 'low' | 'medium' | 'high';
}

interface TimeStream extends BaseStream {
    type: 'time';
    data: number[]; // seconds
}

interface DistanceStream extends BaseStream {
    type: 'distance';
    data: number[]; // meters
}

interface LatLngStream extends BaseStream {
    type: 'latlng';
    data: [number, number][]; // [latitude, longitude]
}

interface AltitudeStream extends BaseStream {
    type: 'altitude';
    data: number[]; // meters
}

interface VelocityStream extends BaseStream {
    type: 'velocity_smooth';
    data: number[]; // meters per second
}

interface HeartrateStream extends BaseStream {
    type: 'heartrate';
    data: number[]; // beats per minute
}

interface CadenceStream extends BaseStream {
    type: 'cadence';
    data: number[]; // rpm
}

interface PowerStream extends BaseStream {
    type: 'watts';
    data: number[]; // watts
}

interface TempStream extends BaseStream {
    type: 'temp';
    data: number[]; // celsius
}

interface MovingStream extends BaseStream {
    type: 'moving';
    data: boolean[];
}

interface GradeStream extends BaseStream {
    type: 'grade_smooth';
    data: number[]; // percent grade
}

type StreamSet = (TimeStream | DistanceStream | LatLngStream | AltitudeStream | 
                 VelocityStream | HeartrateStream | CadenceStream | PowerStream | 
                 TempStream | MovingStream | GradeStream)[];

// Tool definition
export const getActivityStreamsTool = {
    name: 'get-activity-streams',
    description: 
        'Retrieves detailed time-series data streams from a Strava activity. Perfect for analyzing workout metrics, ' +
        'visualizing routes, or performing detailed activity analysis.\n\n' +
        
        'Key Features:\n' +
        '1. Multiple Data Types: Access various metrics like heart rate, power, speed, GPS coordinates, etc.\n' +
        '2. Flexible Resolution: Choose data density from low (~100 points) to high (~10000 points)\n' +
        '3. Smart Pagination: Get data in manageable chunks or all at once\n' +
        '4. Rich Statistics: Includes min/max/avg for numeric streams\n' +
        '5. Formatted Output: Data is processed into human and LLM-friendly formats\n\n' +
        
        'Common Use Cases:\n' +
        '- Analyzing workout intensity through heart rate zones\n' +
        '- Calculating power metrics for cycling activities\n' +
        '- Visualizing route data using GPS coordinates\n' +
        '- Analyzing pace and elevation changes\n' +
        '- Detailed segment analysis\n\n' +
        
        'Output Format:\n' +
        '1. Metadata: Activity overview, available streams, data points\n' +
        '2. Statistics: Summary stats for each stream type (max/min/avg where applicable)\n' +
        '3. Stream Data: Actual time-series data, formatted for easy use\n\n' +
        
        'Notes:\n' +
        '- Requires activity:read scope\n' +
        '- Not all streams are available for all activities\n' +
        '- Older activities might have limited data\n' +
        '- Large activities are automatically paginated to handle size limits',
    inputSchema,
    execute: async ({ id, types, resolution, series_type, page = 1, points_per_page = 100 }: GetActivityStreamsParams) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;
        if (!token) {
            return {
                content: [{ type: 'text' as const, text: '❌ Missing STRAVA_ACCESS_TOKEN in .env' }],
                isError: true
            };
        }

        try {
            // Set the auth token for this request
            stravaApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            // Build query parameters
            const params: Record<string, any> = {};
            if (resolution) params.resolution = resolution;
            if (series_type) params.series_type = series_type;

            // Convert query params to string
            const queryString = new URLSearchParams(params).toString();
            
            // Build the endpoint URL with types in the path
            const endpoint = `/activities/${id}/streams/${types.join(',')}${queryString ? '?' + queryString : ''}`;
            
            const response = await stravaApi.get<StreamSet>(endpoint);
            const streams = response.data;

            if (!streams || streams.length === 0) {
                return {
                    content: [{ 
                        type: 'text' as const, 
                        text: '⚠️ No streams were returned. This could mean:\n' +
                              '1. The activity was recorded without this data\n' +
                              '2. The activity is not a GPS-based activity\n' +
                              '3. The activity is too old (Strava may not keep all stream data indefinitely)'
                    }],
                    isError: true
                };
            }

            // At this point we know streams[0] exists because we checked length > 0
            const referenceStream = streams[0]!;
            const totalPoints = referenceStream.data.length;

            // Generate stream statistics first (they're always included)
            const streamStats: Record<string, any> = {};
            streams.forEach(stream => {
                const data = stream.data;
                let stats: any = {
                    total_points: data.length,
                    resolution: stream.resolution,
                    series_type: stream.series_type
                };

                // Add type-specific statistics
                switch (stream.type) {
                    case 'heartrate':
                        const hrData = data as number[];
                        stats = {
                            ...stats,
                            max: Math.max(...hrData),
                            min: Math.min(...hrData),
                            avg: Math.round(hrData.reduce((a, b) => a + b, 0) / hrData.length)
                        };
                        break;
                    case 'watts':
                        const powerData = data as number[];
                        stats = {
                            ...stats,
                            max: Math.max(...powerData),
                            avg: Math.round(powerData.reduce((a, b) => a + b, 0) / powerData.length),
                            normalized_power: calculateNormalizedPower(powerData)
                        };
                        break;
                    case 'velocity_smooth':
                        const velocityData = data as number[];
                        stats = {
                            ...stats,
                            max_kph: Math.round(Math.max(...velocityData) * 3.6 * 10) / 10,
                            avg_kph: Math.round(velocityData.reduce((a, b) => a + b, 0) / velocityData.length * 3.6 * 10) / 10
                        };
                        break;
                }
                
                streamStats[stream.type] = stats;
            });

            // Special case: return all data in multiple messages if points_per_page is -1
            if (points_per_page === -1) {
                // Calculate optimal chunk size (aim for ~500KB per message)
                const CHUNK_SIZE = 1000; // Adjust this if needed
                const numChunks = Math.ceil(totalPoints / CHUNK_SIZE);

                // Return array of messages
                return {
                    content: [
                        // First message with metadata
                        {
                            type: 'text' as const,
                            text: `📊 Activity Stream Data (${totalPoints} points)\n` +
                                  `Will be sent in ${numChunks + 1} messages:\n` +
                                  `1. Metadata and Statistics\n` +
                                  `2-${numChunks + 1}. Stream Data (${CHUNK_SIZE} points per message)\n\n` +
                                  `Message 1/${numChunks + 1}:\n` +
                                  JSON.stringify({
                                      metadata: {
                                          available_types: streams.map(s => s.type),
                                          total_points: totalPoints,
                                          total_chunks: numChunks,
                                          chunk_size: CHUNK_SIZE,
                                          resolution: referenceStream.resolution,
                                          series_type: referenceStream.series_type
                                      },
                                      statistics: streamStats
                                  }, null, 2)
                        },
                        // Data messages
                        ...Array.from({ length: numChunks }, (_, i) => {
                            const chunkStart = i * CHUNK_SIZE;
                            const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, totalPoints);
                            const streamData: Record<string, any> = { streams: {} };

                            // Process each stream for this chunk
                            streams.forEach(stream => {
                                const chunkData = stream.data.slice(chunkStart, chunkEnd);
                                let processedData: any;
                                
                                switch (stream.type) {
                                    case 'latlng':
                                        const latlngData = chunkData as [number, number][];
                                        processedData = latlngData.map(([lat, lng]) => ({
                                            latitude: Number(lat.toFixed(6)),
                                            longitude: Number(lng.toFixed(6))
                                        }));
                                        break;
                                    
                                    case 'time':
                                        const timeData = chunkData as number[];
                                        processedData = timeData.map(seconds => ({
                                            seconds_from_start: seconds,
                                            formatted: new Date(seconds * 1000).toISOString().substr(11, 8)
                                        }));
                                        break;
                                    
                                    case 'distance':
                                        const distanceData = chunkData as number[];
                                        processedData = distanceData.map(meters => ({
                                            meters,
                                            kilometers: Number((meters / 1000).toFixed(2))
                                        }));
                                        break;
                                    
                                    case 'velocity_smooth':
                                        const velocityData = chunkData as number[];
                                        processedData = velocityData.map(mps => ({
                                            meters_per_second: mps,
                                            kilometers_per_hour: Number((mps * 3.6).toFixed(1))
                                        }));
                                        break;
                                    
                                    case 'heartrate':
                                    case 'cadence':
                                    case 'watts':
                                    case 'temp':
                                        const numericData = chunkData as number[];
                                        processedData = numericData.map(v => Number(v));
                                        break;
                                    
                                    case 'grade_smooth':
                                        const gradeData = chunkData as number[];
                                        processedData = gradeData.map(grade => Number(grade.toFixed(1)));
                                        break;
                                    
                                    case 'moving':
                                        processedData = chunkData as boolean[];
                                        break;
                                    
                                    default:
                                        processedData = chunkData;
                                }

                                streamData.streams[stream.type] = processedData;
                            });

                            return {
                                type: 'text' as const,
                                text: `Message ${i + 2}/${numChunks + 1} (points ${chunkStart + 1}-${chunkEnd}):\n` +
                                      JSON.stringify(streamData, null, 2)
                            };
                        })
                    ]
                };
            }

            // Regular paginated response
            const totalPages = Math.ceil(totalPoints / points_per_page);

            // Validate page number
            if (page < 1 || page > totalPages) {
                return {
                    content: [{ 
                        type: 'text' as const, 
                        text: `❌ Invalid page number. Please specify a page between 1 and ${totalPages}`
                    }],
                    isError: true
                };
            }

            // Calculate slice indices for pagination
            const startIdx = (page - 1) * points_per_page;
            const endIdx = Math.min(startIdx + points_per_page, totalPoints);

            // Process paginated stream data
            const streamData: Record<string, any> = {
                metadata: {
                    available_types: streams.map(s => s.type),
                    total_points: totalPoints,
                    current_page: page,
                    total_pages: totalPages,
                    points_per_page,
                    points_in_page: endIdx - startIdx
                },
                statistics: streamStats,
                streams: {}
            };

            // Process each stream with pagination
            streams.forEach(stream => {
                let processedData: any;
                const paginatedData = stream.data.slice(startIdx, endIdx);
                
                switch (stream.type) {
                    case 'latlng':
                        const latlngData = paginatedData as [number, number][];
                        processedData = latlngData.map(([lat, lng]) => ({
                            latitude: Number(lat.toFixed(6)),
                            longitude: Number(lng.toFixed(6))
                        }));
                        break;
                    
                    case 'time':
                        const timeData = paginatedData as number[];
                        processedData = timeData.map(seconds => ({
                            seconds_from_start: seconds,
                            formatted: new Date(seconds * 1000).toISOString().substr(11, 8)
                        }));
                        break;
                    
                    case 'distance':
                        const distanceData = paginatedData as number[];
                        processedData = distanceData.map(meters => ({
                            meters,
                            kilometers: Number((meters / 1000).toFixed(2))
                        }));
                        break;
                    
                    case 'velocity_smooth':
                        const velocityData = paginatedData as number[];
                        processedData = velocityData.map(mps => ({
                            meters_per_second: mps,
                            kilometers_per_hour: Number((mps * 3.6).toFixed(1))
                        }));
                        break;
                    
                    case 'heartrate':
                    case 'cadence':
                    case 'watts':
                    case 'temp':
                        const numericData = paginatedData as number[];
                        processedData = numericData.map(v => Number(v));
                        break;
                    
                    case 'grade_smooth':
                        const gradeData = paginatedData as number[];
                        processedData = gradeData.map(grade => Number(grade.toFixed(1)));
                        break;
                    
                    case 'moving':
                        processedData = paginatedData as boolean[];
                        break;
                    
                    default:
                        processedData = paginatedData;
                }

                streamData.streams[stream.type] = processedData;
            });

            return {
                content: [{ 
                    type: 'text' as const, 
                    text: JSON.stringify(streamData, null, 2)
                }]
            };
        } catch (error: any) {
            const statusCode = error.response?.status;
            const errorMessage = error.response?.data?.message || error.message;
            
            let userFriendlyError = `❌ Failed to fetch activity streams (${statusCode}): ${errorMessage}\n\n`;
            userFriendlyError += 'This could be because:\n';
            userFriendlyError += '1. The activity ID is invalid\n';
            userFriendlyError += '2. You don\'t have permission to view this activity\n';
            userFriendlyError += '3. The requested stream types are not available\n';
            userFriendlyError += '4. The activity is too old and the streams have been archived';
            
            return {
                content: [{
                    type: 'text' as const,
                    text: userFriendlyError
                }],
                isError: true
            };
        }
    }
};

// Helper function to calculate normalized power
function calculateNormalizedPower(powerData: number[]): number {
    if (powerData.length < 30) return 0;
    
    // 30-second moving average
    const windowSize = 30;
    const movingAvg = [];
    for (let i = windowSize - 1; i < powerData.length; i++) {
        const window = powerData.slice(i - windowSize + 1, i + 1);
        const avg = window.reduce((a, b) => a + b, 0) / windowSize;
        movingAvg.push(Math.pow(avg, 4));
    }
    
    // Calculate normalized power
    const avgPower = Math.pow(
        movingAvg.reduce((a, b) => a + b, 0) / movingAvg.length,
        0.25
    );
    
    return Math.round(avgPower);
} 