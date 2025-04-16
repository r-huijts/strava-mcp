# Strava MCP Server

This project implements a Model Context Protocol (MCP) server in TypeScript that acts as a bridge to the Strava API. It exposes Strava data and functionalities as "tools" that Large Language Models (LLMs) can utilize through the MCP standard.

<a href="https://glama.ai/mcp/servers/@r-huijts/strava-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@r-huijts/strava-mcp/badge" alt="Strava Server MCP server" />
</a>

## Features

- 🏃 Access recent activities, profile, and stats.
- 📊 Fetch detailed activity streams (power, heart rate, cadence, etc.).
- 🗺️ Explore, view, star, and manage segments.
- ⏱️ View detailed activity and segment effort information.
- 📍 List and view details of saved routes.
- 💾 Export routes in GPX or TCX format to the local filesystem.
- 🤖 AI-friendly JSON responses via MCP.
- 🔧 Uses Strava API V3.

## Natural Language Interaction Examples

Ask your AI assistant questions like these to interact with your Strava data:

**Recent Activity & Profile:**
* "Show me my recent Strava activities."
* "What were my last 3 rides?"
* "Get my Strava profile information."
* "What's my Strava username?"

**Activity Streams & Data:**
* "Get the heart rate data from my morning run yesterday."
* "Show me the power data from my last ride."
* "What was my cadence profile for my weekend century ride?"
* "Get all stream data for my Thursday evening workout."
* "Show me the elevation profile for my Mt. Diablo climb."

**Stats:**
* "What are my running stats for this year on Strava?"
* "How far have I cycled in total?"
* "Show me my all-time swim totals."

**Specific Activities:**
* "Give me the details for my last run."
* "What was the average power for my interval training on Tuesday?"
* "Did I use my Trek bike for my commute yesterday?"

**Clubs:**
* "What Strava clubs am I in?"
* "List the clubs I've joined."

**Segments:**
* "List the segments I starred near Boulder, Colorado."
* "Show my favorite segments."
* "Get details for the 'Alpe du Zwift' segment."
* "Are there any good running segments near Golden Gate Park?"
* "Find challenging climbs near Boulders Flagstaff Mountain."
* "Star the 'Flagstaff Road Climb' segment for me."
* "Unstar the 'Lefthand Canyon' segment."

**Segment Efforts:**
* "Show my efforts on the 'Sunshine Canyon' segment this month."
* "List my attempts on Box Hill between January and June this year."
* "Get the details for my personal record on Alpe d'Huez."

**Routes:**
* "List my saved Strava routes."
* "Show the second page of my routes."
* "What is the elevation gain for my Boulder Loop route?"
* "Get the description for my 'Boulder Loop' route."
* "Export my 'Boulder Loop' route as a GPX file."
* "Save my Sunday morning route as a TCX file."

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

## ⚠️ Important Setup Sequence

For successful integration with Claude, follow these steps in exact order:

1. Install the server and its dependencies
2. Configure the server in Claude's configuration
3. Complete the Strava authentication flow
4. Restart Claude to ensure proper environment variable loading

Skipping steps or performing them out of order may result in environment variables not being properly read by Claude.

## Installation & Setup

1. **Prerequisites:**
   - Node.js (v18 or later recommended)
   - npm (usually comes with Node.js)
   - A Strava Account

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

### 2. Configure Claude Desktop

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

### 3. Strava Authentication Setup

The `setup-auth.ts` script makes it easy to set up authentication with the Strava API. Follow these steps carefully:

#### Create a Strava API Application

