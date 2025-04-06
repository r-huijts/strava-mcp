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

        const exportPath = process.env.ROUTE_EXPORT_PATH;
        if (!exportPath) {
            // Strict return structure
            return {
                content: [{ type: "text" as const, text: "❌ Error: Missing ROUTE_EXPORT_PATH in .env file. Please configure the directory for saving exports." }],
                isError: true
            };
        }

        // Validate the export path
        try {
            const stats = fs.statSync(exportPath);
            if (!stats.isDirectory()) {
                // Strict return structure
                return {
                    content: [{ type: "text" as const, text: `❌ Error: ROUTE_EXPORT_PATH (${exportPath}) is not a valid directory.` }],
                    isError: true
                };
            }
            fs.accessSync(exportPath, fs.constants.W_OK);
        } catch (err: any) {
            if (err.code === 'ENOENT') {
                // Strict return structure
                return {
                    content: [{ type: "text" as const, text: `❌ Error: ROUTE_EXPORT_PATH directory (${exportPath}) does not exist.` }],
                    isError: true
                };
            }
             if (err.code === 'EACCES') {
                 // Strict return structure
                return {
                    content: [{ type: "text" as const, text: `❌ Error: No write permission for ROUTE_EXPORT_PATH directory (${exportPath}).` }],
                    isError: true
                };
            }
            // Strict return structure
            return {
                content: [{ type: "text" as const, text: `❌ Error accessing ROUTE_EXPORT_PATH (${exportPath}): ${err.message}` }],
                isError: true
            };
        }

        try {
            const gpxData = await fetchGpxData(token, routeId);
            const filename = `route-${routeId}.gpx`;
            const fullPath = path.join(exportPath, filename);
            fs.writeFileSync(fullPath, gpxData);

            // Strict return structure
            return {
                content: [{ type: "text" as const, text: `✅ Route ${routeId} exported successfully as GPX to: ${fullPath}` }],
            };

        } catch (err: any) {
            console.error(`Error in export-route-gpx tool for route ${routeId}:`, err);
            // Strict return structure
            return {
                content: [{ type: "text" as const, text: `❌ Error exporting route ${routeId} as GPX: ${err.message}` }],
                isError: true
            };
        }
    },
}; 