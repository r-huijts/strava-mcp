import { z } from 'zod';
import { stravaApi } from '../stravaClient.js';

// Define stream types available in Strava API
const STREAM_TYPES = [
    'time', 'distance', 'latlng', 'altitude', 'velocity_smooth',
    'heartrate', 'cadence', 'watts', 'temp', 'moving', 'grade_smooth'
] as const;

// Output format options
const OUTPUT_FORMATS = ['compact', 'stats_only', 'sampled'] as const;

// Time window schema - supports absolute and relative times
const timeWindowSchema = z.object({
    start: z.number().optional().describe(
        'Start time in seconds from activity start. Use negative values for relative-to-end (e.g., -900 = 15 min before end)'
    ),
    end: z.number().optional().describe(
        'End time in seconds from activity start. Use negative values for relative-to-end (e.g., -300 = 5 min before end)'
    ),
    last: z.number().optional().describe(
        'Shorthand: get last N seconds of activity (e.g., 600 = last 10 minutes)'
    ),
    first: z.number().optional().describe(
        'Shorthand: get first N seconds of activity (e.g., 600 = first 10 minutes)'
    ),
    middle: z.number().optional().describe(
        'Shorthand: get N seconds from the middle of activity'
    )
}).optional();

// Input schema using Zod
export const inputSchema = z.object({
    activity_ids: z.array(z.number().or(z.string())).min(1).max(20).describe(
        'Array of Strava activity IDs to fetch streams for (1-20 activities). Get IDs from get-recent-activities or get-all-activities.'
    ),
    types: z.array(z.enum(STREAM_TYPES))
        .default(['heartrate', 'watts', 'cadence'])
        .describe(
            'Stream types to fetch. For trend analysis, typically: heartrate, watts, cadence. ' +
            'Available: time, distance, latlng, altitude, velocity_smooth, heartrate, cadence, watts, temp, moving, grade_smooth'
        ),
    format: z.enum(OUTPUT_FORMATS).default('compact').describe(
        'Output format for token efficiency:\n' +
        '- compact: Raw arrays with minimal metadata (default, ~70% smaller than standard)\n' +
        '- stats_only: Only statistics (min/max/avg), no raw data (~95% smaller)\n' +
        '- sampled: Every Nth data point for visualization (~90% smaller)'
    ),
    sample_rate: z.number().min(1).max(100).default(10).describe(
        'For sampled format: return every Nth point. E.g., 10 = every 10th point. Default: 10'
    ),
    include_statistics: z.boolean().default(true).describe(
        'Include computed statistics (min/max/avg/normalized_power). Default: true'
    ),
    time_window: timeWindowSchema.describe(
        'Filter data to a specific time window. Options:\n' +
        '- start/end: Absolute seconds from start. Use negative for relative-to-end.\n' +
        '  Example: {start: -900, end: -300} = from 15min before end to 5min before end\n' +
        '- last: Get last N seconds. Example: {last: 600} = last 10 minutes\n' +
        '- first: Get first N seconds. Example: {first: 300} = first 5 minutes\n' +
        '- middle: Get N seconds from middle. Example: {middle: 600} = 10 min from middle\n' +
        'Time stream is always included when using time_window for context.'
    )
});

type GetBulkActivityStreamsParams = z.infer<typeof inputSchema>;

interface StreamData {
    type: string;
    data: any[];
    series_type: 'distance' | 'time';
    original_size: number;
    resolution: 'low' | 'medium' | 'high';
}

interface TimeWindow {
    start?: number;
    end?: number;
    last?: number;
    first?: number;
    middle?: number;
}

