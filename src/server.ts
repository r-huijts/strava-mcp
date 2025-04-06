import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as dotenv from "dotenv";

// --- Import individual tools ---
import { getRecentActivities } from "./tools/getRecentActivities.js";
import { getAthleteProfile } from "./tools/getAthleteProfile.js";
import { getAthleteStats } from "./tools/getAthleteStats.js";
import { getActivityDetails } from "./tools/getActivityDetails.js";
import { listAthleteClubs } from "./tools/listAthleteClubs.js";
import { listStarredSegments } from "./tools/listStarredSegments.js";
import { getSegment } from "./tools/getSegment.js";
import { exploreSegments } from "./tools/exploreSegments.js";
import { starSegment } from "./tools/starSegment.js";
import { getSegmentEffort } from './tools/getSegmentEffort.js';
import { listSegmentEfforts } from './tools/listSegmentEfforts.js';
import { listAthleteRoutes } from './tools/listAthleteRoutes.js';
import { getRoute } from './tools/getRoute.js';
import { exportRouteGpx } from './tools/exportRouteGpx.js';
import { exportRouteTcx } from './tools/exportRouteTcx.js';

// Load environment variables from .env file
dotenv.config();

const server = new McpServer({
  name: "Strava MCP Server",
  version: "1.0.0",
});

// --- Register Tools ---
// Correct argument order: name, description, inputSchema.shape | {}, execute
server.tool(getRecentActivities.name, getRecentActivities.description, getRecentActivities.inputSchema.shape, getRecentActivities.execute);
server.tool(getAthleteProfile.name, getAthleteProfile.description, {}, getAthleteProfile.execute);
server.tool(getAthleteStats.name, getAthleteStats.description, {}, getAthleteStats.execute);
server.tool(getActivityDetails.name, getActivityDetails.description, getActivityDetails.inputSchema.shape, getActivityDetails.execute);
server.tool(listAthleteClubs.name, listAthleteClubs.description, {}, listAthleteClubs.execute);
server.tool(listStarredSegments.name, listStarredSegments.description, {}, listStarredSegments.execute);
server.tool(getSegment.name, getSegment.description, getSegment.inputSchema.shape, getSegment.execute);
server.tool(exploreSegments.name, exploreSegments.description, exploreSegments.inputSchema.shape, exploreSegments.execute);
server.tool(starSegment.name, starSegment.description, starSegment.inputSchema.shape, starSegment.execute);
server.tool(getSegmentEffort.name, getSegmentEffort.description, getSegmentEffort.inputSchema.shape, getSegmentEffort.execute);
server.tool(listSegmentEfforts.name, listSegmentEfforts.description, listSegmentEfforts.inputSchema.shape, listSegmentEfforts.execute);
server.tool(listAthleteRoutes.name, listAthleteRoutes.description, listAthleteRoutes.inputSchema.shape, listAthleteRoutes.execute);
server.tool(getRoute.name, getRoute.description, getRoute.inputSchema.shape, getRoute.execute);
server.tool(exportRouteGpx.name, exportRouteGpx.description, exportRouteGpx.inputSchema.shape, exportRouteGpx.execute);
server.tool(exportRouteTcx.name, exportRouteTcx.description, exportRouteTcx.inputSchema.shape, exportRouteTcx.execute);

// --- Helper Functions (Exported, if needed across tools) ---
// Keep helper functions minimal here or move to a utils file
// ... (keep formatDuration if potentially used elsewhere, otherwise move to its tool)

export function formatDuration(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) {
        return 'N/A';
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (hours > 0) {
        parts.push(hours.toString().padStart(2, '0'));
    }
    parts.push(minutes.toString().padStart(2, '0'));
    parts.push(secs.toString().padStart(2, '0'));

    return parts.join(':');
}

// Removed other formatters - they are now local to their respective tools.

// --- Server Startup ---
async function startServer() {
  try {
    console.error("Starting Strava MCP Server...");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`Strava MCP Server connected via Stdio. Tools registered.`);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();