import { createRequire } from "module";

const require = createRequire(import.meta.url);

type PackageJson = {
  name?: string;
  version?: string;
  mcpName?: string;
};

export const SERVER_NAME = "Strava MCP Server";

export function getServerInfo(): {
  name: string;
  version: string;
  packageName: string;
  mcpName?: string;
} {
  let pkg: PackageJson = {};
  try {
    pkg = require("../package.json") as PackageJson;
  } catch {
    // If package.json isn't available at runtime, fall back to defaults.
  }

  return {
    name: SERVER_NAME,
    version: pkg.version ?? "unknown",
    packageName: pkg.name ?? "unknown",
    mcpName: pkg.mcpName,
  };
}
