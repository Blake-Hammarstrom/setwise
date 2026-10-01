# Deployment
- **Render static site:** build `npm run build`, publish `dist`, auto-deploy from `main`. $0, no server, no environment variables.
- **CI:** unit tests, then the exhaustive generator verification (G1, G3–G6 must stay met), then the build.
- **No data leaves the device:** CSP `connect-src 'none'`. Export and import JSON is the only way data moves.
