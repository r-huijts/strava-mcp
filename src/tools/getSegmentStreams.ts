import { z } from "zod";
import { getSegmentStreams } from "../stravaClient.js";

const GetSegmentStreamsInputSchema = z.object({
    segmentId: z.number().int().positive().describe("The unique identifier of the segment."),
    keys: z.array(z.string()).describe("The stream types to return (e.g. 'latlng', 'distance', 'altitude').")
});

type GetSegmentStreamsInput = z.infer<typeof GetSegmentStreamsInputSchema>;

export const getSegmentStreamsTool = {
    name: "get-segment-streams",
    description: "Fetches specific telemetry streams for a segment.",
    inputSchema: GetSegmentStreamsInputSchema,
    execute: async (args: GetSegmentStreamsInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;
        if (!token) {
            return {
                content: [{ type: "text" as const, text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing." }],
                isError: true,
            };
        }

        try {
            console.error(`Fetching streams for segment ${args.segmentId}...`);
            const streams = await getSegmentStreams(token, args.segmentId, args.keys);

            if (streams.length === 0) {
                return {
                    content: [{ type: "text" as const, text: "No stream data found for this segment." }]
                };
            }

            const summary = streams.map(s => {
                return `- **Stream Type: ${s.type}** (${s.data.length} data points, Resolution: ${s.resolution})`;
            }).join("\n");

            const rawText = `\n\nRaw Streams JSON:\n${JSON.stringify(streams, null, 2)}`;

            return {
                content: [
                    { type: "text" as const, text: `⛰️ **Segment Streams Summary for Segment ${args.segmentId}**\n\n${summary}` },
                    { type: "text" as const, text: rawText }
                ]
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            console.error("Error fetching segment streams:", errorMessage);
            return {
                content: [{ type: "text" as const, text: `❌ API Error: ${errorMessage}` }],
                isError: true,
            };
        }
    }
};
