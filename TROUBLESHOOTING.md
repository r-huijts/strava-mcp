# Troubleshooting JSONRPC Error After Package Name Change

If you're getting `JSONRPC.ProtocolTransportError fout 3` after updating to `@r-huijts/strava-mcp-server`, try these steps:

## Step 1: Clear npx Cache

The old package might be cached. Clear it:

```bash
rm -rf ~/.npm/_npx
```

## Step 2: Verify Your Claude Desktop Config

Make sure your `~/Library/Application Support/Claude/claude_desktop_config.json` has:

```json
{
  "mcpServers": {
    "strava": {
      "command": "npx",
      "args": ["-y", "@r-huijts/strava-mcp-server"]
    }
  }
}
```

**Important:** Remove any old references to `strava-mcp-server` (without the `@r-huijts/` prefix).

## Step 3: Restart Claude Desktop

1. Quit Claude Desktop completely
2. Reopen it
3. The MCP server should start automatically

## Step 4: Test Manually

Test if the package works:

```bash
npx -y @r-huijts/strava-mcp-server
```

You should see: "Starting Strava MCP Server v1.2.1..."

## Step 5: Check Claude Desktop Logs

If it still doesn't work, check Claude Desktop's developer console for error messages.
