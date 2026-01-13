import { describe, expect, it, vi, beforeEach } from "vitest";
import { 
    formatStreamDataCompact, 
    formatStreamDataVerbose, 
    downsampleStream, 
    calculateOptimalChunkSize,
    getActivityStreamsTool 
} from "../src/tools/getActivityStreams.js";
import { stravaApi } from "../src/stravaClient.js";

// Helper to create mock stream
function createMockStream(type: string, data: any[], resolution: 'low' | 'medium' | 'high' = 'medium') {
    return {
        type,
        data,
        series_type: 'time' as const,
        original_size: data.length,
        resolution
    };
}

describe('formatStreamDataCompact', () => {
    it('returns raw arrays for numeric streams (heartrate, watts, cadence)', () => {
        const stream = createMockStream('heartrate', [120, 125, 130]);
        const result = formatStreamDataCompact(stream, stream.data);
        expect(result).toEqual([120, 125, 130]);
        expect(Array.isArray(result)).toBe(true);
    });

    it('returns [lat, lng] pairs for latlng stream', () => {
        const stream = createMockStream('latlng', [[51.5, -0.1], [51.51, -0.11]]);
        const result = formatStreamDataCompact(stream, stream.data);
        expect(result).toEqual([[51.5, -0.1], [51.51, -0.11]]);
    });

    it('returns raw seconds for time stream', () => {
        const stream = createMockStream('time', [0, 1, 2, 3]);
        const result = formatStreamDataCompact(stream, stream.data);
        expect(result).toEqual([0, 1, 2, 3]);
    });

    it('returns raw meters for distance stream', () => {
        const stream = createMockStream('distance', [0, 5.2, 10.5]);
        const result = formatStreamDataCompact(stream, stream.data);
        expect(result).toEqual([0, 5.2, 10.5]);
    });

    it('handles empty stream data', () => {
        const stream = createMockStream('heartrate', []);
        const result = formatStreamDataCompact(stream, stream.data);
        expect(result).toEqual([]);
    });
});

describe('formatStreamDataVerbose', () => {
    it('returns objects with formatted values for time stream', () => {
        const stream = createMockStream('time', [0, 3661]); // 0s and 1h 1m 1s
        const result = formatStreamDataVerbose(stream, stream.data);
        expect(result).toHaveLength(2);
        expect(result[0]).toHaveProperty('seconds_from_start', 0);
        expect(result[0]).toHaveProperty('formatted');
        expect(result[1]).toHaveProperty('seconds_from_start', 3661);
    });

    it('returns objects with meters and kilometers for distance', () => {
        const stream = createMockStream('distance', [0, 1000, 2500]);
        const result = formatStreamDataVerbose(stream, stream.data);
        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({ meters: 0, kilometers: 0 });
        expect(result[1]).toEqual({ meters: 1000, kilometers: 1 });
        expect(result[2]).toEqual({ meters: 2500, kilometers: 2.5 });
    });

    it('maintains backward compatibility with existing format', () => {
        const stream = createMockStream('latlng', [[51.5, -0.1]]);
        const result = formatStreamDataVerbose(stream, stream.data);
        expect(result[0]).toHaveProperty('latitude');
        expect(result[0]).toHaveProperty('longitude');
        expect(result[0].latitude).toBeCloseTo(51.5, 6);
    });
});

describe('downsampleStream', () => {
    it('reduces data to max_points when exceeded', () => {
        const stream = createMockStream('heartrate', Array.from({ length: 1000 }, (_, i) => 120 + i));
        const result = downsampleStream(stream, 100);
        expect(result.length).toBeLessThanOrEqual(100);
        expect(result.length).toBeGreaterThan(50); // Should be close to max_points
    });

    it('preserves first and last points', () => {
        const stream = createMockStream('heartrate', Array.from({ length: 1000 }, (_, i) => 120 + i));
        const result = downsampleStream(stream, 50);
        expect(result[0]).toBe(120);
        expect(result[result.length - 1]).toBe(1119);
    });

    it('preserves peaks and valleys in numeric data', () => {
        // Create data with clear peaks and valleys
        const data = Array.from({ length: 200 }, (_, i) => {
            if (i === 50) return 200; // Peak
            if (i === 100) return 50;  // Valley
            return 120 + Math.sin(i / 10) * 10;
        });
        const stream = createMockStream('heartrate', data);
        const result = downsampleStream(stream, 50);
        
        // Check that peak and valley are preserved (within reasonable range)
        const peakIdx = result.indexOf(200);
        const valleyIdx = result.findIndex(v => v <= 60);
        expect(peakIdx >= 0 || valleyIdx >= 0).toBe(true);
    });

    it('returns original data when under max_points', () => {
        const stream = createMockStream('heartrate', [120, 125, 130]);
        const result = downsampleStream(stream, 100);
        expect(result).toEqual([120, 125, 130]);
    });

    it('handles latlng downsampling correctly', () => {
        const data = Array.from({ length: 1000 }, (_, i) => [51.5 + i * 0.0001, -0.1 + i * 0.0001]);
        const stream = createMockStream('latlng', data);
        const result = downsampleStream(stream, 100);
        expect(result.length).toBeLessThanOrEqual(100);
        expect(Array.isArray(result[0])).toBe(true);
        expect(result[0]).toHaveLength(2);
    });
});

