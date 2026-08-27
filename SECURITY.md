# Security Policy

## Supported versions

GreenMiles is a **demo / proof-of-concept**. It is not intended for production
use, and no production security support is provided. Only the latest commit on
`master` receives attention.

## Known limitations (by design, for a demo)

- Simplified carbon-calculation factors, not an official methodology
- Seeded test account and local SQLite file storage
- No real payment integration, rate limiting, or account recovery flows

## Reporting a vulnerability

If you find a security issue that would matter to someone deploying this demo
publicly (e.g. auth bypass, injection), please open a private security advisory
via GitHub's **Report a vulnerability** option, or contact the maintainer
directly. Please avoid opening a public issue for vulnerabilities.
