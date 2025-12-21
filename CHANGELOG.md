# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Fixed
- Fix `get-all-activities` filtering by `activityTypes` by preserving `type` and `sport_type` fields from the Strava `athlete/activities` response schema.

### Added
- Add Vitest test runner and regression tests for `get-all-activities` filtering and schema preservation.
- Add a stdio-based MCP smoke test script to validate tool behavior against the built `dist/server.js`.
