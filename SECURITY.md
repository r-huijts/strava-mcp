# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | Yes       |

## Reporting a Vulnerability

Please do **not** open a public issue for security vulnerabilities.

Report them by opening a [GitHub Security Advisory](../../security/advisories/new) or by contacting the maintainer directly via their GitHub profile.

Include: description, steps to reproduce, and potential impact. Expect a response within 72 hours.

## Token Security

This project uses OAuth tokens to authenticate with the Strava API.

- Never hardcode tokens in source files or config files
- Store secrets as environment variables or in `~/.config/strava-mcp/config.json` (user-only permissions)
- The config file is excluded from version control via `.gitignore`
- Never commit `.env` files containing real credentials

## Sensitive Files

The following files may contain credentials and must never be committed:

- `.env`
- `strava_tokens.json`
- `~/.config/strava-mcp/config.json` (stored outside the repo by design)
