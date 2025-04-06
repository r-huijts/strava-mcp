import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Import all tool definitions with the correct names
import { getRecentActivities } from './tools/getRecentActivities.js'; // Original name
import { getAthleteProfile } from './tools/getAthleteProfile.js'; // Original name
import { getAthleteStatsTool } from "./tools/getAthleteStats.js";
import { getActivityDetailsTool } from "./tools/getActivityDetails.js";
import { listAthleteClubs } from './tools/listAthleteClubs.js'; // Original name
import { listStarredSegments } from './tools/listStarredSegments.js'; // Original name
import { getSegmentTool } from "./tools/getSegment.js";
import { exploreSegments } from './tools/exploreSegments.js'; // Original name
import { starSegment } from './tools/starSegment.js'; // Original name
import { getSegmentEffortTool } from './tools/getSegmentEffort.js';
import { listSegmentEffortsTool } from './tools/listSegmentEfforts.js';
import { listAthleteRoutesTool } from './tools/listAthleteRoutes.js';
import { getRouteTool } from './tools/getRoute.js';
import { exportRouteGpx } from './tools/exportRouteGpx.js'; // Original name
import { exportRouteTcx } from './tools/exportRouteTcx.js'; // Original name

// --- Environment Variable Loading ---
// Load .env file explicitly from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
// REMOVE THIS DEBUG LOG - Interferes with MCP Stdio transport
// console.log(`[DEBUG] Attempting to load .env file from: ${envPath}`);
dotenv.config({ path: envPath });

const server = new McpServer({
  name: "strava-mcp",
  version: "0.1.0",
  description: "Provides access to Strava data via MCP.",
  // Add more metadata if desired
});

// Register all tools using server.tool and the correct imported objects
server.tool(
    getRecentActivities.name, // Original object
    getRecentActivities.description,
    getRecentActivities.inputSchema?.shape ?? {},
    getRecentActivities.execute
);
server.tool(
    getAthleteProfile.name,
    getAthleteProfile.description,
    {},
    getAthleteProfile.execute
);
server.tool(
    getAthleteStatsTool.name, 
    getAthleteStatsTool.description,
    getAthleteStatsTool.inputSchema?.shape ?? {},
    getAthleteStatsTool.execute
);
server.tool(
    getActivityDetailsTool.name, 
    getActivityDetailsTool.description,
    getActivityDetailsTool.inputSchema?.shape ?? {},
    getActivityDetailsTool.execute
);
server.tool(
    listAthleteClubs.name,
    listAthleteClubs.description,
    {},
    listAthleteClubs.execute
);
server.tool(
    listStarredSegments.name,
    listStarredSegments.description,
    {},
    listStarredSegments.execute
);
server.tool(
    getSegmentTool.name, 
    getSegmentTool.description,
    getSegmentTool.inputSchema?.shape ?? {},
    getSegmentTool.execute
);
server.tool(
    exploreSegments.name, // Original object
    exploreSegments.description,
    exploreSegments.inputSchema?.shape ?? {},
    exploreSegments.execute
);
server.tool(
    starSegment.name, // Original object
    starSegment.description,
    starSegment.inputSchema?.shape ?? {},
    starSegment.execute
);
server.tool(
    getSegmentEffortTool.name, 
    getSegmentEffortTool.description,
    getSegmentEffortTool.inputSchema?.shape ?? {},
    getSegmentEffortTool.execute
);
server.tool(
    listSegmentEffortsTool.name, 
    listSegmentEffortsTool.description,
    listSegmentEffortsTool.inputSchema?.shape ?? {},
    listSegmentEffortsTool.execute
);
server.tool(
    listAthleteRoutesTool.name, 
    listAthleteRoutesTool.description,
    listAthleteRoutesTool.inputSchema?.shape ?? {},
    listAthleteRoutesTool.execute
);
server.tool(
    getRouteTool.name,
    getRouteTool.description,
    getRouteTool.inputSchema?.shape ?? {},
    getRouteTool.execute
);
server.tool(
    exportRouteGpx.name, // Original object
    exportRouteGpx.description,
    exportRouteGpx.inputSchema?.shape ?? {},
    exportRouteGpx.execute
);
server.tool(
    exportRouteTcx.name, // Original object
    exportRouteTcx.description,
    exportRouteTcx.inputSchema?.shape ?? {},
    exportRouteTcx.execute
);

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