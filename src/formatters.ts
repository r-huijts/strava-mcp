import { StravaRoute } from './stravaClient';

/**
 * Converts meters to kilometers, rounding to 2 decimal places.
 * @param meters - Distance in meters.
 * @returns Distance in kilometers as a string (e.g., "10.25 km").
 */
function metersToKmString(meters: number): string {
    if (meters === undefined || meters === null) return 'N/A';
    return (meters / 1000).toFixed(2) + ' km';
}

/**
 * Formats elevation gain in meters.
 * @param meters - Elevation gain in meters.
 * @returns Elevation gain as a string (e.g., "150 m").
 */
function formatElevation(meters: number | null | undefined): string {
    if (meters === undefined || meters === null) return 'N/A';
    return Math.round(meters) + ' m';
}

/**
 * Formats a Strava route object into a concise summary string using metric units.
 *
 * @param route - The StravaRoute object.
 * @returns A formatted string summarizing the route.
 */
export function formatRouteSummary(route: StravaRoute): string {
    const distanceKm = metersToKmString(route.distance);
    const elevation = formatElevation(route.elevation_gain);
    const date = new Date(route.created_at).toLocaleDateString();
    const type = route.type === 1 ? 'Ride' : route.type === 2 ? 'Run' : 'Walk'; // Assuming 3 is Walk based on typical Strava usage

    let summary = `📍 Route: ${route.name} (#${route.id})\n`;
    summary += `   - Type: ${type}, Distance: ${distanceKm}, Elevation: ${elevation}\n`;
    summary += `   - Created: ${date}, Segments: ${route.segments?.length ?? 'N/A'}\n`;
    if (route.description) {
        summary += `   - Description: ${route.description.substring(0, 100)}${route.description.length > 100 ? '...' : ''}\n`;
    }
    return summary;
}

// Add other shared formatters here as needed (e.g., formatActivity, formatSegment) 