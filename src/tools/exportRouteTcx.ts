import { z } from "zod";
import * as fs from 'node:fs';
import * as path from 'node:path';
import { exportRouteTcx as fetchTcxData } from "../stravaClient.js";

// Define the input schema for the tool
const ExportRouteTcxInputSchema = z.object({
    routeId: z.number().int().positive().describe("The ID of the Strava route to export."),
});

// Infer the input type from the schema
type ExportRouteTcxInput = z.infer<typeof ExportRouteTcxInputSchema>;

// Export the tool definition directly
export const exportRouteTcx = {
    name: "export-route-tcx",
    description: "Exports a specific Strava route in TCX format and saves it to a pre-configured local directory.",
    inputSchema: ExportRouteTcxInputSchema,
    execute: async ({ routeId }: ExportRouteTcxInput) => {
        const token = process.env.STRAVA_ACCESS_TOKEN;
        if (!token) {
            // Strict return structure
            return {
                content: [{ type: "text" as const, text: "❌ Error: Missing STRAVA_ACCESS_TOKEN in .env file." }],
                isError: true
            };
        }

        const exportDir = process.env.ROUTE_EXPORT_PATH;
        if (!exportDir) {
            // Strict return structure
            return {
                content: [{ type: "text" as const, text: "❌ Error: Missing ROUTE_EXPORT_PATH in .env file. Please configure the directory for saving exports." }],
                isError: true
            };
        }

        try {
             // Ensure the directory exists, create if not
            if (!fs.existsSync(exportDir)) {
                console.error(`Export directory ${exportDir} not found, creating it...`);
                fs.mkdirSync(exportDir, { recursive: true });
            } else {
                // Check if it's a directory and writable (existing logic)
                const stats = fs.statSync(exportDir);
                if (!stats.isDirectory()) {
                    // Strict return structure
                    return {
                        content: [{ type: "text" as const, text: `❌ Error: ROUTE_EXPORT_PATH (${exportDir}) is not a valid directory.` }],
                        isError: true
                    };
                }
                fs.accessSync(exportDir, fs.constants.W_OK);
            }

            const tcxData = await fetchTcxData(token, routeId);
            const filename = `route-${routeId}.tcx`;
            const fullPath = path.join(exportDir, filename);
            fs.writeFileSync(fullPath, tcxData);

            // Strict return structure
            return {
                content: [{ type: "text" as const, text: `✅ Route ${routeId} exported successfully as TCX to: ${fullPath}` }],
            };

        } catch (err: any) {
            // Handle potential errors during directory creation/check or file writing
            console.error(`Error in export-route-tcx tool for route ${routeId}:`, err);
            let userMessage = `❌ Error exporting route ${routeId} as TCX: ${err.message}`;
             if (err.code === 'EACCES') {
                 userMessage = `❌ Error: No write permission for ROUTE_EXPORT_PATH directory (${exportDir}).`;
             }
            // Strict return structure
            return {
                content: [{ type: "text" as const, text: userMessage }],
                isError: true
            };
        }
    },
}; 