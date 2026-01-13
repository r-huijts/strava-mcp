import { describe, expect, it, vi, beforeEach } from "vitest";
import { getActivityStreamsTool } from "../src/tools/getActivityStreams.js";
import { stravaApi } from "../src/stravaClient.js";

// Helper to create realistic mock stream data
function createRealisticStreams(totalPoints: number) {
    const timeData = Array.from({ length: totalPoints }, (_, i) => i);
    const distanceData = Array.from({ length: totalPoints }, (_, i) => i * 5.2);
    const heartrateData = Array.from({ length: totalPoints }, (_, i) => {
        // Simulate realistic heart rate with variation
        const base = 120;
        const variation = Math.sin(i / 50) * 30;
        const noise = (Math.random() - 0.5) * 10;
        return Math.round(base + variation + noise);
    });
    const wattsData = Array.from({ length: totalPoints }, (_, i) => {
        // Simulate power with peaks and valleys
        const base = 200;
        const variation = Math.cos(i / 100) * 150;
        const noise = (Math.random() - 0.5) * 20;
        return Math.round(base + variation + noise);
    });
    const latlngData = Array.from({ length: totalPoints }, (_, i) => [
        51.5 + i * 0.0001,
        -0.1 + i * 0.0001
    ]);

    return [
        {
            type: 'time',
            data: timeData,
            series_type: 'time' as const,
            original_size: totalPoints,
            resolution: totalPoints < 500 ? 'low' : totalPoints < 2000 ? 'medium' : 'high' as const
        },
        {
            type: 'distance',
            data: distanceData,
            series_type: 'time' as const,
            original_size: totalPoints,
            resolution: totalPoints < 500 ? 'low' : totalPoints < 2000 ? 'medium' : 'high' as const
        },
        {
            type: 'heartrate',
            data: heartrateData,
            series_type: 'time' as const,
            original_size: totalPoints,
            resolution: totalPoints < 500 ? 'low' : totalPoints < 2000 ? 'medium' : 'high' as const
        },
        {
            type: 'watts',
            data: wattsData,
            series_type: 'time' as const,
            original_size: totalPoints,
            resolution: totalPoints < 500 ? 'low' : totalPoints < 2000 ? 'medium' : 'high' as const
        },
        {
            type: 'latlng',
            data: latlngData,
            series_type: 'time' as const,
            original_size: totalPoints,
            resolution: totalPoints < 500 ? 'low' : totalPoints < 2000 ? 'medium' : 'high' as const
        }
    ];
}