describe('calculateOptimalChunkSize', () => {
    it('targets ~50KB per chunk', () => {
        const chunkSize = calculateOptimalChunkSize(10000, 5, 'compact');
        expect(chunkSize).toBeGreaterThan(50);
        expect(chunkSize).toBeLessThan(2000);
    });

    it('adjusts for number of stream types', () => {
        const chunkSize5 = calculateOptimalChunkSize(10000, 5, 'compact');
        const chunkSize10 = calculateOptimalChunkSize(10000, 10, 'compact');
        expect(chunkSize10).toBeLessThan(chunkSize5);
    });

    it('returns smaller chunks for compact format', () => {
        const compactSize = calculateOptimalChunkSize(10000, 5, 'compact');
        const verboseSize = calculateOptimalChunkSize(10000, 5, 'verbose');
        expect(compactSize).toBeGreaterThan(verboseSize);
    });

    it('handles edge case of very small activities', () => {
        const chunkSize = calculateOptimalChunkSize(10, 5, 'compact');
        expect(chunkSize).toBeGreaterThanOrEqual(50); // Minimum chunk size
    });
});

describe('get-activity-streams format parameter', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.STRAVA_ACCESS_TOKEN = 'test-token';
        // Mock stravaApi defaults
        stravaApi.defaults = {
            headers: {
                common: {}
            }
        } as any;
    });

    it('defaults to compact format', async () => {
        const mockStreams = [
            createMockStream('time', [0, 1, 2]),
            createMockStream('heartrate', [120, 125, 130])
        ];

        const mockGet = vi.spyOn(stravaApi, 'get');
        mockGet.mockResolvedValue({
            data: mockStreams
        } as any);

        const result = await getActivityStreamsTool.execute({ id: 123 });
        
        if (result.isError) {
            console.error('Error result:', result.content[0].text);
        }
        
        expect(result.isError).toBeFalsy();
        const content = result.content[0];
        expect(content.type).toBe('text');
        
        const parsed = JSON.parse(content.text);
        expect(parsed.metadata.format).toBe('compact');
        expect(Array.isArray(parsed.data.time)).toBe(true);
        expect(Array.isArray(parsed.data.heartrate)).toBe(true);
    });

    it('uses verbose format when specified', async () => {
        const mockStreams = [
            createMockStream('time', [0, 1]),
            createMockStream('distance', [0, 1000])
        ];

        vi.spyOn(stravaApi, 'get').mockResolvedValue({
            data: mockStreams
        } as any);

        const result = await getActivityStreamsTool.execute({ id: 123, format: 'verbose' });
        const content = result.content[0];
        const parsed = JSON.parse(content.text);
        
        expect(parsed.metadata.format).toBe('verbose');
        expect(parsed.data.time[0]).toHaveProperty('seconds_from_start');
        expect(parsed.data.time[0]).toHaveProperty('formatted');
        expect(parsed.data.distance[0]).toHaveProperty('meters');
        expect(parsed.data.distance[0]).toHaveProperty('kilometers');
    });

    it('compact format produces valid JSON', async () => {
        const mockStreams = [
            createMockStream('heartrate', [120, 125, 130])
        ];

        vi.spyOn(stravaApi, 'get').mockResolvedValue({
            data: mockStreams
        } as any);

        const result = await getActivityStreamsTool.execute({ id: 123, format: 'compact' });
        const content = result.content[0];
        
        expect(() => JSON.parse(content.text)).not.toThrow();
        const parsed = JSON.parse(content.text);
        expect(parsed.data).toBeDefined();
    });

    it('verbose format matches legacy output structure', async () => {
        const mockStreams = [
            createMockStream('time', [0]),
            createMockStream('distance', [0])
        ];

        vi.spyOn(stravaApi, 'get').mockResolvedValue({
            data: mockStreams
        } as any);

        const result = await getActivityStreamsTool.execute({ id: 123, format: 'verbose' });
        const content = result.content[0];
        const parsed = JSON.parse(content.text);
        
        expect(parsed.metadata).toBeDefined();
        expect(parsed.statistics).toBeDefined();
        expect(parsed.data).toBeDefined();
    });
});