// Tool definition
export const getBulkActivityStreamsTool = {
    name: 'get-bulk-activity-streams',
    description:
        'Efficiently fetch activity streams for multiple activities with minimal token usage. ' +
        'Optimized for trend analysis across rides.\n\n' +
        'Token-efficient formats:\n' +
        '- compact: Raw number arrays, ~70% smaller than standard get-activity-streams\n' +
        '- stats_only: Just statistics (perfect for trend analysis), ~95% smaller\n' +
        '- sampled: Downsampled data for visualization, ~90% smaller\n\n' +
        'Example use cases:\n' +
        '- Analyze power trends across 10 rides: format=stats_only, types=[watts]\n' +
        '- Compare heart rate patterns: format=sampled, sample_rate=20\n' +
        '- Full data for 2-3 key activities: format=compact\n\n' +
        'Fetches up to 20 activities in parallel. Returns minified JSON.',
    inputSchema,
    execute: async ({
        activity_ids,
        types,
        format,
        sample_rate,
        include_statistics,
        time_window
    }: GetBulkActivityStreamsParams) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;
        if (!token) {
            return {
                content: [{ type: 'text' as const, text: 'ERROR: Missing STRAVA_ACCESS_TOKEN' }],
                isError: true
            };
        }

        try {
            stravaApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            // If time_window is used, we always need the time stream
            const typesToFetch = [...types];
            if (time_window && !typesToFetch.includes('time')) {
                typesToFetch.push('time');
            }

            // Fetch all activities in parallel
            const results = await Promise.allSettled(
                activity_ids.map(async (id) => {
                    const endpoint = `/activities/${id}/streams/${typesToFetch.join(',')}`;
                    const response = await stravaApi.get<StreamData[]>(endpoint);
                    return { id, streams: response.data };
                })
            );

            // Process results into compact format
            const output: Record<string, any> = {};

            for (const result of results) {
                if (result.status === 'rejected') {
                    continue; // Skip failed fetches silently
                }

                const { id, streams } = result.value;
                if (!streams || streams.length === 0) {
                    output[id] = { error: 'no_data' };
                    continue;
                }

                // Find time stream for window calculations
                const timeStream = streams.find(s => s.type === 'time');
                const timeData = timeStream?.data as number[] || [];

                // Calculate slice indices based on time_window
                let startIdx = 0;
                let endIdx = timeData.length;
                let windowInfo: Record<string, any> | undefined;

                if (time_window && timeData.length > 0) {
                    const totalDuration = timeData[timeData.length - 1]!;
                    const { startSec, endSec } = resolveTimeWindow(time_window as TimeWindow, totalDuration);

                    // Find indices using binary search for efficiency
                    startIdx = findTimeIndex(timeData, startSec);
                    endIdx = findTimeIndex(timeData, endSec);

                    // Ensure we have at least some data
                    if (endIdx <= startIdx) {
                        endIdx = Math.min(startIdx + 1, timeData.length);
                    }

                    windowInfo = {
                        total_sec: totalDuration,
                        window_sec: [Math.round(startSec), Math.round(endSec)],
                        window_pts: endIdx - startIdx
                    };
                }

                const activityData: Record<string, any> = {};

                // Add window info if applicable
                if (windowInfo) {
                    activityData._w = windowInfo; // '_w' for window metadata
                }

                for (const stream of streams) {
                    const streamType = stream.type;

                    // Skip time stream in output if it wasn't originally requested
                    if (streamType === 'time' && !types.includes('time') && time_window) {
                        continue;
                    }

                    // Slice data to time window
                    const fullData = stream.data;
                    const data = time_window ? fullData.slice(startIdx, endIdx) : fullData;

                    // Calculate statistics if requested
                    let stats: Record<string, number> | undefined;
                    if (include_statistics && isNumericStream(streamType)) {
                        stats = computeStats(streamType, data as number[]);
                    }

                    if (format === 'stats_only') {
                        // Only return statistics
                        activityData[streamType] = stats || { n: data.length };
                    } else if (format === 'sampled') {
                        // Return sampled data
                        const sampled = sampleArray(data, sample_rate);
                        activityData[streamType] = {
                            ...(stats && { s: stats }), // 's' for stats
                            d: compactData(streamType, sampled), // 'd' for data
                            n: data.length, // 'n' for window count
                            r: sample_rate // 'r' for rate
                        };
                    } else {
                        // Compact format - raw arrays with minimal wrapping
                        activityData[streamType] = {
                            ...(stats && { s: stats }),
                            d: compactData(streamType, data),
                            n: data.length
                        };
                    }
                }

                output[id] = activityData;
            }

            // Count successes and failures
            const successCount = Object.keys(output).filter(k => !output[k]?.error).length;
            const failCount = activity_ids.length - successCount;

            // Build minimal response
            const response: Record<string, any> = {
                _: { // Underscore for meta to save characters
                    ok: successCount,
                    fail: failCount,
                    fmt: format,
                    types: types
                },
                data: output
            };

            // Add time window to meta if used
            if (time_window) {
                response._.tw = summarizeTimeWindow(time_window);
            }

            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(response) // No pretty printing!
                }]
            };

        } catch (error: any) {
            return {
                content: [{
                    type: 'text' as const,
                    text: `ERROR: ${error.response?.status || 'unknown'} - ${error.message}`
                }],
                isError: true
            };
        }
    }
};