1. Go to [https://www.strava.com/settings/api](https://www.strava.com/settings/api)
2. Create a new application:
   - Enter your application details (name, website, description)
   - Important: Set "Authorization Callback Domain" to `localhost`
   - Note down your Client ID and Client Secret

#### Run the Setup Script

```bash
# In your strava-mcp directory
npx tsx scripts/setup-auth.ts
```

Follow the prompts to complete the authentication flow (detailed instructions in the Authentication section below).

### 4. Restart Claude

After completing all the above steps, restart Claude Desktop for the changes to take effect. This ensures that:
- The new configuration is loaded
- The environment variables are properly read
- The Strava MCP server is properly initialized

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

### `get-activity-streams`

Retrieves detailed time-series data streams from a Strava activity, perfect for analyzing workout metrics, visualizing routes, or performing detailed activity analysis.

- **When to use:** When you need detailed time-series data from an activity for:
  - Analyzing workout intensity through heart rate zones
  - Calculating power metrics for cycling activities
  - Visualizing route data using GPS coordinates
  - Analyzing pace and elevation changes
  - Detailed segment analysis

- **Parameters:**
  - `id` (required):
    - Type: `number | string`
    - Description: The Strava activity identifier to fetch streams for
  - `types` (optional):
    - Type: `array`
    - Default: `['time', 'distance', 'heartrate', 'cadence', 'watts']`
    - Available types:
      - `time`: Time in seconds from start
      - `distance`: Distance in meters from start
      - `latlng`: Array of [latitude, longitude] pairs
      - `altitude`: Elevation in meters
      - `velocity_smooth`: Smoothed speed in meters/second
      - `heartrate`: Heart rate in beats per minute
      - `cadence`: Cadence in revolutions per minute
      - `watts`: Power output in watts
      - `temp`: Temperature in Celsius
      - `moving`: Boolean indicating if moving
      - `grade_smooth`: Road grade as percentage
  - `resolution` (optional):
    - Type: `string`
    - Values: `'low'` (~100 points), `'medium'` (~1000 points), `'high'` (~10000 points)
    - Description: Data resolution/density
  - `series_type` (optional):
    - Type: `string`
    - Values: `'time'` or `'distance'`
    - Default: `'distance'`
    - Description: Base series type for data point indexing
  - `page` (optional):
    - Type: `number`
    - Default: 1
    - Description: Page number for paginated results
  - `points_per_page` (optional):
    - Type: `number`
    - Default: 100
    - Special value: `-1` returns ALL data points split into multiple messages
    - Description: Number of data points per page

- **Output Format:**
  1. Metadata:
     - Available stream types
     - Total data points
     - Resolution and series type
     - Pagination info (current page, total pages)
  2. Statistics (where applicable):
     - Heart rate: max, min, average
     - Power: max, average, normalized power
     - Speed: max and average in km/h
  3. Stream Data:
     - Formatted time-series data for each requested stream
     - Human-readable formats (e.g., formatted time, km/h for speed)
     - Consistent numeric precision
     - Labeled data points

- **Example Request:**
  ```json
  {
    "id": 12345678,
    "types": ["time", "heartrate", "watts", "velocity_smooth", "cadence"],
    "resolution": "high",
    "points_per_page": 100,
    "page": 1
  }
  ```

- **Special Features:**
  - Smart pagination for large datasets
  - Complete data retrieval mode (points_per_page = -1)
  - Rich statistics and metadata
  - Formatted output for both human and LLM consumption
  - Automatic unit conversions

- **Notes:**
  - Requires activity:read scope
  - Not all streams are available for all activities
  - Older activities might have limited data
  - Large activities are automatically paginated
  - Stream availability depends on recording device and activity type

- **Errors:**
  - Missing/invalid token
  - Invalid activity ID
  - Insufficient permissions
  - Unavailable stream types
  - Invalid pagination parameters

---

### `get-activity-laps`

Retrieves the laps recorded for a specific Strava activity.

- **When to use:**
  - Analyze performance variations across different segments (laps) of an activity.
  - Compare lap times, speeds, heart rates, or power outputs.
  - Understand how an activity was structured (e.g., interval training).

- **Parameters:**
  - `id` (required):
    - Type: `number | string`
    - Description: The unique identifier of the Strava activity.

- **Output Format:**
  A text summary detailing each lap, including:
  - Lap Index
  - Lap Name (if available)
  - Elapsed Time (formatted as HH:MM:SS)
  - Moving Time (formatted as HH:MM:SS)
  - Distance (in km)
  - Average Speed (in km/h)
  - Max Speed (in km/h)
  - Total Elevation Gain (in meters)
  - Average Heart Rate (if available, in bpm)
  - Max Heart Rate (if available, in bpm)
  - Average Cadence (if available, in rpm)
  - Average Watts (if available, in W)

- **Example Request:**
  ```json
  {
    "id": 1234567890
  }
  ```

- **Example Response Snippet:**
  ```text
  Activity Laps Summary (ID: 1234567890):

  Lap 1: Warmup Lap
    Time: 15:02 (Moving: 14:35)
    Distance: 5.01 km
    Avg Speed: 20.82 km/h
    Max Speed: 35.50 km/h
    Elevation Gain: 50.2 m
    Avg HR: 135.5 bpm
    Max HR: 150 bpm
    Avg Cadence: 85.0 rpm

  Lap 2: Interval 1
    Time: 05:15 (Moving: 05:10)
    Distance: 2.50 km
    Avg Speed: 29.03 km/h
    Max Speed: 42.10 km/h
    Elevation Gain: 10.1 m
    Avg HR: 168.2 bpm
    Max HR: 175 bpm
    Avg Cadence: 92.1 rpm
    Avg Power: 280.5 W (Sensor)

  ...
  ```

- **Notes:**
  - Requires `activity:read` scope for public/followers activities, `activity:read_all` for private activities.
  - Lap data availability depends on the recording device and activity type (e.g., manual activities may not have laps).

- **Errors:**
  - Missing/invalid token
  - Invalid activity ID
  - Insufficient permissions
  - Activity not found

---

### `get-athlete-zones`

Retrieves the authenticated athlete's configured heart rate and power zones.

- **When to use:** When the user asks about their heart rate zones, power zones, or training zone settings.
- **Parameters:** None
- **Output Format:**
  Returns two text blocks:
  1.  A **formatted summary** detailing configured zones:
      - Heart Rate Zones: Custom status, Zone ranges, Time Distribution (if available)
      - Power Zones: Zone ranges, Time Distribution (if available)
  2.  The **complete raw JSON data** as returned by the Strava API.
- **Example Response Snippet (Summary):**
  ```text
  **Athlete Zones:**

  ❤️ **Heart Rate Zones**
     Custom Zones: No
     Zone 1: 0 - 115 bpm
     Zone 2: 115 - 145 bpm
     Zone 3: 145 - 165 bpm
     Zone 4: 165 - 180 bpm
     Zone 5: 180+ bpm

  ⚡ **Power Zones**
     Zone 1: 0 - 150 W
     Zone 2: 151 - 210 W
     Zone 3: 211 - 250 W
     Zone 4: 251 - 300 W
     Zone 5: 301 - 350 W
     Zone 6: 351 - 420 W
     Zone 7: 421+ W
     Time Distribution:
       - 0-50: 0:24:58
       - 50-100: 0:01:02
       ...
       - 450-∞: 0:05:43
  ```
- **Notes:**
  - Requires `profile:read_all` scope.
  - Zones might not be configured for all athletes.
- **Errors:**
  - Missing/invalid token
  - Insufficient permissions (Missing `profile:read_all` scope - 403 error)
  - Subscription Required (Potentially, if Strava changes API access)

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. (Assuming MIT, update if different)