describe('get-activity-streams E2E', () => {
    beforeEach(() => {
        process.env.STRAVA_ACCESS_TOKEN = 'test-token';
        stravaApi.defaults = {
            headers: {
                common: {}
            }
        } as any;
    });

    describe('Compact format E2E', () => {
        it('should return compact format with all data preserved for small activity', async () => {
            const mockStreams = createRealisticStreams(100);
            
            vi.spyOn(stravaApi, 'get').mockResolvedValue({
                data: mockStreams
            } as any);

            const result = await getActivityStreamsTool.execute({ 
                id: 12345, 
                format: 'compact',
                types: ['time', 'distance', 'heartrate', 'watts', 'latlng']
            });

            expect(result.isError).toBeFalsy();
            expect(result.content).toHaveLength(1);
            
            const parsed = JSON.parse(result.content[0].text);
            
            // Verify structure
            expect(parsed.metadata).toBeDefined();
            expect(parsed.metadata.format).toBe('compact');
            expect(parsed.metadata.total_points).toBe(100);
            expect(parsed.statistics).toBeDefined();
            expect(parsed.data).toBeDefined();
            
            // Verify compact format - arrays, not objects
            expect(Array.isArray(parsed.data.time)).toBe(true);
            expect(Array.isArray(parsed.data.distance)).toBe(true);
            expect(Array.isArray(parsed.data.heartrate)).toBe(true);
            expect(Array.isArray(parsed.data.watts)).toBe(true);
            expect(Array.isArray(parsed.data.latlng)).toBe(true);
            
            // Verify data integrity
            expect(parsed.data.time).toHaveLength(100);
            expect(parsed.data.time[0]).toBe(0);
            expect(parsed.data.time[99]).toBe(99);
            
            // Verify latlng format
            expect(Array.isArray(parsed.data.latlng[0])).toBe(true);
            expect(parsed.data.latlng[0]).toHaveLength(2);
            
            // Verify statistics are calculated
            expect(parsed.statistics.heartrate).toBeDefined();
            expect(parsed.statistics.heartrate.max).toBeGreaterThan(parsed.statistics.heartrate.min);
            expect(parsed.statistics.watts).toBeDefined();
            expect(parsed.statistics.watts.max).toBeDefined();
        });

        it('should chunk large activities appropriately', async () => {
            const mockStreams = createRealisticStreams(5000);
            
            vi.spyOn(stravaApi, 'get').mockResolvedValue({
                data: mockStreams
            } as any);

            const result = await getActivityStreamsTool.execute({ 
                id: 12345, 
                format: 'compact',
                points_per_page: -1 // Request all data
            });

            expect(result.isError).toBeFalsy();
            expect(result.content.length).toBeGreaterThan(1);
            
            // First message should be metadata
            const firstMessageText = result.content[0].text;
            const jsonMatch = firstMessageText.match(/Message 1\/\d+:\n(.*)/s);
            const jsonText = jsonMatch ? jsonMatch[1] : firstMessageText;
            const metadata = JSON.parse(jsonText);
            
            expect(metadata.metadata.total_points).toBe(5000);
            expect(metadata.metadata.total_chunks).toBeGreaterThan(1);
            expect(metadata.metadata.chunk_size).toBeDefined();
            
            // Verify chunks contain data
            let totalPointsInChunks = 0;
            for (let i = 1; i < result.content.length; i++) {
                const chunkText = result.content[i].text;
                const chunkMatch = chunkText.match(/Message \d+\/\d+ \(points \d+-\d+\):\n(.*)/s);
                if (chunkMatch) {
                    const chunkData = JSON.parse(chunkMatch[1]);
                    expect(chunkData.data).toBeDefined();
                    
                    // Count points in this chunk
                    const pointMatch = chunkText.match(/points (\d+)-(\d+)/);
                    if (pointMatch) {
                        const start = parseInt(pointMatch[1]);
                        const end = parseInt(pointMatch[2]);
                        totalPointsInChunks += (end - start + 1);
                    }
                }
            }
            
            // All points should be accounted for
            expect(totalPointsInChunks).toBe(5000);
        });

        it('should handle pagination correctly', async () => {
            const mockStreams = createRealisticStreams(500);
            
            vi.spyOn(stravaApi, 'get').mockResolvedValue({
                data: mockStreams
            } as any);

            // Get first page
            const page1 = await getActivityStreamsTool.execute({ 
                id: 12345, 
                format: 'compact',
                page: 1,
                points_per_page: 100
            });

            expect(page1.isError).toBeFalsy();
            const parsed1 = JSON.parse(page1.content[0].text);
            expect(parsed1.metadata.current_page).toBe(1);
            expect(parsed1.metadata.total_pages).toBe(5);
            expect(parsed1.data.time).toHaveLength(100);
            expect(parsed1.data.time[0]).toBe(0);
            expect(parsed1.data.time[99]).toBe(99);
            
            // Get second page
            const page2 = await getActivityStreamsTool.execute({ 
                id: 12345, 
                format: 'compact',
                page: 2,
                points_per_page: 100
            });

            expect(page2.isError).toBeFalsy();
            const parsed2 = JSON.parse(page2.content[0].text);
            expect(parsed2.metadata.current_page).toBe(2);
            expect(parsed2.data.time).toHaveLength(100);
            expect(parsed2.data.time[0]).toBe(100);
            expect(parsed2.data.time[99]).toBe(199);
        });
    });

    describe('Verbose format E2E', () => {
        it('should return verbose format with formatted values', async () => {
            const mockStreams = createRealisticStreams(50);
            
            vi.spyOn(stravaApi, 'get').mockResolvedValue({
                data: mockStreams
            } as any);

            const result = await getActivityStreamsTool.execute({ 
                id: 12345, 
                format: 'verbose',
                types: ['time', 'distance', 'heartrate']
            });

            expect(result.isError).toBeFalsy();
            const parsed = JSON.parse(result.content[0].text);
            
            expect(parsed.metadata.format).toBe('verbose');
            
            // Verify verbose format - objects with formatted values
            expect(Array.isArray(parsed.data.time)).toBe(true);
            expect(parsed.data.time[0]).toHaveProperty('seconds_from_start');
            expect(parsed.data.time[0]).toHaveProperty('formatted');
            
            expect(parsed.data.distance[0]).toHaveProperty('meters');
            expect(parsed.data.distance[0]).toHaveProperty('kilometers');
            
            expect(Array.isArray(parsed.data.heartrate)).toBe(true);
            expect(typeof parsed.data.heartrate[0]).toBe('number');
        });

        it('should maintain backward compatibility with legacy format', async () => {
            const mockStreams = createRealisticStreams(10);
            
            vi.spyOn(stravaApi, 'get').mockResolvedValue({
                data: mockStreams
            } as any);

            const result = await getActivityStreamsTool.execute({ 
                id: 12345, 
                format: 'verbose'
            });

            const parsed = JSON.parse(result.content[0].text);
            
            // Legacy structure: metadata, statistics, data (not streams)
            expect(parsed.metadata).toBeDefined();
            expect(parsed.statistics).toBeDefined();
            expect(parsed.data).toBeDefined();
            expect(parsed.streams).toBeUndefined();
        });
    });

    describe('Downsampling E2E', () => {
        it('should downsample large activities while preserving key features', async () => {
            const mockStreams = createRealisticStreams(5000);
            
            vi.spyOn(stravaApi, 'get').mockResolvedValue({
                data: mockStreams
            } as any);

            const result = await getActivityStreamsTool.execute({ 
                id: 12345, 
                format: 'compact',
                max_points: 500
            });

            expect(result.isError).toBeFalsy();
            const parsed = JSON.parse(result.content[0].text);
            
            expect(parsed.metadata.downsampled).toBe(true);
            expect(parsed.metadata.original_points).toBe(5000);
            expect(parsed.metadata.total_points).toBeLessThanOrEqual(500);
            
            // Verify first point is preserved
            expect(parsed.data.time[0]).toBe(0);
            
            // Verify downsampling worked - should have significantly fewer points than original
            expect(parsed.data.time.length).toBeLessThanOrEqual(500);
            expect(parsed.data.time.length).toBeLessThan(5000); // Definitely downsampled
            expect(parsed.data.time.length).toBeGreaterThan(50); // But still meaningful amount
            
            // Verify data integrity - all values should be valid time points
            const lastIdx = parsed.data.time.length - 1;
            const lastValue = parsed.data.time[lastIdx];
            expect(lastValue).toBeGreaterThanOrEqual(0);
            expect(lastValue).toBeLessThan(5000);
            
            // Verify the data is sorted (time should be monotonically increasing)
            for (let i = 1; i < parsed.data.time.length; i++) {
                expect(parsed.data.time[i]).toBeGreaterThanOrEqual(parsed.data.time[i - 1]);
            }
            
            // Verify statistics are still meaningful
            expect(parsed.statistics.heartrate).toBeDefined();
            expect(parsed.statistics.watts).toBeDefined();
        });

        it('should not downsample when under max_points', async () => {
            const mockStreams = createRealisticStreams(100);
            
            vi.spyOn(stravaApi, 'get').mockResolvedValue({
                data: mockStreams
            } as any);

            const result = await getActivityStreamsTool.execute({ 
                id: 12345, 
                format: 'compact',
                max_points: 500
            });

            expect(result.isError).toBeFalsy();
            const parsed = JSON.parse(result.content[0].text);
            
            expect(parsed.metadata.downsampled).toBeUndefined();
            expect(parsed.metadata.total_points).toBe(100);
        });
    });

    describe('Size comparison E2E', () => {
        it('should produce significantly smaller payloads in compact format', async () => {
            const mockStreams = createRealisticStreams(1000);
            
            const mockGet = vi.spyOn(stravaApi, 'get');
            mockGet.mockResolvedValue({
                data: mockStreams
            } as any);

            const compactResult = await getActivityStreamsTool.execute({ 
                id: 12345, 
                format: 'compact'
            });
            
            mockGet.mockClear();
            mockGet.mockResolvedValue({
                data: mockStreams
            } as any);
            
            const verboseResult = await getActivityStreamsTool.execute({ 
                id: 12345, 
                format: 'verbose'
            });

            const compactSize = compactResult.content[0].text.length;
            const verboseSize = verboseResult.content[0].text.length;
            
            // Compact should be at least 50% smaller for larger datasets
            expect(compactSize).toBeLessThan(verboseSize * 0.5);
            
            // Verify both contain the same data (just formatted differently)
            const compactParsed = JSON.parse(compactResult.content[0].text);
            const verboseParsed = JSON.parse(verboseResult.content[0].text);
            
            expect(compactParsed.metadata.total_points).toBe(verboseParsed.metadata.total_points);
            expect(compactParsed.statistics.heartrate.max).toBe(verboseParsed.statistics.heartrate.max);
        });
    });

    describe('Error handling E2E', () => {
        it('should handle API errors gracefully', async () => {
            vi.spyOn(stravaApi, 'get').mockRejectedValue({
                response: {
                    status: 404,
                    data: { message: 'Activity not found' }
                }
            });

            const result = await getActivityStreamsTool.execute({ id: 99999 });
            
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Failed to fetch activity streams');
            expect(result.content[0].text).toContain('404');
        });

        it('should handle missing token', async () => {
            delete process.env.STRAVA_ACCESS_TOKEN;
            
            const result = await getActivityStreamsTool.execute({ id: 12345 });
            
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Missing STRAVA_ACCESS_TOKEN');
            
            // Restore for other tests
            process.env.STRAVA_ACCESS_TOKEN = 'test-token';
        });

        it('should handle empty stream response', async () => {
            vi.spyOn(stravaApi, 'get').mockResolvedValue({
                data: []
            } as any);

            const result = await getActivityStreamsTool.execute({ id: 12345 });
            
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('No streams were returned');
        });
    });

    describe('Real-world scenario E2E', () => {
        it('should handle a typical cycling activity with all stream types', async () => {
            // Simulate a 2-hour cycling activity with 1-second intervals
            const totalPoints = 7200;
            const mockStreams = createRealisticStreams(totalPoints);
            
            vi.spyOn(stravaApi, 'get').mockResolvedValue({
                data: mockStreams
            } as any);

            const result = await getActivityStreamsTool.execute({ 
                id: 12345, 
                format: 'compact',
                types: ['time', 'distance', 'heartrate', 'watts', 'latlng'],
                points_per_page: -1
            });

            expect(result.isError).toBeFalsy();
            expect(result.content.length).toBeGreaterThan(1);
            
            // Verify metadata
            const firstMessageText = result.content[0].text;
            const jsonMatch = firstMessageText.match(/Message 1\/\d+:\n(.*)/s);
            const metadata = JSON.parse(jsonMatch ? jsonMatch[1] : firstMessageText);
            
            expect(metadata.metadata.total_points).toBe(totalPoints);
            expect(metadata.metadata.available_types).toHaveLength(5);
            
            // Verify statistics are meaningful for a long activity
            expect(metadata.statistics.heartrate.max).toBeGreaterThan(metadata.statistics.heartrate.min);
            expect(metadata.statistics.watts.max).toBeGreaterThan(100);
            
            // Verify chunks are reasonable size
            for (let i = 1; i < Math.min(5, result.content.length); i++) {
                const chunkText = result.content[i].text;
                expect(chunkText.length).toBeLessThan(100 * 1024); // Less than 100KB per chunk
            }
        });

        it('should handle a short run activity with minimal data', async () => {
            const mockStreams = [
                {
                    type: 'time',
                    data: [0, 1, 2, 3, 4, 5],
                    series_type: 'time' as const,
                    original_size: 6,
                    resolution: 'low' as const
                },
                {
                    type: 'distance',
                    data: [0, 3.5, 7.0, 10.5, 14.0, 17.5],
                    series_type: 'time' as const,
                    original_size: 6,
                    resolution: 'low' as const
                }
            ];
            
            vi.spyOn(stravaApi, 'get').mockResolvedValue({
                data: mockStreams
            } as any);

            const result = await getActivityStreamsTool.execute({ 
                id: 12345, 
                format: 'compact'
            });

            expect(result.isError).toBeFalsy();
            const parsed = JSON.parse(result.content[0].text);
            
            expect(parsed.metadata.total_points).toBe(6);
            expect(parsed.data.time).toEqual([0, 1, 2, 3, 4, 5]);
            expect(parsed.data.distance).toEqual([0, 3.5, 7.0, 10.5, 14.0, 17.5]);
        });
    });
});
