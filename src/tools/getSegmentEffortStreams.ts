import { z } from "zod";
import { getSegmentEffortStreams } from "../stravaClient.js";

const GetSegmentEffortStreamsInputSchema = z.object({
    effortId: z.number().int().positive().describe("The unique identifier of the segment effort."),
    keys: z.array(z.string()).describe("The stream types to return (e.g. 'latlng', 'distance', 'altitude', 'time', 'heartrate', 'cadence', 'watts', 'temp', 'moving', 'grade_smooth').")
});

type GetSegmentEffortStreamsInput = z.infer<typeof GetSegmentEffortStreamsInputSchema>;

export const getSegmentEffortStreamsTool = {
    name: "get-segment-effort-streams",
    description: "Fetches specific telemetry streams for a segment effort.",
    inputSchema: GetSegmentEffortStreamsInputSchema,
    execute: async (args: GetSegmentEffortStreamsInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;
        if (!token) {
            return {
                content: [{ type: "text" as const, text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing." }],
                isError: true,
            };
        }

        try {
            console.error(`Fetching streams for effort ${args.effortId}...`);
            const streams = await getSegmentEffortStreams(token, args.effortId, args.keys);

            if (streams.length === 0) {
                return {
                    content: [{ type: "text" as const, text: "No stream data found for this segment effort." }]
                };
            }

            const summary = streams.map(s => {
                return `- **Stream Type: ${s.type}** (${s.data.length} data points, Resolution: ${s.resolution})`;
            }).join("\n");

            const rawText = `\n\nRaw Streams JSON:\n${JSON.stringify(streams, null, 2)}`;

            return {
                content: [
                    { type: "text" as const, text: `⏱️ **Segment Effort Streams Summary for Effort ${args.effortId}**\n\n${summary}` },
                    { type: "text" as const, text: rawText }
                ]
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            console.error("Error fetching segment effort streams:", errorMessage);
            return {
                content: [{ type: "text" as const, text: `❌ API Error: ${errorMessage}` }],
                isError: true,
            };
        }
    }
};
