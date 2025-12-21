import { getServerInfo } from "../serverInfo.js";

export const getServerVersionTool = {
  name: "get-server-version",
  description: "Returns the Strava MCP server version and related metadata.",
  inputSchema: undefined,
  execute: async () => {
    const info = getServerInfo();
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(info, null, 2),
        },
      ],
    };
  },
};
