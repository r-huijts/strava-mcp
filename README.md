# Strava MCP Server

**Talk to your Strava data using AI.**

Connect Claude to your Strava account and ask questions in plain English: "How far did I run this month?", "Analyze my last ride", or "Show me my fastest segments."

[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/r-huijts-strava-mcp-badge.png)](https://mseep.ai/app/r-huijts-strava-mcp)

<a href="https://glama.ai/mcp/servers/@r-huijts/strava-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@r-huijts/strava-mcp/badge" alt="Strava Server MCP server" />
</a>

---

## What Can You Do With This?

Once connected, just talk to Claude like you're talking to a friend who has access to all your Strava data:

### 🏃 Track Your Progress
> "How many kilometers did I run this month?"
> 
> "Compare my running stats from January to December"
> 
> "What's my longest ride ever?"

### 📊 Analyze Your Workouts
> "Break down my last cycling workout - show me power, heart rate, and cadence"
> 
> "How did my heart rate zones look during yesterday's run?"
> 
> "What was my average pace for each lap in my interval training?"

### 🗺️ Explore Routes & Segments
> "What are the most popular cycling segments near Central Park?"
> 
> "Show me my starred segments"
> 
> "Export my Sunday morning route as a GPX file"

### 🏆 Get Coaching Insights
> "Analyze my training load this week"
> 
> "How does my current fitness compare to last month?"
> 
> "Give me a summary of my cycling performance this year"

---

## Quick Start (3 Steps)

### Step 1: Add to Claude Desktop

Open your Claude Desktop configuration file:
- **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add this to the file:

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

### Step 2: Restart Claude Desktop

Close and reopen Claude Desktop to load the new configuration.

### Step 3: Connect Your Strava

Just say to Claude:

> **"Connect my Strava account"**

A browser window will open. Enter your Strava API credentials, authorize the app, and you're done!

**That's it!** Start asking about your activities.

---

## Connecting Your Strava Account

### First Time Setup

When you say "Connect my Strava account", here's what happens:

1. **A browser window opens** showing a setup page
2. **Enter your Strava API credentials** (Client ID and Client Secret)
3. **Click "Continue to Strava"** - you'll be redirected to Strava
4. **Authorize the app** on Strava's website
5. **See the success message** - you can close the browser
6. **Done!** Claude confirms you're connected

Your credentials are saved locally at `~/.config/strava-mcp/config.json` and persist across sessions.

### Getting Your Strava API Credentials

You need to create a free Strava API application (one-time setup):

1. Go to [strava.com/settings/api](https://www.strava.com/settings/api)
2. Click "Create an App" (or view your existing app)
3. Fill in the form:
   - **Application Name**: Anything you want (e.g., "My Claude Assistant")
   - **Category**: Choose any
   - **Website**: Can be anything (e.g., `http://localhost`)
   - **Authorization Callback Domain**: Must be `localhost`
4. Copy your **Client ID** and **Client Secret**

That's it! You only need to do this once.

### Managing Your Connection

- **Check status**: "Am I connected to Strava?"
- **Reconnect**: "Connect my Strava account" (use `force: true` to reconnect)
- **Disconnect**: "Disconnect my Strava account"

---

## Installation Options

### Option A: Just Use It (Recommended)

No installation needed! The `npx` command in the Quick Start automatically downloads and runs the latest version.

### Option B: Install Globally

If you prefer to install it once:

```bash
npm install -g @r-huijts/strava-mcp-server
```

Then update your Claude config to use:

```json
{
  "mcpServers": {
    "strava": {
      "command": "strava-mcp-server"
    }
  }
}
```

**Note:** Even though the package name is `@r-huijts/strava-mcp-server`, the executable name remains `strava-mcp-server` for backward compatibility.

### Option C: Build from Source

For developers who want to modify the code:

   ```bash
   git clone https://github.com/r-huijts/strava-mcp.git
   cd strava-mcp
   npm install
   npm run build
   ```

Then point Claude to your local build:

```json
{
  "mcpServers": {
    "strava": {
      "command": "node",
      "args": ["/path/to/strava-mcp/dist/server.js"]
    }
  }
}
```

---

## Example Conversations

### Morning Check-in

> **You**: What did I do for exercise this week?
>
> **Claude**: Looking at your Strava activities this week, you completed:
> - Monday: 5.2km run (28:15)
> - Wednesday: 45km bike ride (1:32:00)
> - Saturday: 10km run (52:30)
> 
> Total: 60.2km across 3 activities. Nice consistency!

### Workout Analysis

> **You**: Analyze my last cycling workout in detail
>
> **Claude**: Here's a breakdown of your ride "Evening Loop" from yesterday:
> 
> **Overview**
> - Distance: 42.3 km
> - Time: 1:28:45
> - Avg Speed: 28.6 km/h
> 
> **Power Analysis**
> - Average Power: 185W
> - Normalized Power: 198W
> - Max Power: 520W
> 
> **Heart Rate**
> - Average: 142 bpm
> - Max: 175 bpm
> - Time in Zone 4+: 23 minutes
> 
> Your power-to-heart-rate ratio suggests good aerobic efficiency...

### Finding New Routes

> **You**: Find me some challenging cycling climbs near Boulder, Colorado
>
> **Claude**: Here are popular climbing segments near Boulder:
> 
> 1. **Flagstaff Road** - 5.2km, 6.8% avg grade
> 2. **Sunshine Canyon** - 3.8km, 7.2% avg grade  
> 3. **Left Hand Canyon** - 8.1km, 4.5% avg grade
> 
> Want me to star any of these so you can find them easily later?

---

## Available Tools

### Account & Profile

| What you can ask | What it does |
|------------------|--------------|
| "Connect my Strava account" | Links your Strava to Claude |
| "Check my Strava connection" | Shows connection status |
| "Get my Strava profile" | Shows your profile info |
| "What are my training zones?" | Shows HR and power zones |

### Activities

| What you can ask | What it does |
|------------------|--------------|
| "Show my recent activities" | Lists your latest workouts |
| "Get all my runs from January" | Fetches activities with filters |
| "Analyze activity 12345" | Detailed info about one activity |
| "Show the laps from my last run" | Lap-by-lap breakdown |
| "Get heart rate data from my ride" | Time-series workout data (optimized compact format) |
| "Show photos from my hike" | Activity photos |

### Stats & Progress

| What you can ask | What it does |
|------------------|--------------|
| "What are my running stats?" | YTD and all-time totals |
| "How far have I cycled this year?" | Activity totals by type |
| "What's my longest ride?" | Personal records |

### Segments

| What you can ask | What it does |
|------------------|--------------|
| "Show my starred segments" | Your favorite segments |
| "Find segments near [location]" | Discover popular segments |
| "Get details on segment 12345" | Segment info and leaderboard |
| "Star this segment" | Save to favorites |
| "Show my efforts on [segment]" | Your attempts on a segment |

### Routes

| What you can ask | What it does |
|------------------|--------------|
| "List my saved routes" | Your created routes |
| "Get details for my [route name]" | Route info |
| "Export [route] as GPX" | Download for GPS devices |
| "Export [route] as TCX" | Download for GPS devices |

### Clubs

| What you can ask | What it does |
|------------------|--------------|
| "What clubs am I in?" | Lists your Strava clubs |

---

## Troubleshooting

### "Connect my Strava account" doesn't open a browser

- Make sure Claude Desktop is running the MCP server (check for errors in Claude)
- Try restarting Claude Desktop
- Check that port 8111 isn't blocked by a firewall

### "Authentication failed" or "Invalid token"

- Your token may have expired - say "Connect my Strava account" to reconnect
- Make sure your Strava API application is still active at [strava.com/settings/api](https://www.strava.com/settings/api)

### "Missing credentials" error

- You need to complete the OAuth flow - say "Connect my Strava account"
- If you're using environment variables, make sure all 4 are set (see Developer section)

### Claude doesn't see the Strava tools

- Make sure your `claude_desktop_config.json` is valid JSON (no trailing commas!)
- Restart Claude Desktop after making config changes
- Check Claude's developer console for error messages

---

## For Developers

<details>
<summary>Click to expand technical details</summary>

### Environment Variables

Instead of using the browser-based auth, you can set environment variables:

| Variable | Description |
|----------|-------------|
| `STRAVA_CLIENT_ID` | Your Strava Application Client ID |
| `STRAVA_CLIENT_SECRET` | Your Strava Application Client Secret |
| `STRAVA_ACCESS_TOKEN` | OAuth access token |
| `STRAVA_REFRESH_TOKEN` | OAuth refresh token |
| `ROUTE_EXPORT_PATH` | Directory for GPX/TCX exports |

### Token Refresh

The server automatically refreshes expired tokens. New tokens are saved to both `process.env` and `~/.config/strava-mcp/config.json`.

### Config Priority

1. Environment variables (highest)
2. `~/.config/strava-mcp/config.json`
3. Local `.env` file

### Building & Testing

```bash
npm install
npm run build
npm test
```

### Activity Streams Optimization

The `get-activity-streams` tool uses a compact format by default, reducing payload size by ~70-80% while preserving all data:

- **Compact format** (default): Raw arrays with metadata, ~70-80% smaller, ideal for LLM processing
- **Verbose format**: Human-readable objects with formatted values (backward compatible)
- **Smart chunking**: Large activities automatically split into ~50KB chunks
- **Optional downsampling**: Can reduce very large datasets while preserving key features

The compact format includes comprehensive metadata (units, descriptions, statistics) so LLMs can understand the raw numeric data.

### API Reference

The server implements the Model Context Protocol (MCP) and exposes 24 tools for Strava API v3. See the source code in `src/tools/` for implementation details.

### Contributing

Contributions welcome! Please submit a Pull Request.

</details>

---

## License

MIT License - see LICENSE file for details.

---

**Questions?** Open an issue on [GitHub](https://github.com/r-huijts/strava-mcp/issues).
