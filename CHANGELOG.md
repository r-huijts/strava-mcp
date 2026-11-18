# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Fixed
- Fix `get-all-activities` filtering by `activityTypes` by preserving `type` and `sport_type` fields from the Strava `athlete/activities` response schema.
- Handle Strava's 64-bit Activity and Athlete identifiers (effective June 1, 2027). IDs are now read from `id_str` and shown exactly instead of as a rounded JavaScript number, and tools that take an activity or athlete ID accept it as a string. A numeric ID beyond the safe integer range is rejected with a message asking for a string, rather than silently querying the wrong object.
- Show route IDs from `id_str` in `list-athlete-routes` and `get-route` so they can be passed back exactly.

### Added
- Add Vitest test runner and regression tests for `get-all-activities` filtering and schema preservation.
- Add a stdio-based MCP smoke test script to validate tool behavior against the built `dist/server.js`.
- Add `perceived_exertion` data in activity detailed model.
