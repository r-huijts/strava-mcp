# Strava MCP Server

This project implements a Model Context Protocol (MCP) server in TypeScript that acts as a bridge to the Strava API. It exposes Strava data and functionalities as "tools" that Large Language Models (LLMs) can utilize through the MCP standard.

## Natural Language Interaction Examples

Ask your AI assistant questions like these to interact with your Strava data:

**Recent Activity & Profile:**
- "Show me my recent Strava activities."
- "What were my last 3 rides?"
- "Get my Strava profile information."
- "What's my Strava username?"

**Stats:**
- "What are my running stats for this year on Strava?"
- "How far have I cycled in total?"
- "Show me my all-time swim totals."

**Specific Activities:**
- "Give me the details for my last run (activity ID 12345)."
- "What was the average power for activity 987654321?"
- "Did I use my Trek bike for activity 11223344?"

**Clubs:**
- "What Strava clubs am I in?"
- "List the clubs I've joined."

**Segments:**
- "List the segments I starred near Boulder, Colorado."
- "Show my favorite segments."
- "Get details for the 'Alpe du Zwift' segment (ID 123456)."
- "Are there any good running segments near Golden Gate Park? Use bounds 37.76,-122.51,37.78,-122.45."
- "Find Cat 1 or HC climbs near coordinates 39.9,-105.3,40.1,-105.1."
- "Star the 'Flagstaff Road Climb' segment (ID 654321) for me."
- "Unstar segment 112233."

**Segment Efforts:**
- "Show my efforts on the 'Sunshine Canyon' segment (ID 987654) this month."
- "List my attempts on segment 123123 between 2023-01-01 and 2023-06-30."
- "Get the details for my PR effort (effort ID 555666777)."

**Routes:**
- "List my saved Strava routes."
- "Show the second page of my routes."
- "What is the elevation gain for route 112233?"
- "Get the description for my 'Boulder Loop' route (ID 7654321)."
- "Export my 'Boulder Loop' route (ID 7654321) as a GPX file."
- "Save route 998877 as a TCX file."

## Advanced Prompt Example

Here's an example of a more advanced prompt to create a professional cycling coach analysis of your Strava activities:

```
You are Tom Verhaegen, elite cycling coach and mentor to world champion Mathieu van der Poel. Analyze my most recent Strava activity. Provide a thorough, data-driven assessment of the ride, combining both quantitative insights and textual interpretation.

Begin your report with a written summary that highlights key findings and context. Then, bring the raw numbers to life: build an interactive, visually striking dashboard using HTML, CSS, and JavaScript. Use bold, high-contrast colors and intuitive, insightful chart types that best suit each metric (e.g., heart rate, power, cadence, elevation).

Embed clear coaching feedback and personalized training recommendations directly within the visualization. These should be practical, actionable, and grounded solely in the data provided—no assumptions or fabrications.

As a bonus, sprinkle in motivational quotes and cheeky commentary from Mathieu van der Poel himself—he's been watching my rides with one eyebrow raised and a smirk of both concern and amusement.

Goal: Deliver a professional-grade performance analysis that looks and feels like it came straight from the inner circle of world-class cycling.
```

This prompt creates a personalized analysis of your most recent Strava activity, complete with professional coaching feedback and a custom visualization dashboard.

## Features

- 🏃 Access recent activities, profile, and stats.
- 🗺️ Explore, view, star, and manage segments.
- ⏱️ View detailed activity and segment effort information.
- 📍 List and view details of saved routes.
- 💾 Export routes in GPX or TCX format to the local filesystem.
- 🤖 AI-friendly JSON responses via MCP.
- 🔧 Uses Strava API V3.

## Installation & Setup

1. **Prerequisites:**
   - Node.js (v18 or later recommended)
   - npm (usually comes with Node.js)
   - A Strava Account

You can integrate this server with Claude Desktop as follows:

### 1. From Source

1. **Clone Repository:**
   ```bash
   git clone https://github.com/r-huijts/strava-mcp.git
   cd strava-mcp
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```
3. **Build the Project:**
   ```bash
   npm run build
   ```
   
