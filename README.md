# Strava MCP Server

This project implements a Model Context Protocol (MCP) server in TypeScript that acts as a bridge to the Strava API. It exposes Strava data and functionalities as "tools" that Large Language Models (LLMs) can utilize through the MCP standard.

## Natural Language Interaction Examples

Ask your AI assistant questions like these to interact with your Strava data:

-   "Show me my recent Strava activities."
-   "Get my Strava profile information."
-   "What are my running stats for this year on Strava?"
-   "Give me the details for my last run (activity ID 12345)."
-   "What Strava clubs am I in?"
-   "List the segments I starred near Boulder, Colorado."
-   "Star the 'Flagstaff Road Climb' segment (ID 654321) for me."
-   "Show my efforts on the 'Sunshine Canyon' segment (ID 987654) this month."
-   "List my saved Strava routes."
-   "What is the elevation gain for route 112233?"
-   "Export my 'Boulder Loop' route (ID 7654321) as a GPX file."

## Features

-   🏃 Access recent activities, profile, and stats.
-   🗺️ Explore, view, star, and manage segments.
-   ⏱️ View detailed activity and segment effort information.
-   📍 List and view details of saved routes.
-   💾 Export routes in GPX or TCX format to the local filesystem.
-   🤖 AI-friendly JSON responses via MCP.
-   🔧 Uses Strava API V3.

## Installation & Setup

1.  **Prerequisites:**
    -   Node.js (v18 or later recommended)
    -   npm (usually comes with Node.js)
    -   A Strava Account

2.  **Clone Repository:**
    ```bash
    git clone <repository_url> strava-mcp
    cd strava-mcp
    ```
    *(Replace `<repository_url>` with the actual URL)*

3.  **Install Dependencies:**
    ```bash
    npm install
    ```

