import { z } from "zod";
import { getAthleteZones as fetchAthleteZones, StravaAthleteZones } from "../stravaClient.js";
import { formatDuration } from "../server.js"; // Shared helper

const name = "get-athlete-zones";
const description = "Retrieves the authenticated athlete's configured heart rate and power zones.";

// No input schema needed for this tool
const inputSchema = z.object({}); 

type GetAthleteZonesInput = z.infer<typeof inputSchema>;

// Helper to format a single zone range
function formatZoneRange(zone: { min: number; max?: number }): string {
    return zone.max ? `${zone.min} - ${zone.max}` : `${zone.min}+`;
}

// Helper to format distribution buckets
function formatDistribution(buckets: { max: number; min: number; time: number }[] | undefined): string {
    if (!buckets || buckets.length === 0) return "  Distribution data not available.";
    
    return buckets.map(bucket => 
        `  - ${bucket.min}-${bucket.max === -1 ? '∞' : bucket.max}: ${formatDuration(bucket.time)}`
    ).join('\n');
}

// Format the zones response
function formatAthleteZones(zonesData: StravaAthleteZones): string {
    let responseText = "**Athlete Zones:**\n";

    if (zonesData.heart_rate) {
        responseText += "\n❤️ **Heart Rate Zones**\n";
        responseText += `   Custom Zones: ${zonesData.heart_rate.custom_zones ? 'Yes' : 'No'}\n`;
        zonesData.heart_rate.zones.forEach((zone, index) => {
            responseText += `   Zone ${index + 1}: ${formatZoneRange(zone)} bpm\n`;
        });
        if (zonesData.heart_rate.distribution_buckets) {
             responseText += "   Time Distribution:\n" + formatDistribution(zonesData.heart_rate.distribution_buckets) + "\n";
        }
    } else {
        responseText += "\n❤️ Heart Rate Zones: Not configured\n";
    }

    if (zonesData.power) {
        responseText += "\n⚡ **Power Zones**\n";
        zonesData.power.zones.forEach((zone, index) => {
            responseText += `   Zone ${index + 1}: ${formatZoneRange(zone)} W\n`;
        });
         if (zonesData.power.distribution_buckets) {
             responseText += "   Time Distribution:\n" + formatDistribution(zonesData.power.distribution_buckets) + "\n";
        }
    } else {
        responseText += "\n⚡ Power Zones: Not configured\n";
    }

    return responseText;
}

export const getAthleteZonesTool = {
    name,
    description: description + "\n\nOutput includes both a formatted summary and the raw JSON data.",
    inputSchema,
    execute: async (_input: GetAthleteZonesInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;

        if (!token) {
            console.error("Missing STRAVA_ACCESS_TOKEN environment variable.");
            return {
                content: [{ type: "text" as const, text: "Configuration error: Missing Strava access token." }],
                isError: true
            };
        }

        try {
            console.error("Fetching athlete zones...");
            const zonesData = await fetchAthleteZones(token);
            
            // Format the summary
            const formattedText = formatAthleteZones(zonesData);
            
            // Prepare the raw data
            const rawDataText = `\n\nRaw Athlete Zone Data:\n${JSON.stringify(zonesData, null, 2)}`;
            
            console.error("Successfully fetched athlete zones.");
            // Return both summary and raw data
            return { 
                content: [
                    { type: "text" as const, text: formattedText },
                    { type: "text" as const, text: rawDataText }
                ]
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Error fetching athlete zones: ${errorMessage}`);
            
            let userFriendlyMessage;
            // Check for common errors like missing scope (403 Forbidden)
            if (errorMessage.includes("403")) {
                 userFriendlyMessage = "🔒 Access denied. This tool requires 'profile:read_all' permission. Please re-authorize with the correct scope.";
            } else if (errorMessage.startsWith("SUBSCRIPTION_REQUIRED:")) { // In case Strava changes this later
                userFriendlyMessage = `🔒 Accessing zones might require a Strava subscription. Details: ${errorMessage}`;
            } else {
                userFriendlyMessage = `An unexpected error occurred while fetching athlete zones. Details: ${errorMessage}`;
            }

            return {
                content: [{ type: "text" as const, text: `❌ ${userFriendlyMessage}` }],
                isError: true
            };
        }
    }
}; 