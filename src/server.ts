import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as dotenv from "dotenv";

// Import tool registration functions
import { registerGetRecentActivitiesTool } from "./tools/getRecentActivities.js";
import { registerGetAthleteProfileTool } from "./tools/getAthleteProfile.js";
import { registerGetAthleteStatsTool } from "./tools/getAthleteStats.js";
import { registerGetActivityDetailsTool } from "./tools/getActivityDetails.js";
import { registerListAthleteClubsTool } from "./tools/listAthleteClubs.js";
import { registerListStarredSegmentsTool } from "./tools/listStarredSegments.js";
import { registerGetSegmentTool } from "./tools/getSegment.js";
import { registerExploreSegmentsTool } from "./tools/exploreSegments.js";
import { registerStarSegmentTool } from "./tools/starSegment.js";
import { registerGetSegmentEffortTool } from './tools/getSegmentEffort.js';
import { registerListSegmentEffortsTool } from './tools/listSegmentEfforts.js';

// Load environment variables from .env file
dotenv.config();

const server = new McpServer({
  name: "Strava MCP Server",
  version: "1.0.0",
});

// --- Register Tools ---
registerGetRecentActivitiesTool(server);
registerGetAthleteProfileTool(server);
registerGetAthleteStatsTool(server);
registerGetActivityDetailsTool(server);
registerListAthleteClubsTool(server);
registerListStarredSegmentsTool(server);
registerGetSegmentTool(server);
registerExploreSegmentsTool(server);
registerStarSegmentTool(server);
registerGetSegmentEffortTool(server);
registerListSegmentEffortsTool(server);

// --- Helper Functions (Exported) ---

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

// NOTE: Other formatters (formatStats, formatActivityDetails, formatSegmentDetails)
// have been moved into their respective tool files (e.g., src/tools/getAthleteStats.ts)
// because they were only used by a single tool. If they become needed by multiple
// tools, consider moving them back here (exported) or to a dedicated src/utils.ts file.


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