4.  **Configure Environment Variables:**
    -   Copy the example `.env.example` file to `.env`:
        ```bash
        cp .env.example .env
        ```
    -   Edit the `.env` file:
        ```dotenv
        # Strava API Access Token
        # Get yours from https://www.strava.com/settings/api
        STRAVA_ACCESS_TOKEN=YOUR_COPIED_ACCESS_TOKEN_HERE

        # Optional: Define a path for saving exported route files (GPX/TCX)
        # Ensure this directory exists and the server process has write permissions.
        # Example: ROUTE_EXPORT_PATH=/Users/your_username/strava-exports
        ROUTE_EXPORT_PATH=
        ```
    -   **Obtain Strava Access Token:**
        1.  Go to your Strava API Settings page: [https://www.strava.com/settings/api](https://www.strava.com/settings/api)
        2.  Create an API application if you haven't already.
        3.  Copy the "Your Access Token" value.
        4.  Paste this token into the `.env` file as the value for `STRAVA_ACCESS_TOKEN`.
    -   **Set Export Path (Optional):** If you want to use the `export-route-gpx` or `export-route-tcx` tools, set `ROUTE_EXPORT_PATH` to an **absolute path** to a directory where the server process has write permissions. Exported files will be saved here.

5.  **Build the Project:**
    ```bash
    npm run build
    ```

6.  **Run the Server:**
    ```bash
    npm start
    ```
    The server will connect via Stdio.

## Usage Examples

An LLM assistant (like Claude) can use the tools provided by this server based on natural language prompts. The assistant will typically identify the correct tool and extract the necessary parameters from the user's request.

-   **User:** "Show my last 5 activities."
    -   **LLM Action:** Calls `get-recent-activities` with `perPage: 5`.
-   **User:** "What was my average heart rate on activity 987654321?"
    -   **LLM Action:** Calls `get-activity-details` with `activityId: 987654321`. (The LLM would then parse the response to answer the specific question).
-   **User:** "Find cycling segments near 40.01,-105.27,40.03,-105.25 that are Cat 4 or harder."
    -   **LLM Action:** Calls `explore-segments` with `bounds: "40.01,-105.27,40.03,-105.25"`, `activityType: "riding"`, `maxCat: 4`.
-   **User:** "Save route 12345 as a GPX file."
    -   **LLM Action:** Calls `export-route-gpx` with `routeId: 12345`. (Requires `ROUTE_EXPORT_PATH` to be configured).

## API Reference

The server exposes the following MCP tools:

---

### `get-recent-activities`

Fetches the authenticated user's recent activities.

-   **When to use:** When the user asks about their recent workouts, activities, runs, rides, etc.
-   **Parameters:**
    -   `perPage` (optional):
        -   Type: `number`
        -   Description: Number of activities to retrieve.
        -   Default: 30
-   **Output:** Formatted text list of recent activities (Name, ID, Distance, Date).
-   **Errors:** Missing/invalid token, Strava API errors.

---

### `get-athlete-profile`

Fetches the profile information for the authenticated athlete.

-   **When to use:** When the user asks for their profile details, username, location, weight, premium status, etc.
-   **Parameters:** None
-   **Output:** Formatted text string with profile details.
-   **Errors:** Missing/invalid token, Strava API errors.

---

### `get-athlete-stats`

Fetches activity statistics (recent, YTD, all-time) for the authenticated athlete.

-   **When to use:** When the user asks for their overall statistics, totals for runs/rides/swims, personal records (longest ride, biggest climb).
-   **Parameters:** None
-   **Output:** Formatted text summary of stats, respecting user's measurement preference.
-   **Errors:** Missing/invalid token, Strava API errors.

---

### `get-activity-details`

Fetches detailed information about a specific activity using its ID.

-   **When to use:** When the user asks for details about a *specific* activity identified by its ID.
-   **Parameters:**
    -   `activityId` (required):
        -   Type: `number`
        -   Description: The unique identifier of the activity.
-   **Output:** Formatted text string with detailed activity information (type, date, distance, time, speed, HR, power, gear, etc.), respecting user's measurement preference.
-   **Errors:** Missing/invalid token, Invalid `activityId`, Strava API errors.

---

### `list-athlete-clubs`

Lists the clubs the authenticated athlete is a member of.

-   **When to use:** When the user asks about the clubs they have joined.
-   **Parameters:** None
-   **Output:** Formatted text list of clubs (Name, ID, Sport, Members, Location).
-   **Errors:** Missing/invalid token, Strava API errors.

---

### `list-starred-segments`

Lists the segments starred by the authenticated athlete.

-   **When to use:** When the user asks about their starred or favorite segments.
-   **Parameters:** None
-   **Output:** Formatted text list of starred segments (Name, ID, Type, Distance, Grade, Location).
-   **Errors:** Missing/invalid token, Strava API errors.

---

### `get-segment`

Fetches detailed information about a specific segment using its ID.

-   **When to use:** When the user asks for details about a *specific* segment identified by its ID.
-   **Parameters:**
    -   `segmentId` (required):
        -   Type: `number`
        -   Description: The unique identifier of the segment.
-   **Output:** Formatted text string with detailed segment information (distance, grade, elevation, location, stars, efforts, etc.), respecting user's measurement preference.
-   **Errors:** Missing/invalid token, Invalid `segmentId`, Strava API errors.

---

### `explore-segments`

Searches for popular segments within a given geographical area (bounding box).

-   **When to use:** When the user wants to find or discover segments in a specific geographic area, optionally filtering by activity type or climb category.
-   **Parameters:**
    -   `bounds` (required):
        -   Type: `string`
        -   Description: Comma-separated: `south_west_lat,south_west_lng,north_east_lat,north_east_lng`.
    -   `activityType` (optional):
        -   Type: `string` (`"running"` or `"riding"`)
        -   Description: Filter by activity type.
    -   `minCat` (optional):
        -   Type: `number` (0-5)
        -   Description: Minimum climb category. Requires `activityType: 'riding'`.
    -   `maxCat` (optional):
        -   Type: `number` (0-5)
        -   Description: Maximum climb category. Requires `activityType: 'riding'`.
-   **Output:** Formatted text list of found segments (Name, ID, Climb Cat, Distance, Grade, Elevation).
-   **Errors:** Missing/invalid token, Invalid `bounds` format, Invalid filter combination, Strava API errors.

---

### `star-segment`

Stars or unstars a specific segment for the authenticated athlete.

-   **When to use:** When the user explicitly asks to star, favorite, unstar, or unfavorite a specific segment identified by its ID.
-   **Parameters:**
    -   `segmentId` (required):
        -   Type: `number`
        -   Description: The unique identifier of the segment.
    -   `starred` (required):
        -   Type: `boolean`
        -   Description: `true` to star, `false` to unstar.
-   **Output:** Success message confirming the action and the segment's new starred status.
-   **Errors:** Missing/invalid token, Invalid `segmentId`, Strava API errors (e.g., segment not found, rate limit).

---

### `get-segment-effort`

Fetches detailed information about a specific segment effort using its ID.

-   **When to use:** When the user asks for details about a *specific* segment effort identified by its ID.
-   **Parameters:**
    -   `effortId` (required):
        -   Type: `number`
        -   Description: The unique identifier of the segment effort.
-   **Output:** Formatted text string with detailed effort information (segment name, activity ID, time, distance, HR, power, rank, etc.).
-   **Errors:** Missing/invalid token, Invalid `effortId`, Strava API errors.

---

### `list-segment-efforts`

Lists the authenticated athlete's efforts on a given segment, optionally filtered by date.

-   **When to use:** When the user asks to list their efforts or attempts on a specific segment, possibly within a date range.
-   **Parameters:**
    -   `segmentId` (required):
        -   Type: `number`
        -   Description: The ID of the segment.
    -   `startDateLocal` (optional):
        -   Type: `string` (ISO 8601 format)
        -   Description: Filter efforts starting after this date-time.
    -   `endDateLocal` (optional):
        -   Type: `string` (ISO 8601 format)
        -   Description: Filter efforts ending before this date-time.
    -   `perPage` (optional):
        -   Type: `number`
        -   Description: Number of results per page.
        -   Default: 30
-   **Output:** Formatted text list of matching segment efforts.
-   **Errors:** Missing/invalid token, Invalid `segmentId`, Invalid date format, Strava API errors.

---

### `list-athlete-routes`

Lists the routes created by the authenticated athlete.

-   **When to use:** When the user asks to see the routes they have created or saved.
-   **Parameters:**
    -   `page` (optional):
        -   Type: `number`
        -   Description: Page number for pagination.
    -   `perPage` (optional):
        -   Type: `number`
        -   Description: Number of routes per page.
        -   Default: 30
-   **Output:** Formatted text list of routes (Name, ID, Type, Distance, Elevation, Date).
-   **Errors:** Missing/invalid token, Strava API errors.

---

### `get-route`

Fetches detailed information for a specific route using its ID.

-   **When to use:** When the user asks for details about a *specific* route identified by its ID.
-   **Parameters:**
    -   `routeId` (required):
        -   Type: `number`
        -   Description: The unique identifier of the route.
-   **Output:** Formatted text string with route details (Name, ID, Type, Distance, Elevation, Est. Time, Description, Segment Count).
-   **Errors:** Missing/invalid token, Invalid `routeId`, Strava API errors.

---

### `export-route-gpx`

Exports a specific route in GPX format and saves it locally.

-   **When to use:** When the user explicitly asks to export or save a specific route as a GPX file.
-   **Prerequisite:** The `ROUTE_EXPORT_PATH` environment variable must be correctly configured on the server.
-   **Parameters:**
    -   `routeId` (required):
        -   Type: `number`
        -   Description: The unique identifier of the route.
-   **Output:** Success message indicating the save location, or an error message.
-   **Errors:** Missing/invalid token, Missing/invalid `ROUTE_EXPORT_PATH`, File system errors (permissions, disk space), Invalid `routeId`, Strava API errors.

---

### `export-route-tcx`

Exports a specific route in TCX format and saves it locally.

-   **When to use:** When the user explicitly asks to export or save a specific route as a TCX file.
-   **Prerequisite:** The `ROUTE_EXPORT_PATH` environment variable must be correctly configured on the server.
-   **Parameters:**
    -   `routeId` (required):
        -   Type: `number`
        -   Description: The unique identifier of the route.
-   **Output:** Success message indicating the save location, or an error message.
-   **Errors:** Missing/invalid token, Missing/invalid `ROUTE_EXPORT_PATH`, File system errors (permissions, disk space), Invalid `routeId`, Strava API errors.

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. (Assuming MIT, update if different)

## Acknowledgments

-   Strava for providing the public API.
-   The Model Context Protocol (MCP) community. 