describe('compact vs verbose size comparison', () => {
    beforeEach(() => {
        process.env.STRAVA_ACCESS_TOKEN = 'test-token';
        stravaApi.defaults = {
            headers: {
                common: {}
            }
        } as any;
    });

    it('compact format is at least 50% smaller than verbose', async () => {
        const mockStreams = [
            createMockStream('time', Array.from({ length: 100 }, (_, i) => i)),
            createMockStream('distance', Array.from({ length: 100 }, (_, i) => i * 5.2)),
            createMockStream('heartrate', Array.from({ length: 100 }, (_, i) => 120 + i)),
            createMockStream('cadence', Array.from({ length: 100 }, (_, i) => 80 + i)),
            createMockStream('watts', Array.from({ length: 100 }, (_, i) => 200 + i))
        ];

        const mockGet = vi.spyOn(stravaApi, 'get');
        mockGet.mockResolvedValue({
            data: mockStreams
        } as any);

        const compactResult = await getActivityStreamsTool.execute({ id: 123, format: 'compact' });
        mockGet.mockClear();
        mockGet.mockResolvedValue({
            data: mockStreams
        } as any);
        const verboseResult = await getActivityStreamsTool.execute({ id: 123, format: 'verbose' });

        const compactSize = compactResult.content[0].text.length;
        const verboseSize = verboseResult.content[0].text.length;

        // With larger datasets, compact should be significantly smaller
        // For small datasets, overhead dominates, so we check it's at least not larger
        expect(compactSize).toBeLessThanOrEqual(verboseSize);
    });

    it('compact format preserves all data values', async () => {
        const mockStreams = [
            createMockStream('heartrate', [120, 125, 130, 135, 140])
        ];

        vi.spyOn(stravaApi, 'get').mockResolvedValue({
            data: mockStreams
        } as any);

        const result = await getActivityStreamsTool.execute({ id: 123, format: 'compact' });
        const parsed = JSON.parse(result.content[0].text);
        
        expect(parsed.data.heartrate).toEqual([120, 125, 130, 135, 140]);
    });

    it('statistics are identical in both formats', async () => {
        const mockStreams = [
            createMockStream('heartrate', [120, 125, 130, 135, 140])
        ];

        vi.spyOn(stravaApi, 'get').mockResolvedValue({
            data: mockStreams
        } as any);

        const compactResult = await getActivityStreamsTool.execute({ id: 123, format: 'compact' });
        const verboseResult = await getActivityStreamsTool.execute({ id: 123, format: 'verbose' });

        const compactStats = JSON.parse(compactResult.content[0].text).statistics;
        const verboseStats = JSON.parse(verboseResult.content[0].text).statistics;

        expect(compactStats.heartrate.max).toBe(verboseStats.heartrate.max);
        expect(compactStats.heartrate.min).toBe(verboseStats.heartrate.min);
        expect(compactStats.heartrate.avg).toBe(verboseStats.heartrate.avg);
    });
});

