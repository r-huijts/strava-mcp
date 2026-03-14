import { getAuthenticatedAthlete } from "../stravaClient.js";

export const getAthleteShoesTool = {
    name: "get-athlete-shoes",
    description: "Fetches the authenticated athlete's shoes from Strava, including usage distance and primary flag.",
    inputSchema: undefined,
    execute: async () => {
        const token = process.env.STRAVA_ACCESS_TOKEN;

        if (!token || token === 'YOUR_STRAVA_ACCESS_TOKEN_HERE') {
            console.error("Missing or placeholder STRAVA_ACCESS_TOKEN in .env");
            return {
                content: [{ type: "text" as const, text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing or not set in the .env file." }],
                isError: true,
            };
        }

        try {
            console.error("Fetching athlete shoes...");
            const athlete = await getAuthenticatedAthlete(token);
            const shoes = athlete.shoes ?? [];

            if (shoes.length === 0) {
                return {
                    content: [{ type: "text" as const, text: "No shoes found in your Strava profile." }],
                };
            }

            const lines = shoes.map((shoe, index) => {
                const distanceKm = typeof shoe.distance === "number" ? (shoe.distance / 1000).toFixed(2) : "N/A";
                return `${index + 1}. ${shoe.name} (ID: ${shoe.id})\n   - Distance: ${distanceKm} km\n   - Primary: ${shoe.primary ? "Yes" : "No"}`;
            });

            return {
                content: [{
                    type: "text" as const,
                    text: `👟 **Your Strava Shoes** (Total: ${shoes.length})\n\n${lines.join("\n\n")}`,
                }],
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            console.error("Error in get-athlete-shoes tool:", errorMessage);
            return {
                content: [{ type: "text" as const, text: `❌ API Error: ${errorMessage}` }],
                isError: true,
            };
        }
    }
};
