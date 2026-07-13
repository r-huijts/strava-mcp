#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { getServerInfo, SERVER_NAME } from "./serverInfo.js";

// Import all tool definitions with the correct names
import { getAthleteProfile } from './tools/getAthleteProfile.js';
import { getAthleteStatsTool } from "./tools/getAthleteStats.js";
import { getActivityDetailsTool } from "./tools/getActivityDetails.js";
import { getRecentActivities } from "./tools/getRecentActivities.js";
import { listAthleteClubs } from './tools/listAthleteClubs.js';
import { listStarredSegments } from './tools/listStarredSegments.js';
import { getSegmentTool } from "./tools/getSegment.js";
import { exploreSegments } from './tools/exploreSegments.js';
import { starSegment } from './tools/starSegment.js';
import { getSegmentEffortTool } from './tools/getSegmentEffort.js';
import { listSegmentEffortsTool } from './tools/listSegmentEfforts.js';
import { listAthleteRoutesTool } from './tools/listAthleteRoutes.js';
import { getRouteTool } from './tools/getRoute.js';
import { exportRouteGpx } from './tools/exportRouteGpx.js';
import { exportRouteTcx } from './tools/exportRouteTcx.js';
import { getActivityStreamsTool } from './tools/getActivityStreams.js';
import { getActivityLapsTool } from './tools/getActivityLaps.js';
import { getAthleteZonesTool } from './tools/getAthleteZones.js';
import { getAthleteShoesTool } from './tools/getAthleteShoes.js';
import { getAllActivities } from './tools/getAllActivities.js';
import { getActivityPhotosTool } from './tools/getActivityPhotos.js';
import { getServerVersionTool } from "./tools/getServerVersion.js";
import { connectStravaTool, disconnectStravaTool, checkStravaConnectionTool } from './tools/connectStrava.js';
import { getSegmentLeaderboardTool } from './tools/getSegmentLeaderboard.js';
import { loadConfig } from './config.js';

// New tool imports
import { createActivityTool } from './tools/createActivity.js';
import { updateActivityTool } from './tools/updateActivity.js';
import { getActivityCommentsTool } from './tools/getActivityComments.js';
import { getActivityKudoersTool } from './tools/getActivityKudoers.js';
import { getActivityZonesTool } from './tools/getActivityZones.js';
import { updateAthleteTool } from './tools/updateAthlete.js';
import { getClubTool } from './tools/getClub.js';
import { listClubActivitiesTool } from './tools/listClubActivities.js';
import { listClubMembersTool } from './tools/listClubMembers.js';
import { listClubAdminsTool } from './tools/listClubAdmins.js';
import { getGearTool } from './tools/getGear.js';
import { getRouteStreamsTool } from './tools/getRouteStreams.js';
import { getSegmentEffortStreamsTool } from './tools/getSegmentEffortStreams.js';
import { getSegmentStreamsTool } from './tools/getSegmentStreams.js';
import { uploadActivityTool } from './tools/uploadActivity.js';
import { getUploadStatusTool } from './tools/getUploadStatus.js';

// Import the actual client function
// import {
//     // exportRouteGpx as exportRouteGpxClient, // Removed unused alias
//     // exportRouteTcx as exportRouteTcxClient, // Removed unused alias
//     getActivityLaps as getActivityLapsClient
// } from './stravaClient.js';

// Load .env file explicitly from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
// REMOVE THIS DEBUG LOG - Interferes with MCP Stdio transport
// console.log(`[DEBUG] Attempting to load .env file from: ${envPath}`);
dotenv.config({ path: envPath });

const { version: serverVersion } = getServerInfo();

const server = new McpServer({
    name: SERVER_NAME,
    version: serverVersion
});

// Register all tools using server.registerTool
const tools: any[] = [
    getAthleteProfile,
    getAthleteStatsTool,
    getActivityDetailsTool,
    getRecentActivities,
    listAthleteClubs,
    listStarredSegments,
    getSegmentTool,
    exploreSegments,
    starSegment,
    getSegmentEffortTool,
    listSegmentEffortsTool,
    listAthleteRoutesTool,
    getRouteTool,
    exportRouteGpx,
    exportRouteTcx,
    getActivityStreamsTool,
    getActivityLapsTool,
    getAthleteZonesTool,
    getAthleteShoesTool,
    getAllActivities,
    getActivityPhotosTool,
    getServerVersionTool,
    connectStravaTool,
    disconnectStravaTool,
    checkStravaConnectionTool,
    getSegmentLeaderboardTool,
    createActivityTool,
    updateActivityTool,
    getActivityCommentsTool,
    getActivityKudoersTool,
    getActivityZonesTool,
    updateAthleteTool,
    getClubTool,
    listClubActivitiesTool,
    listClubMembersTool,
    listClubAdminsTool,
    getGearTool,
    getRouteStreamsTool,
    getSegmentEffortStreamsTool,
    getSegmentStreamsTool,
    uploadActivityTool,
    getUploadStatusTool,
];

for (const tool of tools) {
    server.registerTool(
        tool.name,
        {
            description: tool.description,
            inputSchema: tool.inputSchema
        },
        tool.execute as any
    );
}

// --- Helper Functions ---
// Moving formatDuration to utils or keeping it here if broadly used.
// For now, it's imported by getActivityLaps.ts
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
        console.error(`Starting ${SERVER_NAME} v${serverVersion}...`);
        
        // Load config from ~/.config/strava-mcp/ and merge with env vars
        const config = await loadConfig();
        if (config.accessToken && !process.env.STRAVA_ACCESS_TOKEN) {
            process.env.STRAVA_ACCESS_TOKEN = config.accessToken;
        }
        if (config.refreshToken && !process.env.STRAVA_REFRESH_TOKEN) {
            process.env.STRAVA_REFRESH_TOKEN = config.refreshToken;
        }
        if (config.clientId && !process.env.STRAVA_CLIENT_ID) {
            process.env.STRAVA_CLIENT_ID = config.clientId;
        }
        if (config.clientSecret && !process.env.STRAVA_CLIENT_SECRET) {
            process.env.STRAVA_CLIENT_SECRET = config.clientSecret;
        }
        
    const transport = new StdioServerTransport();
    await server.connect(transport);
        console.error(`${SERVER_NAME} v${serverVersion} connected via Stdio. Tools registered.`);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
