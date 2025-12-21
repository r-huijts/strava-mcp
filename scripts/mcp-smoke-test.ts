import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

function getAllStringEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") {
      env[key] = value;
    }
  }
  return env;
}

async function main() {
  const client = new Client(
    { name: "strava-mcp-smoke-test", version: "0.0.0" },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/server.js"],
    cwd: process.cwd(),
    env: getAllStringEnv(),
    stderr: "pipe",
  });

  try {
    await client.connect(transport);

    const tools = await client.listTools();
    const toolNames = tools.tools.map((t) => t.name).sort();

    if (!toolNames.includes("get-all-activities")) {
      throw new Error(
        `Expected tool \'get-all-activities\' to be registered. Tools: ${toolNames.join(", ")}`
      );
    }

    const result = await client.callTool({
      name: "get-all-activities",
      arguments: {
        startDate: "2024-12-01",
        endDate: "2025-01-01",
        activityTypes: ["Run"],
      },
    });

    // Print the server result in a readable way.
    // MCP tool responses typically return `content` items, often with `{ type: "text", text: "..." }`.
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Smoke test failed:");
  console.error(err);
  process.exitCode = 1;
});
