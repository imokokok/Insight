# Repository collaboration rules

## Local Vercel access

- The user authorized reuse of the saved Vercel credential in future tasks. Load `VERCEL_TOKEN` from the Git-ignored `.env.vercel.local` in this repository; do not ask the user to supply it again while it remains valid.
- This private file also holds the verified `VERCEL_TEAM_ID` and `VERCEL_PROJECT_ID` when available. On the user's workstation its path is `/Users/imokokok/Documents/insight/.env.vercel.local`.
- For Node commands, use `--env-file=.env.vercel.local`; API tools should load the credential privately and use the Authorization header. Keep the file mode at `0600`.
- Never print the credential, put it in tracked files, expose it to browser code, or add it to application runtime variables.
- The deployment workflow uses the repository's GitHub Actions secret named `VERCEL_TOKEN`. Keep that secret in sync when the user requests credential replacement; changing it alone must not trigger a deployment.
- Reusing a credential does not authorize unrelated deployments or account changes. If authentication fails, report the failure and request a replacement only when needed.
