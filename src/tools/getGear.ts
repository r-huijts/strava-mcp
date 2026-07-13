import { z } from "zod";
import { getGearById } from "../stravaClient.js";

const GetGearInputSchema = z.object({
    gearId: z.string().describe("The unique identifier of the gear (bike/shoes)."),
});

type GetGearInput = z.infer<typeof GetGearInputSchema>;

export const getGearTool = {
    name: "get-gear",
    description: "Fetches details of a specific equipment (shoes or bike) by gear ID.",
    inputSchema: GetGearInputSchema,
    execute: async (args: GetGearInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;
        if (!token) {
            return {
                content: [{ type: "text" as const, text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing." }],
                isError: true,
            };
        }

        try {
            console.error(`Fetching gear details for ${args.gearId}...`);
            const gear = await getGearById(token, args.gearId);

            const distanceKm = gear.converted_distance ? gear.converted_distance.toFixed(2) : ((gear.distance ?? 0) / 1000).toFixed(2);
            
            const details = [
                `⚙️ **Gear Details for ${gear.name}** (ID: ${gear.id})`,
                `- Type: ${gear.brand_name || "N/A"} ${gear.model_name || ""}`,
                `- Distance: ${distanceKm} km`,
                `- Primary: ${gear.primary ? "Yes" : "No"}`,
                `- Description: ${gear.description || "N/A"}`
            ].join("\n");

            return {
                content: [{ type: "text" as const, text: details }]
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            console.error("Error fetching gear details:", errorMessage);
            return {
                content: [{ type: "text" as const, text: `❌ API Error: ${errorMessage}` }],
                isError: true,
            };
        }
    }
};
