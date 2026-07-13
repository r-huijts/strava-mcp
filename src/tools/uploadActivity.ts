import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import { createUpload } from "../stravaClient.js";

const UploadActivityInputSchema = z.object({
    filePath: z.string().optional().describe("Local path to the workout file (.fit, .gpx, or .tcx) to upload."),
    fileBase64: z.string().optional().describe("Base64-encoded workout file content (use if not specifying filePath)."),
    dataType: z.enum(["fit", "fit.gz", "tcx", "tcx.gz", "gpx", "gpx.gz"]).optional().describe("The format of the file content (required if using fileBase64)."),
    name: z.string().optional().describe("The name of the activity."),
    description: z.string().optional().describe("The description of the activity."),
    trainer: z.enum(["0", "1"]).optional().describe("Set to '1' to mark as a trainer activity."),
    commute: z.enum(["0", "1"]).optional().describe("Set to '1' to mark as a commute."),
    externalId: z.string().optional().describe("An optional identifier for the activity upload in external systems.")
});

type UploadActivityInput = z.infer<typeof UploadActivityInputSchema>;

export const uploadActivityTool = {
    name: "upload-activity",
    description: "Uploads a workout file (FIT, GPX, or TCX) to Strava to create an activity.",
    inputSchema: UploadActivityInputSchema,
    execute: async (args: UploadActivityInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;
        if (!token) {
            return {
                content: [{ type: "text" as const, text: "❌ Configuration Error: STRAVA_ACCESS_TOKEN is missing." }],
                isError: true,
            };
        }

        let fileData = "";
        let finalDataType: any = args.dataType;

        try {
            if (args.filePath) {
                // Read from local file
                const resolvedPath = path.resolve(args.filePath);
                if (!fs.existsSync(resolvedPath)) {
                    return {
                        content: [{ type: "text" as const, text: `❌ File Error: File not found at ${resolvedPath}` }],
                        isError: true,
                    };
                }

                const fileBuffer = fs.readFileSync(resolvedPath);
                fileData = fileBuffer.toString("base64");

                // Infer data type if not provided
                if (!finalDataType) {
                    const ext = path.extname(resolvedPath).toLowerCase();
                    if (ext === ".fit") finalDataType = "fit";
                    else if (ext === ".gpx") finalDataType = "gpx";
                    else if (ext === ".tcx") finalDataType = "tcx";
                    else if (resolvedPath.endsWith(".fit.gz")) finalDataType = "fit.gz";
                    else if (resolvedPath.endsWith(".gpx.gz")) finalDataType = "gpx.gz";
                    else if (resolvedPath.endsWith(".tcx.gz")) finalDataType = "tcx.gz";
                    else {
                        return {
                            content: [{ type: "text" as const, text: `❌ File Error: Could not determine data type from extension for ${resolvedPath}` }],
                            isError: true,
                        };
                    }
                }
            } else if (args.fileBase64 && args.dataType) {
                fileData = args.fileBase64;
            } else {
                return {
                    content: [{ type: "text" as const, text: "❌ Input Error: You must provide either a filePath or both fileBase64 and dataType." }],
                    isError: true,
                };
            }

            console.error(`Uploading activity file with type: ${finalDataType}...`);
            const upload = await createUpload(token, fileData, finalDataType, {
                name: args.name,
                description: args.description,
                trainer: args.trainer,
                commute: args.commute,
                externalId: args.externalId
            });

            return {
                content: [{
                    type: "text" as const,
                    text: `🚀 Activity file uploaded successfully!\n\n- Upload ID: ${upload.id}\n- Status: ${upload.status}\n- External ID: ${upload.external_id || "N/A"}\n\nYou can track the processing status using the get-upload-status tool with this Upload ID.`
                }]
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            console.error("Error uploading activity file:", errorMessage);
            return {
                content: [{ type: "text" as const, text: `❌ API Error: ${errorMessage}` }],
                isError: true,
            };
        }
    }
};
