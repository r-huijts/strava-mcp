import { z } from "zod";
import { getRouteStreams } from "../stravaClient.js";

const GetRouteStreamsInputSchema = z.object({
    routeId: z.number().int().positive().describe("The unique identifier of the route."),
});

type GetRouteStreamsInput = z.infer<typeof GetRouteStreamsInputSchema>;

export const getRouteStreamsTool = {
    name: "get-route-streams",
    description: "Fetches telemetry streams (coordinates, elevations, distances) for a specific route.",
    inputSchema: GetRouteStreamsInputSchema,
    execute: async (args: GetRouteStreamsInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;
        if (!token) {
            return {
                content: [{ type: "text" as const, text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing." }],
                isError: true,
            };
        }

        try {
            console.error(`Fetching streams for route ${args.routeId}...`);
            const streams = await getRouteStreams(token, args.routeId);

            if (streams.length === 0) {
                return {
                    content: [{ type: "text" as const, text: "No stream data found for this route." }]
                };
            }

            const summary = streams.map(s => {
                return `- **Stream Type: ${s.type}** (${s.data.length} data points, Original Size: ${s.original_size}, Resolution: ${s.resolution})`;
            }).join("\n");

            const rawText = `\n\nRaw Streams JSON:\n${JSON.stringify(streams, null, 2)}`;

            return {
                content: [
                    { type: "text" as const, text: `🗺️ **Route Streams Summary for Route ${args.routeId}**\n\n${summary}` },
                    { type: "text" as const, text: rawText }
                ]
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            console.error("Error fetching route streams:", errorMessage);
            return {
                content: [{ type: "text" as const, text: `❌ API Error: ${errorMessage}` }],
                isError: true,
            };
        }
    }
};