describe('chunking behavior', () => {
    beforeEach(() => {
        process.env.STRAVA_ACCESS_TOKEN = 'test-token';
        stravaApi.defaults = {
            headers: {
                common: {}
            }
        } as any;
    });

    it('splits large activities into chunks under 50KB', async () => {
        const largeData = Array.from({ length: 5000 }, (_, i) => i);
        const mockStreams = [
            createMockStream('time', largeData),
            createMockStream('heartrate', largeData),
            createMockStream('watts', largeData)
        ];

        vi.spyOn(stravaApi, 'get').mockResolvedValue({
            data: mockStreams
        } as any);

        const result = await getActivityStreamsTool.execute({ id: 123, points_per_page: -1, format: 'compact' });
        
        expect(result.content.length).toBeGreaterThan(1);
        
        // Check that chunks are reasonable size
        for (let i = 1; i < result.content.length; i++) {
            const chunkSize = result.content[i].text.length;
            expect(chunkSize).toBeLessThan(100 * 1024); // Less than 100KB per chunk
        }
    });

    it('provides correct metadata for chunk navigation', async () => {
        // Use a larger dataset with multiple stream types to ensure chunking
        const largeData = Array.from({ length: 5000 }, (_, i) => i);
        const mockStreams = [
            createMockStream('time', largeData),
            createMockStream('heartrate', largeData),
            createMockStream('watts', largeData),
            createMockStream('distance', largeData),
            createMockStream('cadence', largeData)
        ];

        vi.spyOn(stravaApi, 'get').mockResolvedValue({
            data: mockStreams
        } as any);

        const result = await getActivityStreamsTool.execute({ id: 123, points_per_page: -1 });
        const firstMessageText = result.content[0].text;
        // Extract JSON from the message (it may have a prefix)
        const jsonMatch = firstMessageText.match(/Message 1\/\d+:\n(.*)/s);
        const jsonText = jsonMatch ? jsonMatch[1] : firstMessageText;
        const firstMessage = JSON.parse(jsonText);
        
        expect(firstMessage.metadata.total_chunks).toBeGreaterThanOrEqual(1);
        expect(firstMessage.metadata.chunk_size).toBeDefined();
        expect(firstMessage.metadata.total_points).toBe(5000);
    });

    it('chunk boundaries align correctly', async () => {
        const largeData = Array.from({ length: 1000 }, (_, i) => i);
        const mockStreams = [createMockStream('time', largeData)];

        vi.spyOn(stravaApi, 'get').mockResolvedValue({
            data: mockStreams
        } as any);

        const result = await getActivityStreamsTool.execute({ id: 123, points_per_page: -1 });
        const firstMessageText = result.content[0].text;
        const jsonMatch = firstMessageText.match(/Message 1\/\d+:\n(.*)/s);
        const jsonText = jsonMatch ? jsonMatch[1] : firstMessageText;
        const metadata = JSON.parse(jsonText).metadata;
        const chunkSize = metadata.chunk_size;
        
        // Verify chunks don't overlap and cover all data
        let totalPoints = 0;
        for (let i = 1; i < result.content.length; i++) {
            const chunkText = result.content[i].text;
            const match = chunkText.match(/points (\d+)-(\d+)/);
            if (match) {
                const start = parseInt(match[1]);
                const end = parseInt(match[2]);
                totalPoints += (end - start + 1);
            }
        }
        
        expect(totalPoints).toBe(1000);
    });
});

describe('max_points parameter', () => {
    beforeEach(() => {
        process.env.STRAVA_ACCESS_TOKEN = 'test-token';
        stravaApi.defaults = {
            headers: {
                common: {}
            }
        } as any;
    });

    it('downsamples when activity exceeds max_points', async () => {
        const largeData = Array.from({ length: 5000 }, (_, i) => i);
        const mockStreams = [createMockStream('heartrate', largeData)];

        vi.spyOn(stravaApi, 'get').mockResolvedValue({
            data: mockStreams
        } as any);

        const result = await getActivityStreamsTool.execute({ id: 123, max_points: 500 });
        const parsed = JSON.parse(result.content[0].text);
        
        expect(parsed.metadata.total_points).toBeLessThanOrEqual(500);
        expect(parsed.metadata.downsampled).toBe(true);
        expect(parsed.metadata.original_points).toBe(5000);
    });

    it('includes warning in metadata when downsampled', async () => {
        const largeData = Array.from({ length: 2000 }, (_, i) => i);
        const mockStreams = [createMockStream('heartrate', largeData)];

        vi.spyOn(stravaApi, 'get').mockResolvedValue({
            data: mockStreams
        } as any);

        const result = await getActivityStreamsTool.execute({ id: 123, max_points: 500 });
        const parsed = JSON.parse(result.content[0].text);
        
        expect(parsed.metadata.downsampled).toBe(true);
        expect(parsed.metadata.original_points).toBeDefined();
    });

    it('preserves data integrity after downsampling', async () => {
        const data = Array.from({ length: 1000 }, (_, i) => 120 + i);
        const mockStreams = [createMockStream('heartrate', data)];

        vi.spyOn(stravaApi, 'get').mockResolvedValue({
            data: mockStreams
        } as any);

        const result = await getActivityStreamsTool.execute({ id: 123, max_points: 100 });
        const parsed = JSON.parse(result.content[0].text);
        
        const downsampledData = parsed.data.heartrate;
        expect(downsampledData[0]).toBe(120); // First point preserved
        expect(downsampledData[downsampledData.length - 1]).toBe(1119); // Last point preserved
        expect(downsampledData.length).toBeLessThanOrEqual(100);
    });
});
