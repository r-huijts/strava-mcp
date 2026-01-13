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
        ),
    format: z.enum(['compact', 'verbose']).optional().default('compact')
        .describe(
            'Output format:\n' +
            '- compact: Raw arrays, minified JSON (~70-80% smaller, LLM-friendly)\n' +
            '- verbose: Human-readable objects with formatted values (backward compatible)'
        ),
    max_points: z.number().optional()
        .describe(
            'Maximum number of data points to return. If activity exceeds this, data will be intelligently downsampled ' +
            'while preserving peaks and valleys. Useful for very large activities.'
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

// Formatting functions (exported for testing)
export function formatStreamDataCompact(stream: BaseStream, data: any[]): any {
    switch (stream.type) {
        case 'latlng':
            return data as [number, number][];
        case 'time':
        case 'distance':
        case 'altitude':
        case 'velocity_smooth':
        case 'heartrate':
        case 'cadence':
        case 'watts':
        case 'temp':
        case 'grade_smooth':
            return data as number[];
        case 'moving':
            return data as boolean[];
        default:
            return data;
    }
}

export function formatStreamDataVerbose(stream: BaseStream, data: any[]): any {
    switch (stream.type) {
        case 'latlng':
            const latlngData = data as [number, number][];
            return latlngData.map(([lat, lng]) => ({
                latitude: Number(lat.toFixed(6)),
                longitude: Number(lng.toFixed(6))
            }));
        
        case 'time':
            const timeData = data as number[];
            return timeData.map(seconds => ({
                seconds_from_start: seconds,
                formatted: new Date(seconds * 1000).toISOString().substr(11, 8)
            }));
        
        case 'distance':
            const distanceData = data as number[];
            return distanceData.map(meters => ({
                meters,
                kilometers: Number((meters / 1000).toFixed(2))
            }));
        
        case 'velocity_smooth':
            const velocityData = data as number[];
            return velocityData.map(mps => ({
                meters_per_second: mps,
                kilometers_per_hour: Number((mps * 3.6).toFixed(1))
            }));
        
        case 'heartrate':
        case 'cadence':
        case 'watts':
        case 'temp':
            const numericData = data as number[];
            return numericData.map(v => Number(v));
        
        case 'grade_smooth':
            const gradeData = data as number[];
            return gradeData.map(grade => Number(grade.toFixed(1)));
        
        case 'moving':
            return data as boolean[];
        
        default:
            return data;
    }
}

// Intelligent downsampling that preserves peaks and valleys (exported for testing)
export function downsampleStream(stream: BaseStream, maxPoints: number): any[] {
    const data = stream.data;
    if (data.length <= maxPoints) {
        return data;
    }

    // Always preserve first and last points
    const result: any[] = [data[0]];
    const step = (data.length - 1) / (maxPoints - 1);

    // For numeric streams, preserve local peaks and valleys
    if (stream.type !== 'latlng' && stream.type !== 'moving') {
        const numericData = data as number[];
        const indices: number[] = [0];
        
        // Sample at regular intervals but also check for peaks/valleys
        for (let i = 1; i < maxPoints - 1; i++) {
            const targetIdx = Math.round(i * step);
            indices.push(targetIdx);
            
            // Check neighborhood for peaks/valleys
            const window = 3;
            const start = Math.max(1, targetIdx - window);
            const end = Math.min(numericData.length - 2, targetIdx + window);
            
            let maxIdx = targetIdx;
            let minIdx = targetIdx;
            for (let j = start; j <= end; j++) {
                const val = numericData[j];
                const maxVal = numericData[maxIdx];
                const minVal = numericData[minIdx];
                if (val !== undefined && maxVal !== undefined && val > maxVal) maxIdx = j;
                if (val !== undefined && minVal !== undefined && val < minVal) minIdx = j;
            }
            
            // Add peak or valley if significantly different
            const targetVal = numericData[targetIdx];
            const maxVal = numericData[maxIdx];
            const minVal = numericData[minIdx];
            if (targetVal !== undefined && maxVal !== undefined && maxIdx !== targetIdx && Math.abs(maxVal - targetVal) > targetVal * 0.1) {
                if (!indices.includes(maxIdx)) indices.push(maxIdx);
            }
            if (targetVal !== undefined && minVal !== undefined && minIdx !== targetIdx && Math.abs(minVal - targetVal) > targetVal * 0.1) {
                if (!indices.includes(minIdx)) indices.push(minIdx);
            }
        }
        
        indices.push(data.length - 1);
        indices.sort((a, b) => a - b);
        
        // Remove duplicates and limit to maxPoints
        const uniqueIndices = Array.from(new Set(indices)).slice(0, maxPoints);
        return uniqueIndices.map(idx => data[idx]).filter(v => v !== undefined);
    } else {
        // For latlng and moving, use uniform sampling
        for (let i = 1; i < maxPoints - 1; i++) {
            const idx = Math.round(i * step);
            const val = data[idx];
            if (val !== undefined) result.push(val);
        }
        const lastVal = data[data.length - 1];
        if (lastVal !== undefined) result.push(lastVal);
        return result;
    }
}

// Calculate optimal chunk size based on estimated JSON size (exported for testing)
export function calculateOptimalChunkSize(
    totalPoints: number,
    numStreamTypes: number,
    format: 'compact' | 'verbose',
    sampleData?: any
): number {
    const TARGET_SIZE_KB = 50;
    
    // Estimate bytes per point based on format
    let bytesPerPoint: number;
    if (format === 'compact') {
        // Compact: arrays, minimal structure
        // Estimate: ~20-30 bytes per point per stream type (numbers, arrays)
        bytesPerPoint = numStreamTypes * 25;
    } else {
        // Verbose: objects with formatted values
        // Estimate: ~100-150 bytes per point per stream type
        bytesPerPoint = numStreamTypes * 120;
    }
    
    // Add overhead for JSON structure (~500 bytes)
    const overhead = 500;
    
    // Calculate chunk size
    const targetBytes = TARGET_SIZE_KB * 1024;
    const estimatedChunkSize = Math.floor((targetBytes - overhead) / bytesPerPoint);
    
    // Ensure reasonable bounds
    const minChunkSize = 50;
    const maxChunkSize = format === 'compact' ? 2000 : 1000;
    
    let chunkSize = Math.max(minChunkSize, Math.min(maxChunkSize, estimatedChunkSize));
    
    // If we have sample data, refine estimate
    if (sampleData) {
        const sampleSize = JSON.stringify(sampleData).length;
        if (sampleSize > 0) {
            const actualBytesPerPoint = sampleSize / Math.min(100, totalPoints);
            chunkSize = Math.floor((targetBytes - overhead) / (actualBytesPerPoint * numStreamTypes));
            chunkSize = Math.max(minChunkSize, Math.min(maxChunkSize, chunkSize));
        }
    }
    
    return chunkSize;
}

// Tool definition
export const getActivityStreamsTool = {
    name: 'get-activity-streams',
    description: 
        'Retrieves detailed time-series data streams from a Strava activity. Perfect for analyzing workout metrics, ' +
        'visualizing routes, or performing detailed activity analysis.\n\n' +
        
        'Key Features:\n' +
        '1. Multiple Data Types: Access various metrics like heart rate, power, speed, GPS coordinates, etc.\n' +
        '2. Flexible Resolution: Choose data density from low (~100 points) to high (~10000 points)\n' +
        '3. Smart Pagination: Get data in manageable chunks optimized for LLM context limits\n' +
        '4. Rich Statistics: Includes min/max/avg for numeric streams\n' +
        '5. Dual Format Support: Compact (LLM-optimized) or verbose (human-readable)\n' +
        '6. Intelligent Downsampling: Automatically reduce large datasets while preserving key features\n\n' +
        
        'Format Options:\n' +
        '- compact (default): Raw arrays, minified JSON, ~70-80% smaller payloads, ideal for LLM processing\n' +
        '- verbose: Human-readable objects with formatted values, backward compatible with legacy format\n\n' +
        
        'Common Use Cases:\n' +
        '- Analyzing workout intensity through heart rate zones\n' +
        '- Calculating power metrics for cycling activities\n' +
        '- Visualizing route data using GPS coordinates\n' +
        '- Analyzing pace and elevation changes\n' +
        '- Detailed segment analysis\n\n' +
        
        'Output Format:\n' +
        '1. Metadata: Activity overview, available streams, data points, units, format info\n' +
        '2. Statistics: Summary stats for each stream type (max/min/avg where applicable)\n' +
        '3. Data: Time-series data in compact arrays or verbose objects (based on format parameter)\n\n' +
        
        'Notes:\n' +
        '- Requires activity:read scope\n' +
        '- Not all streams are available for all activities\n' +
        '- Older activities might have limited data\n' +
        '- Large activities are automatically chunked to ~50KB per message\n' +
        '- Use max_points parameter to downsample very large activities intelligently',
    inputSchema,
    execute: async ({ id, types = ['time', 'distance', 'heartrate', 'cadence', 'watts'], resolution, series_type, page = 1, points_per_page = 100, format = 'compact', max_points }: GetActivityStreamsParams) => {
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
            let streams = response.data;

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
            let referenceStream = streams[0]!;
            let totalPoints = referenceStream.data.length;
            let wasDownsampled = false;
            let originalPoints = totalPoints;

            // Apply downsampling if max_points is specified
            if (max_points && totalPoints > max_points) {
                originalPoints = totalPoints;
                streams = streams.map(stream => ({
                    ...stream,
                    data: downsampleStream(stream, max_points)
                }));
                referenceStream = streams[0]!;
                totalPoints = referenceStream.data.length;
                wasDownsampled = true;
            }

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
                // Calculate optimal chunk size based on format
                const CHUNK_SIZE = calculateOptimalChunkSize(totalPoints, streams.length, format);
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
                                          series_type: referenceStream.series_type,
                                          format,
                                          units: {
                                              time: 'seconds',
                                              distance: 'meters',
                                              altitude: 'meters',
                                              velocity_smooth: 'meters_per_second',
                                              heartrate: 'beats_per_minute',
                                              cadence: 'revolutions_per_minute',
                                              watts: 'watts',
                                              temp: 'celsius',
                                              grade_smooth: 'percent',
                                              latlng: '[latitude, longitude]',
                                              moving: 'boolean'
                                          },
                                          stream_descriptions: {
                                              time: 'Time elapsed from activity start',
                                              distance: 'Cumulative distance from start',
                                              altitude: 'Elevation above sea level',
                                              velocity_smooth: 'Smoothed speed',
                                              heartrate: 'Heart rate',
                                              cadence: 'Pedal/step cadence',
                                              watts: 'Power output',
                                              temp: 'Temperature',
                                              grade_smooth: 'Road grade percentage',
                                              latlng: 'GPS coordinates [latitude, longitude]',
                                              moving: 'Whether athlete was moving'
                                          },
                                          ...(wasDownsampled && { downsampled: true, original_points: originalPoints })
                                      },
                                      statistics: streamStats
                                  }, format === 'compact' ? undefined : null, format === 'compact' ? undefined : 2)
                        },
                        // Data messages
                        ...Array.from({ length: numChunks }, (_, i) => {
                            const chunkStart = i * CHUNK_SIZE;
                            const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, totalPoints);
                            const streamData: Record<string, any> = { data: {} };

                            // Process each stream for this chunk
                            streams.forEach(stream => {
                                const chunkData = stream.data.slice(chunkStart, chunkEnd);
                                const processedData = format === 'compact' 
                                    ? formatStreamDataCompact(stream, chunkData)
                                    : formatStreamDataVerbose(stream, chunkData);
                                streamData.data[stream.type] = processedData;
                            });

                            return {
                                type: 'text' as const,
                                text: `Message ${i + 2}/${numChunks + 1} (points ${chunkStart + 1}-${chunkEnd}):\n` +
                                      JSON.stringify(streamData, format === 'compact' ? undefined : null, format === 'compact' ? undefined : 2)
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
                    points_in_page: endIdx - startIdx,
                    format,
                    units: {
                        time: 'seconds',
                        distance: 'meters',
                        altitude: 'meters',
                        velocity_smooth: 'meters_per_second',
                        heartrate: 'beats_per_minute',
                        cadence: 'revolutions_per_minute',
                        watts: 'watts',
                        temp: 'celsius',
                        grade_smooth: 'percent',
                        latlng: '[latitude, longitude]',
                        moving: 'boolean'
                    },
                    stream_descriptions: {
                        time: 'Time elapsed from activity start',
                        distance: 'Cumulative distance from start',
                        altitude: 'Elevation above sea level',
                        velocity_smooth: 'Smoothed speed',
                        heartrate: 'Heart rate',
                        cadence: 'Pedal/step cadence',
                        watts: 'Power output',
                        temp: 'Temperature',
                        grade_smooth: 'Road grade percentage',
                        latlng: 'GPS coordinates [latitude, longitude]',
                        moving: 'Whether athlete was moving'
                    },
                    ...(wasDownsampled && { downsampled: true, original_points: originalPoints })
                },
                statistics: streamStats,
                data: {}
            };

            // Process each stream with pagination
            streams.forEach(stream => {
                const paginatedData = stream.data.slice(startIdx, endIdx);
                const processedData = format === 'compact' 
                    ? formatStreamDataCompact(stream, paginatedData)
                    : formatStreamDataVerbose(stream, paginatedData);
                streamData.data[stream.type] = processedData;
            });

            return {
                content: [{ 
                    type: 'text' as const, 
                    text: JSON.stringify(streamData, format === 'compact' ? undefined : null, format === 'compact' ? undefined : 2)
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