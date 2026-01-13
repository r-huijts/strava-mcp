import { describe, expect, it, beforeAll } from "vitest";
import { getActivityStreamsTool } from "../src/tools/getActivityStreams.js";
import { loadConfig } from "../src/config.js";
import { getRecentActivities } from "../src/stravaClient.js";

/**
 * Integration tests against the actual Strava API.
 * 
 * These tests require valid Strava API credentials:
 * - Credentials are loaded from ~/.config/strava-mcp/config.json (after connecting)
 * - Or STRAVA_ACCESS_TOKEN environment variable
 * - The token must have access to at least one activity
 * 
 * To run these tests:
 *   1. Connect your Strava account (credentials saved to ~/.config/strava-mcp/config.json)
 *   2. Run: RUN_API_TESTS=true npm test -- tests/getActivityStreams.api.test.ts
 * 
 * These tests are skipped by default unless RUN_API_TESTS=true is set
 * to avoid accidental API calls during regular test runs.
 */
describe('get-activity-streams API Integration', () => {
    const RUN_API_TESTS = process.env.RUN_API_TESTS === 'true';
    
    // Load token from config file or environment
    let accessToken: string | undefined;
    let testActivityId: number | null = null;
    
    beforeAll(async () => {
        // Try to load from config file first (where connect-strava saves it)
        try {
            const config = await loadConfig();
            accessToken = config.accessToken || process.env.STRAVA_ACCESS_TOKEN;
            if (accessToken) {
                process.env.STRAVA_ACCESS_TOKEN = accessToken;
                console.log(`✓ Loaded token from config: ${accessToken.substring(0, 5)}...${accessToken.slice(-5)}`);
            }
        } catch (error) {
            accessToken = process.env.STRAVA_ACCESS_TOKEN;
        }
        
        if (!RUN_API_TESTS) {
            console.log('Skipping API tests. Set RUN_API_TESTS=true to enable.');
            return;
        }
        
        if (!accessToken) {
            console.log('Skipping API tests. No access token found in ~/.config/strava-mcp/config.json or environment.');
            return;
        }
        
        // Try to get an activity ID from environment or fetch from API
        const envActivityId = process.env.TEST_ACTIVITY_ID;
        if (envActivityId) {
            testActivityId = parseInt(envActivityId, 10);
            console.log(`Using activity ID from TEST_ACTIVITY_ID: ${testActivityId}`);
        } else {
            // Try to fetch a recent activity
            try {
                const activities = await getRecentActivities(accessToken, 1);
                if (activities && activities.length > 0) {
                    testActivityId = activities[0].id;
                    console.log(`✓ Fetched activity ID from API: ${testActivityId} (${activities[0].name})`);
                }
            } catch (error: any) {
                console.log(`Could not fetch activity ID: ${error.message}`);
            }
        }
    });
    
    const getTestActivityId = (): number | null => testActivityId;

    it('should fetch real activity streams in compact format', async () => {
        if (!RUN_API_TESTS || !accessToken) {
            console.log('Skipping: RUN_API_TESTS not set or no access token');
            return;
        }
        
        const activityId = getTestActivityId();
        if (!activityId) {
            console.log('Skipping: No activity ID available. Set TEST_ACTIVITY_ID=<your-activity-id> to test.');
            return;
        }

        const result = await getActivityStreamsTool.execute({
            id: activityId,
            format: 'compact',
            types: ['time', 'distance', 'heartrate']
        });

        expect(result.isError).toBeFalsy();
        expect(result.content).toHaveLength(1);
        
        const parsed = JSON.parse(result.content[0].text);
        
        // Verify structure
        expect(parsed.metadata).toBeDefined();
        expect(parsed.metadata.format).toBe('compact');
        expect(parsed.metadata.total_points).toBeGreaterThan(0);
        expect(parsed.statistics).toBeDefined();
        expect(parsed.data).toBeDefined();
        
        // Verify compact format
        expect(Array.isArray(parsed.data.time)).toBe(true);
        expect(Array.isArray(parsed.data.distance)).toBe(true);
        
        // Verify data integrity
        // Note: With default pagination (100 points per page), data length may be less than total_points
        expect(parsed.data.time.length).toBeLessThanOrEqual(parsed.metadata.total_points);
        expect(parsed.data.time.length).toBeGreaterThan(0);
        expect(parsed.data.time[0]).toBeGreaterThanOrEqual(0);
        
        // If we got all data (points_per_page = -1 or total_points <= points_per_page), lengths should match
        if (parsed.metadata.total_points <= (parsed.metadata.points_per_page || 100)) {
            expect(parsed.data.time.length).toBe(parsed.metadata.total_points);
        }
        
        console.log(`✓ Fetched ${parsed.metadata.total_points} points for activity ${activityId}`);
    }, 30000); // 30 second timeout for API calls

    it('should fetch real activity streams in verbose format', async () => {
        if (!RUN_API_TESTS || !accessToken) return;
        
        const activityId = getTestActivityId();
        if (!activityId) {
            console.log('Skipping: No activity ID available.');
            return;
        }

        const result = await getActivityStreamsTool.execute({
            id: activityId,
            format: 'verbose',
            types: ['time', 'distance']
        });

        expect(result.isError).toBeFalsy();
        const parsed = JSON.parse(result.content[0].text);
        
        expect(parsed.metadata.format).toBe('verbose');
        expect(parsed.data.time[0]).toHaveProperty('seconds_from_start');
        expect(parsed.data.time[0]).toHaveProperty('formatted');
        expect(parsed.data.distance[0]).toHaveProperty('meters');
        expect(parsed.data.distance[0]).toHaveProperty('kilometers');
        
        console.log(`✓ Fetched verbose format for activity ${activityId}`);
    }, 30000);

    it('should handle downsampling with real data', async () => {
        if (!RUN_API_TESTS || !accessToken) return;
        
        const activityId = getTestActivityId();
        if (!activityId) {
            console.log('Skipping: No activity ID available.');
            return;
        }

        // First get full data
        const fullResult = await getActivityStreamsTool.execute({
            id: activityId,
            format: 'compact'
        });
        
        const fullParsed = JSON.parse(fullResult.content[0].text);
        const originalPoints = fullParsed.metadata.total_points;
        
        if (originalPoints < 1000) {
            console.log(`Skipping downsampling test: activity only has ${originalPoints} points`);
            return;
        }

        // Then get downsampled
        const downsampledResult = await getActivityStreamsTool.execute({
            id: activityId,
            format: 'compact',
            max_points: 500
        });

        const downsampledParsed = JSON.parse(downsampledResult.content[0].text);
        
        expect(downsampledParsed.metadata.downsampled).toBe(true);
        expect(downsampledParsed.metadata.original_points).toBe(originalPoints);
        expect(downsampledParsed.metadata.total_points).toBeLessThanOrEqual(500);
        expect(downsampledParsed.metadata.total_points).toBeLessThan(originalPoints);
        
        // Verify first point preserved
        expect(downsampledParsed.data.time[0]).toBe(fullParsed.data.time[0]);
        
        console.log(`✓ Downsampled from ${originalPoints} to ${downsampledParsed.metadata.total_points} points`);
    }, 60000); // Longer timeout for multiple API calls

    it('should handle chunking for large activities', async () => {
        if (!RUN_API_TESTS || !accessToken) return;
        
        const activityId = getTestActivityId();
        if (!activityId) {
            console.log('Skipping: No activity ID available.');
            return;
        }

        const result = await getActivityStreamsTool.execute({
            id: activityId,
            format: 'compact',
            points_per_page: -1 // Request all data
        });

        expect(result.isError).toBeFalsy();
        
        // For large activities, should have multiple chunks
        if (result.content.length > 1) {
            const firstMessageText = result.content[0].text;
            const jsonMatch = firstMessageText.match(/Message 1\/\d+:\n(.*)/s);
            const metadata = JSON.parse(jsonMatch ? jsonMatch[1] : firstMessageText);
            
            expect(metadata.metadata.total_chunks).toBeGreaterThan(1);
            expect(metadata.metadata.chunk_size).toBeDefined();
            
            console.log(`✓ Chunked activity into ${metadata.metadata.total_chunks} chunks`);
        } else {
            console.log('Activity was small enough to fit in single response');
        }
    }, 60000);

    it('should compare compact vs verbose sizes with real data', async () => {
        if (!RUN_API_TESTS || !accessToken) return;
        
        const activityId = getTestActivityId();
        if (!activityId) {
            console.log('Skipping: No activity ID available.');
            return;
        }

        const compactResult = await getActivityStreamsTool.execute({
            id: activityId,
            format: 'compact'
        });
        
        const verboseResult = await getActivityStreamsTool.execute({
            id: activityId,
            format: 'verbose'
        });

        const compactSize = compactResult.content[0].text.length;
        const verboseSize = verboseResult.content[0].text.length;
        
        const compactParsed = JSON.parse(compactResult.content[0].text);
        const verboseParsed = JSON.parse(verboseResult.content[0].text);
        
        // Both should have same data points
        expect(compactParsed.metadata.total_points).toBe(verboseParsed.metadata.total_points);
        
        // Compact should be smaller
        expect(compactSize).toBeLessThan(verboseSize);
        
        const reductionPercent = ((1 - compactSize / verboseSize) * 100).toFixed(1);
        console.log(`✓ Compact format is ${reductionPercent}% smaller (${compactSize} vs ${verboseSize} bytes)`);
    }, 60000);
});