4. **Configure Claude Desktop:**
   Update your Claude configuration file:

   ```json
   {
     "mcpServers": {
       "strava-mcp-local": {
         "command": "node",
         "args": [
           "/absolute/path/to/your/strava-mcp/dist/server.js"
         ]
         // Environment variables are read from the .env file by the server
       }
     }
   }
   ```

   Make sure to replace `/absolute/path/to/your/strava-mcp/` with the actual path to your installation.

After updating the configuration, restart Claude Desktop for the changes to take effect.

## Authentication Script Walkthrough

The `setup-auth.ts` script makes it easy to set up authentication with the Strava API. Here's a detailed walkthrough with screenshots and explanations:

### Create a Strava API Application

Before running the script, go to [https://www.strava.com/settings/api](https://www.strava.com/settings/api) and create a new application:

- Enter your application details (name, website, description)
- Important: Set "Authorization Callback Domain" to `localhost`
- Note down your Client ID and Client Secret

### Run the Setup Script

```bash
# In your strava-mcp directory
npx tsx scripts/setup-auth.ts
```

You'll see a welcome message:

```
--- Strava API Token Setup ---
```

### Enter Client Credentials

If your `.env` file doesn't already contain your Strava API credentials, you'll be prompted to enter them:

```
Enter your Strava Application Client ID: [your_client_id]
Enter your Strava Application Client Secret: [your_client_secret]
```

### Browser Authorization

The script will generate an authorization URL:

```
Step 1: Authorize Application
Please visit the following URL in your browser:

https://www.strava.com/oauth/authorize?client_id=12345&response_type=code&redirect_uri=http://localhost&approval_prompt=force&scope=profile:read_all,activity:read_all

After authorizing, Strava will redirect you to http://localhost.
Copy the 'code' value from the URL in your browser's address bar.
(e.g., http://localhost/?state=&code=THIS_PART&scope=...)
```

1. Open this URL in your browser
2. Log in to Strava if needed
3. Click "Authorize" on the permission screen
4. You'll be redirected to `localhost` (which will show a connection error - this is normal)
5. Look at your browser's address bar to find the authorization code:
   ```
   http://localhost/?state=&code=1a2b3c4d5e6f7g8h9i0j&scope=read,activity:read_all,profile:read_all
   ```
   The code is the part after `code=` and before `&scope=`

### Complete the OAuth Flow

1. Copy the authorization code from your browser
2. Return to your terminal and paste the code when prompted:
   ```
   Paste the authorization code here: 1a2b3c4d5e6f7g8h9i0j
   ```
3. The script will exchange this code for access and refresh tokens

### Save Tokens to .env

When asked to save the tokens to your .env file, enter "yes":

```
Do you want to save these tokens to your .env file? (yes/no): yes
✅ Tokens successfully saved to .env file.
```

Your `.env` file will now contain all required credentials:

```
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
STRAVA_ACCESS_TOKEN=your_generated_access_token
STRAVA_REFRESH_TOKEN=your_generated_refresh_token
```

## 🔑 Environment Variables

| Variable | Description |
|----------|-------------|
| STRAVA_CLIENT_ID | Your Strava Application Client ID (required) |
| STRAVA_CLIENT_SECRET | Your Strava Application Client Secret (required) |
| STRAVA_ACCESS_TOKEN | Your Strava API access token (generated during setup) |
| STRAVA_REFRESH_TOKEN | Your Strava API refresh token (generated during setup) |
| ROUTE_EXPORT_PATH | Absolute path for saving exported route files (optional) |

## Token Handling

This server implements automatic token refreshing. When the initial access token expires (typically after 6 hours), the server will automatically use the refresh token stored in `.env` to obtain a new access token and refresh token. These new tokens are then updated in both the running process and the `.env` file, ensuring continuous operation.

You only need to run the `scripts/setup-auth.ts` script once for the initial setup.

## Configure Export Path (Optional)

If you intend to use the `export-route-gpx` or `export-route-tcx` tools, you need to specify a directory for saving exported files.

Edit your `.env` file and add/update the `ROUTE_EXPORT_PATH` variable:
```dotenv
# Optional: Define an *absolute* path for saving exported route files (GPX/TCX)
# Ensure this directory exists and the server process has write permissions.
# Example: ROUTE_EXPORT_PATH=/Users/your_username/strava-exports
ROUTE_EXPORT_PATH=
```

Replace the placeholder with the **absolute path** to your desired export directory. Ensure the directory exists and the server has permission to write to it.

## API Reference

The server exposes the following MCP tools:

---

### `get-recent-activities`

Fetches the authenticated user's recent activities.

- **When to use:** When the user asks about their recent workouts, activities, runs, rides, etc.
- **Parameters:**
  - `perPage` (optional):
    - Type: `number`
    - Description: Number of activities to retrieve.
    - Default: 30
- **Output:** Formatted text list of recent activities (Name, ID, Distance, Date).
- **Errors:** Missing/invalid token, Strava API errors.

---

### `get-athlete-profile`

Fetches the profile information for the authenticated athlete.

- **When to use:** When the user asks for their profile details, username, location, weight, premium status, etc.
- **Parameters:** None
- **Output:** Formatted text string with profile details.
- **Errors:** Missing/invalid token, Strava API errors.

---

### `get-athlete-stats`

Fetches activity statistics (recent, YTD, all-time) for the authenticated athlete.

- **When to use:** When the user asks for their overall statistics, totals for runs/rides/swims, personal records (longest ride, biggest climb).
- **Parameters:** None
- **Output:** Formatted text summary of stats, respecting user's measurement preference.
- **Errors:** Missing/invalid token, Strava API errors.

---

### `get-activity-details`

Fetches detailed information about a specific activity using its ID.

- **When to use:** When the user asks for details about a *specific* activity identified by its ID.
- **Parameters:**
  - `activityId` (required):
    - Type: `number`
    - Description: The unique identifier of the activity.
- **Output:** Formatted text string with detailed activity information (type, date, distance, time, speed, HR, power, gear, etc.), respecting user's measurement preference.
- **Errors:** Missing/invalid token, Invalid `activityId`, Strava API errors.

---

### `list-athlete-clubs`

Lists the clubs the authenticated athlete is a member of.

- **When to use:** When the user asks about the clubs they have joined.
- **Parameters:** None
- **Output:** Formatted text list of clubs (Name, ID, Sport, Members, Location).
- **Errors:** Missing/invalid token, Strava API errors.

---

### `list-starred-segments`

Lists the segments starred by the authenticated athlete.

- **When to use:** When the user asks about their starred or favorite segments.
- **Parameters:** None
- **Output:** Formatted text list of starred segments (Name, ID, Type, Distance, Grade, Location).
- **Errors:** Missing/invalid token, Strava API errors.

---

### `get-segment`

Fetches detailed information about a specific segment using its ID.

- **When to use:** When the user asks for details about a *specific* segment identified by its ID.
- **Parameters:**
  - `segmentId` (required):
    - Type: `number`
    - Description: The unique identifier of the segment.
- **Output:** Formatted text string with detailed segment information (distance, grade, elevation, location, stars, efforts, etc.), respecting user's measurement preference.
- **Errors:** Missing/invalid token, Invalid `segmentId`, Strava API errors.

---

### `explore-segments`

Searches for popular segments within a given geographical area (bounding box).

- **When to use:** When the user wants to find or discover segments in a specific geographic area, optionally filtering by activity type or climb category.
- **Parameters:**
  - `bounds` (required):
    - Type: `string`
    - Description: Comma-separated: `south_west_lat,south_west_lng,north_east_lat,north_east_lng`.
  - `activityType` (optional):
    - Type: `string` (`"running"` or `"riding"`)
    - Description: Filter by activity type.
  - `minCat` (optional):
    - Type: `number` (0-5)
    - Description: Minimum climb category. Requires `activityType: 'riding'`.
  - `maxCat` (optional):
    - Type: `number` (0-5)
    - Description: Maximum climb category. Requires `activityType: 'riding'`.
- **Output:** Formatted text list of found segments (Name, ID, Climb Cat, Distance, Grade, Elevation).
- **Errors:** Missing/invalid token, Invalid `bounds` format, Invalid filter combination, Strava API errors.

---

### `star-segment`

Stars or unstars a specific segment for the authenticated athlete.

- **When to use:** When the user explicitly asks to star, favorite, unstar, or unfavorite a specific segment identified by its ID.
- **Parameters:**
  - `segmentId` (required):
    - Type: `number`
    - Description: The unique identifier of the segment.
  - `starred` (required):
    - Type: `boolean`
    - Description: `true` to star, `false` to unstar.
- **Output:** Success message confirming the action and the segment's new starred status.
- **Errors:** Missing/invalid token, Invalid `segmentId`, Strava API errors (e.g., segment not found, rate limit).

---

### `get-segment-effort`

Fetches detailed information about a specific segment effort using its ID.

- **When to use:** When the user asks for details about a *specific* segment effort identified by its ID.
- **Parameters:**
  - `effortId` (required):
    - Type: `number`
    - Description: The unique identifier of the segment effort.
- **Output:** Formatted text string with detailed effort information (segment name, activity ID, time, distance, HR, power, rank, etc.).
- **Errors:** Missing/invalid token, Invalid `effortId`, Strava API errors.

---

### `list-segment-efforts`

Lists the authenticated athlete's efforts on a given segment, optionally filtered by date.

- **When to use:** When the user asks to list their efforts or attempts on a specific segment, possibly within a date range.
- **Parameters:**
  - `segmentId` (required):
    - Type: `number`
    - Description: The ID of the segment.
  - `startDateLocal` (optional):
    - Type: `string` (ISO 8601 format)
    - Description: Filter efforts starting after this date-time.
  - `endDateLocal` (optional):
    - Type: `string` (ISO 8601 format)
    - Description: Filter efforts ending before this date-time.
  - `perPage` (optional):
    - Type: `number`
    - Description: Number of results per page.
    - Default: 30
- **Output:** Formatted text list of matching segment efforts.
- **Errors:** Missing/invalid token, Invalid `segmentId`, Invalid date format, Strava API errors.

---

### `list-athlete-routes`

Lists the routes created by the authenticated athlete.

- **When to use:** When the user asks to see the routes they have created or saved.
- **Parameters:**
  - `page` (optional):
    - Type: `number`
    - Description: Page number for pagination.
  - `perPage` (optional):
    - Type: `number`
    - Description: Number of routes per page.
    - Default: 30
- **Output:** Formatted text list of routes (Name, ID, Type, Distance, Elevation, Date).
- **Errors:** Missing/invalid token, Strava API errors.

---

### `get-route`

Fetches detailed information for a specific route using its ID.

- **When to use:** When the user asks for details about a *specific* route identified by its ID.
- **Parameters:**
  - `routeId` (required):
    - Type: `number`
    - Description: The unique identifier of the route.
- **Output:** Formatted text string with route details (Name, ID, Type, Distance, Elevation, Est. Time, Description, Segment Count).
- **Errors:** Missing/invalid token, Invalid `routeId`, Strava API errors.

---

### `export-route-gpx`

Exports a specific route in GPX format and saves it locally.

- **When to use:** When the user explicitly asks to export or save a specific route as a GPX file.
- **Prerequisite:** The `ROUTE_EXPORT_PATH` environment variable must be correctly configured on the server.
- **Parameters:**
  - `routeId` (required):
    - Type: `number`
    - Description: The unique identifier of the route.
- **Output:** Success message indicating the save location, or an error message.
- **Errors:** Missing/invalid token, Missing/invalid `ROUTE_EXPORT_PATH`, File system errors (permissions, disk space), Invalid `routeId`, Strava API errors.

---

### `export-route-tcx`

Exports a specific route in TCX format and saves it locally.

- **When to use:** When the user explicitly asks to export or save a specific route as a TCX file.
- **Prerequisite:** The `ROUTE_EXPORT_PATH` environment variable must be correctly configured on the server.
- **Parameters:**
  - `routeId` (required):
    - Type: `number`
    - Description: The unique identifier of the route.
- **Output:** Success message indicating the save location, or an error message.
- **Errors:** Missing/invalid token, Missing/invalid `ROUTE_EXPORT_PATH`, File system errors (permissions, disk space), Invalid `routeId`, Strava API errors.

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. (Assuming MIT, update if different)
