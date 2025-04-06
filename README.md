# Strava MCP Server

This project implements a Model Context Protocol (MCP) server in TypeScript that acts as a bridge to the Strava API. It exposes Strava data and functionalities as "tools" that Large Language Models (LLMs) can utilize through the MCP standard.

## Overview

The primary goal is to allow LLM-powered applications (like AI assistants or chatbots) to access Strava information programmatically by calling the tools defined in this server.

Currently, the server provides the following tool:

-   **`get-recent-activities`**: Fetches a list of the authenticated user's most recent activities from Strava.

## How it Works

1.  **MCP Server:** Built using the [`@modelcontextprotocol/sdk`](https://www.npmjs.com/package/@modelcontextprotocol/sdk).
2.  **Strava API Client:** Uses `axios` to make requests to the official Strava V3 API (`https://developers.strava.com/docs/reference/`).
3.  **Input Validation:** Leverages `zod` for robust validation of tool inputs.
4.  **Transport:** Currently uses `StdioServerTransport` for communication over standard input/output, suitable for direct integration or simple testing.
5.  **Configuration:** Reads the necessary Strava API access token from a `.env` file using `dotenv`.

## Available Tools

### `get-recent-activities`

Fetches the authenticated user's recent activities.

-   **Input Parameter:**
    -   `perPage` (optional, number): The number of activities to retrieve. Defaults to 30 if not specified.
-   **Output:** A formatted text string listing the recent activities, including name, distance, and date.

#### Example Natural Language Queries for LLMs

An LLM could trigger this tool based on user prompts like:

-   "Show me my recent Strava activities."
-   "What were my last 5 workouts on Strava?" (LLM would translate this to call the tool with `perPage: 5`)
-   "List my Strava activities."
-   "Can you get my latest runs from Strava?"

### `get-athlete-profile`

Fetches the profile information for the authenticated athlete.

-   **Input Parameters:** None
-   **Output:** A formatted text string containing key details from the athlete's profile, such as name, username, location, weight, premium status, and join date.

#### Example Natural Language Queries for LLMs

-   "Get my Strava profile info."
-   "Show me my Strava profile."
-   "What information is in my Strava profile?"
-   "Am I a premium member on Strava?"

### `get-athlete-stats`

Fetches the activity statistics (recent, YTD, all-time totals for rides, runs, swims, and records) for the authenticated athlete.

-   **Input Parameters:** None
-   **Output:** A formatted text string summarizing the athlete's stats, including counts, distances, times, and elevation gain for different activity types and periods. Respects the athlete's measurement preference (imperial/metric).

#### Example Natural Language Queries for LLMs

-   "Show my Strava stats."
-   "What are my running stats for this year?"
-   "Get my all-time ride totals from Strava."
-   "What's my longest ride distance?"

### `get-activity-details`

Fetches detailed information for a specific activity using its ID.

-   **Input Parameters:**
    -   `activityId` (required, number): The unique identifier of the activity to fetch details for.
-   **Output:** A formatted text string containing detailed information about the activity, such as name, type, date, description, distance, time, elevation, speed, heart rate (if available), calories, gear, device, etc. Respects the athlete's measurement preference.

#### Example Natural Language Queries for LLMs

-   "Get the details for activity 1234567890."
-   "Show me the info for my run with ID 987654321."
-   "What was the average speed for activity 12345?"
-   "Tell me more about activity 98765."

### `list-athlete-clubs`

Lists the clubs that the authenticated athlete is currently a member of.

-   **Input Parameters:** None
-   **Output:** A formatted text list of the athlete's clubs, including name, sport type, member count, location, and privacy status.

#### Example Natural Language Queries for LLMs

-   "What Strava clubs am I in?"
-   "List my clubs on Strava."
-   "Show me the clubs I've joined."

### `list-starred-segments`

Lists the segments that the authenticated athlete has starred.

-   **Input Parameters:** None
-   **Output:** A formatted text list of starred segments, including name, ID, activity type, distance, average grade, and location.

#### Example Natural Language Queries for LLMs

-   "Show me my starred segments."
-   "List the segments I starred on Strava."
-   "What are my favorite segments?"

### `get-segment`

Fetches detailed information for a specific segment using its ID.

-   **Input Parameters:**
    -   `segmentId` (required, number): The unique identifier of the segment to fetch.
-   **Output:** A formatted text string containing detailed segment information, including name, distance, grade, elevation, location, star count, effort count, etc. Respects the athlete's measurement preference.

#### Example Natural Language Queries for LLMs

-   "Get details for segment 12345."
-   "Show me the info for segment 987654."
-   "What is the average grade of segment 123?"

### `explore-segments`

Searches for popular segments within a given geographical area (bounding box).

-   **Input Parameters:**
    -   `bounds` (required, string): A comma-separated string of `south_west_lat,south_west_lng,north_east_lat,north_east_lng`.
    -   `activityType` (optional, string): Filter by activity type (`running` or `riding`).
    -   `minCat` (optional, number): Minimum climb category (0-5). Requires `activityType: 'riding'`.
    -   `maxCat` (optional, number): Maximum climb category (0-5). Requires `activityType: 'riding'`.
-   **Output:** A formatted text list of segments found within the bounds, matching the filters, including name, ID, climb category, distance, grade, and elevation difference.

#### Example Natural Language Queries for LLMs

-   "Explore running segments near [specific location coordinates]."
-   "Find popular cycling segments within the bounds 37.8,-122.5,37.9,-122.4."
-   "Search for Cat 3 or Cat 4 climbs around [coordinates]."

### `star-segment`

Stars or unstars a specific segment for the authenticated athlete.

-   **Input Parameters:**
    -   `segmentId` (required, number): The unique identifier of the segment to star/unstar.
    -   `starred` (required, boolean): Set to `true` to star the segment, `false` to unstar it.
-   **Output:** A success message confirming the action and the segment's new starred status.

#### Example Natural Language Queries for LLMs

-   "Star segment 12345 for me."
-   "Add segment 98765 to my favorites."
-   "Unstar segment 54321."
-   "Remove segment 11223 from my starred segments."

### `get-segment-effort`

Fetches detailed information for a specific segment effort using its ID.

-   **Input Parameters:**
    -   `effortId` (required, number): The unique identifier of the segment effort to fetch.
-   **Output:** A formatted text string containing detailed segment effort information, including segment name, activity ID, elapsed/moving time, distance, heart rate, power, KOM/PR ranks, etc.

#### Example Natural Language Queries for LLMs

-   "Get details for segment effort 1234567890123."
-   "Show me the info for effort ID 9876543210987."
-   "What was my time on segment effort 1122334455?"

### `list-segment-efforts`

Lists the authenticated athlete's efforts on a given segment, optionally filtered by date.

-   **Input Parameters:**
    -   `segmentId` (required, number): The ID of the segment for which to list efforts.
    -   `startDateLocal` (optional, string): Filter efforts starting after this ISO 8601 date-time.
    -   `endDateLocal` (optional, string): Filter efforts ending before this ISO 8601 date-time.
    -   `perPage` (optional, number): Number of results per page (default 30).
-   **Output:** A formatted text list of matching segment efforts, including time, distance, date, and PR/KOM rank info.

#### Example Natural Language Queries for LLMs

-   "List my efforts on segment 12345."
-   "Show my efforts on segment 987654 after January 1st, 2023."
-   "Get my 5 most recent efforts for segment 112233."

## Setup and Usage

### 1. Prerequisites

-   Node.js (v18 or later recommended)
-   npm (usually comes with Node.js)
-   A Strava Account

### 2. Obtain Strava Access Token

This server requires a Strava API access token to authenticate requests.

1.  Go to your Strava API Settings page: [https://www.strava.com/settings/api](https://www.strava.com/settings/api)
2.  If you haven't created an API application yet, do so. You can fill in basic details (name, website, etc.). The specifics aren't critical for just getting your personal token.
3.  On the API settings page, find the section titled **"Your Access Token"**. Copy this token.

### 3. Configure Environment Variables

1.  This project uses a `.env` file to store the access token.
2.  There should be a `.env` file in the project root (if not, you can duplicate `.gitignore`'d `.env.example` if one exists, or create it).
3.  Open the `.env` file and add your access token:

    ```dotenv
    # Strava API Access Token
    # Get yours from https://www.strava.com/settings/api
    STRAVA_ACCESS_TOKEN=YOUR_COPIED_ACCESS_TOKEN_HERE
    ```

    **Important:** Replace `YOUR_COPIED_ACCESS_TOKEN_HERE` with the actual token you copied from the Strava settings page.

### 4. Install Dependencies

Navigate to the project's root directory in your terminal and run:

```bash
npm install
```

### 5. Running the Server

-   **Development Mode:** For development, use `tsx` which compiles and runs TypeScript on the fly. This allows for faster iteration without a separate build step.

    ```bash
    npm run dev
    ```

    The server will start, and diagnostic messages will be printed to `stderr`. It will listen for MCP requests on `stdin` and send responses to `stdout`.

-   **Production Mode:** First, build the JavaScript code:

    ```bash
    npm run build
    ```

    Then, run the compiled JavaScript using Node.js:

    ```bash
    npm start
    ```

## Project Structure

```
.
├── .env                # Stores environment variables (like API keys) - **DO NOT COMMIT**
├── .gitignore          # Specifies intentionally untracked files that Git should ignore
├── package.json        # Node.js project metadata and dependencies
├── package-lock.json   # Records exact versions of dependencies
├── README.md           # This file
├── src/
│   ├── server.ts       # Main MCP server logic, tool registration
│   └── stravaClient.ts # Axios wrapper for Strava API calls
├── tsconfig.json       # TypeScript compiler options
└── dist/               # Compiled JavaScript output (after running npm run build)
```

## Next Steps / Future Enhancements

-   Add more Strava API tools (e.g., `get-athlete-profile`, `get-activity-details`).
-   Implement different MCP transports (e.g., HTTP/SSE using Express for web-based interactions).
-   Add more sophisticated error handling and logging.
-   Implement OAuth 2.0 flow for user authentication instead of a static token.
-   Define MCP Resources for static or summarized data. 