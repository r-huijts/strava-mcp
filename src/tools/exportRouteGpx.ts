import { z } from "zod";
import * as fs from 'node:fs';
import * as path from 'node:path';
import { exportRouteGpx as fetchGpxData } from "../stravaClient.js";
// import { McpServerTool } from "@modelcontextprotocol/sdk/server/mcp.js"; // Type doesn't seem exported/needed
// import { McpResponse } from "@modelcontextprotocol/sdk/server/mcp.js"; // Type doesn't seem exported

// Define the input schema for the tool
const ExportRouteGpxInputSchema = z.object({
    routeId: z.number().int().positive().describe("The ID of the Strava route to export."),
});

// Infer the input type from the schema
type ExportRouteGpxInput = z.infer<typeof ExportRouteGpxInputSchema>;

// Export the tool definition directly
export const exportRouteGpx = {
    name: "export-route-gpx",
    description: "Exports a specific Strava route in GPX format and saves it to a pre-configured local directory.",
    inputSchema: ExportRouteGpxInputSchema,
    execute: async ({ routeId }: ExportRouteGpxInput) => {
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

            const gpxData = await fetchGpxData(token, routeId);
            const filename = `route-${routeId}.gpx`;
            const fullPath = path.join(exportDir, filename);
            fs.writeFileSync(fullPath, gpxData);

            // Strict return structure
            return {
                content: [{ type: "text" as const, text: `✅ Route ${routeId} exported successfully as GPX to: ${fullPath}` }],
            };

        } catch (err: any) {
            console.error(`Error in export-route-gpx tool for route ${routeId}:`, err);
            // Strict return structure
            let userMessage = `❌ Error exporting route ${routeId} as GPX: ${err.message}`;
            if (err.code === 'EACCES') {
                userMessage = `❌ Error: No write permission for ROUTE_EXPORT_PATH directory (${exportDir}).`;
            }
            return {
                content: [{ type: "text" as const, text: userMessage }],
                isError: true
            };
        }
    },
}; 