// Helper: Resolve time window to absolute start/end seconds
function resolveTimeWindow(tw: TimeWindow, totalDuration: number): { startSec: number; endSec: number } {
    let startSec = 0;
    let endSec = totalDuration;

    if (tw.last !== undefined) {
        // Last N seconds
        startSec = Math.max(0, totalDuration - tw.last);
        endSec = totalDuration;
    } else if (tw.first !== undefined) {
        // First N seconds
        startSec = 0;
        endSec = Math.min(totalDuration, tw.first);
    } else if (tw.middle !== undefined) {
        // Middle N seconds
        const midpoint = totalDuration / 2;
        const halfWindow = tw.middle / 2;
        startSec = Math.max(0, midpoint - halfWindow);
        endSec = Math.min(totalDuration, midpoint + halfWindow);
    } else {
        // Explicit start/end (support negative for relative-to-end)
        if (tw.start !== undefined) {
            startSec = tw.start < 0 ? totalDuration + tw.start : tw.start;
        }
        if (tw.end !== undefined) {
            endSec = tw.end < 0 ? totalDuration + tw.end : tw.end;
        }
    }

    // Clamp to valid range
    startSec = Math.max(0, Math.min(startSec, totalDuration));
    endSec = Math.max(startSec, Math.min(endSec, totalDuration));

    return { startSec, endSec };
}

// Helper: Binary search for time index
function findTimeIndex(timeData: number[], targetTime: number): number {
    if (timeData.length === 0) return 0;
    if (targetTime <= timeData[0]!) return 0;
    if (targetTime >= timeData[timeData.length - 1]!) return timeData.length;

    let low = 0;
    let high = timeData.length - 1;

    while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (timeData[mid]! < targetTime) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }

    return low;
}

// Helper: Summarize time window for metadata
function summarizeTimeWindow(tw: TimeWindow): string {
    if (tw.last !== undefined) return `last_${tw.last}s`;
    if (tw.first !== undefined) return `first_${tw.first}s`;
    if (tw.middle !== undefined) return `mid_${tw.middle}s`;
    const parts = [];
    if (tw.start !== undefined) parts.push(`s:${tw.start}`);
    if (tw.end !== undefined) parts.push(`e:${tw.end}`);
    return parts.join(',');
}

// Helper: Check if stream type has numeric data
function isNumericStream(type: string): boolean {
    return ['heartrate', 'watts', 'cadence', 'velocity_smooth', 'altitude', 'temp', 'grade_smooth', 'time', 'distance'].includes(type);
}

// Helper: Compute statistics for numeric streams
function computeStats(type: string, data: number[]): Record<string, number> {
    if (data.length === 0) return { n: 0 };

    const sum = data.reduce((a, b) => a + b, 0);
    const avg = sum / data.length;
    const max = Math.max(...data);
    const min = Math.min(...data);

    const stats: Record<string, number> = {
        n: data.length,
        avg: Math.round(avg * 10) / 10,
        max: Math.round(max * 10) / 10,
        min: Math.round(min * 10) / 10
    };

    // Add type-specific stats
    if (type === 'watts' && data.length >= 30) {
        stats.np = calculateNormalizedPower(data);
    }
    if (type === 'velocity_smooth') {
        // Convert to km/h
        stats.avg_kph = Math.round(avg * 3.6 * 10) / 10;
        stats.max_kph = Math.round(max * 3.6 * 10) / 10;
    }

    return stats;
}

// Helper: Sample array at given rate
function sampleArray<T>(data: T[], rate: number): T[] {
    if (rate <= 1) return data;
    return data.filter((_, i) => i % rate === 0);
}

// Helper: Compact data representation
function compactData(type: string, data: any[]): any[] {
    switch (type) {
        case 'latlng':
            // Keep as [lat,lng] pairs but round to 5 decimals (11m precision)
            return data.map(([lat, lng]: [number, number]) => [
                Math.round(lat * 100000) / 100000,
                Math.round(lng * 100000) / 100000
            ]);
        case 'velocity_smooth':
            // Round to 1 decimal (m/s)
            return data.map((v: number) => Math.round(v * 10) / 10);
        case 'altitude':
        case 'grade_smooth':
            // Round to 1 decimal
            return data.map((v: number) => Math.round(v * 10) / 10);
        case 'heartrate':
        case 'cadence':
        case 'watts':
        case 'temp':
        case 'time':
            // Keep as integers
            return data.map((v: number) => Math.round(v));
        case 'distance':
            // Round to whole meters
            return data.map((v: number) => Math.round(v));
        case 'moving':
            // Convert booleans to 0/1 for compactness
            return data.map((v: boolean) => v ? 1 : 0);
        default:
            return data;
    }
}

// Helper: Calculate normalized power
function calculateNormalizedPower(powerData: number[]): number {
    if (powerData.length < 30) return 0;

    const windowSize = 30;
    const movingAvg: number[] = [];

    for (let i = windowSize - 1; i < powerData.length; i++) {
        const window = powerData.slice(i - windowSize + 1, i + 1);
        const avg = window.reduce((a, b) => a + b, 0) / windowSize;
        movingAvg.push(Math.pow(avg, 4));
    }

    const avgPower = Math.pow(
        movingAvg.reduce((a, b) => a + b, 0) / movingAvg.length,
        0.25
    );

    return Math.round(avgPower);
}
