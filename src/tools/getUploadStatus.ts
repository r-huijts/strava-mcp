import { z } from "zod";
import { getUploadStatus } from "../stravaClient.js";

const GetUploadStatusInputSchema = z.object({
    uploadId: z.number().int().positive().describe("The unique identifier of the activity upload."),
});

type GetUploadStatusInput = z.infer<typeof GetUploadStatusInputSchema>;

export const getUploadStatusTool = {
    name: "get-upload-status",
    description: "Checks the processing status of a previously uploaded workout file.",
    inputSchema: GetUploadStatusInputSchema,
    execute: async (args: GetUploadStatusInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;
        if (!token) {
            return {
                content: [{ type: "text" as const, text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing." }],
                isError: true,
            };
        }

        try {
            console.error(`Fetching status for upload ID ${args.uploadId}...`);
            const status = await getUploadStatus(token, args.uploadId);

            const details = [
                `🚀 **Upload Status for ID ${status.id}**`,
                `- Status: ${status.status}`,
                `- Activity ID: ${status.activity_id || "Processing/Not yet created"}`,
                `- Error: ${status.error || "None"}`
            ].join("\n");

            return {
                content: [{ type: "text" as const, text: details }]
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            console.error("Error fetching upload status:", errorMessage);
            return {
                content: [{ type: "text" as const, text: `❌ API Error: ${errorMessage}` }],
                isError: true,
            };
        }
    }
};
