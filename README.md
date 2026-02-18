# vercel-cron-runner

Runs [Vercel cron jobs](https://vercel.com/docs/cron-jobs) for self-hosted Next.js apps. Reads the `vercel.json` in your project and triggers cron endpoints on schedule.

## Install

```bash
npm install vercel-cron-runner
```

## Usage

```bash
BASE_URL=http://localhost:3000 npx vercel-cron-runner
```

The runner reads `vercel.json` from the current working directory and schedules HTTP requests to your app based on the `crons` config.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `BASE_URL` | Yes | Base URL of your app (e.g. `http://localhost:3000`) |
| `CRON_SECRET` | No | Sent as `Authorization: Bearer <secret>` header |
| `CONFIG_PATH` | No | Path to directory containing `vercel.json` (defaults to cwd) |

### Local development

Run cron jobs locally alongside your dev server:

```bash
BASE_URL=http://localhost:3000 npx vercel-cron-runner
```

### Example `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/sync",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cleanup",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Docker

Run alongside your Next.js app in a container:

```dockerfile
CMD ["sh", "-c", "node server.js & npx vercel-cron-runner"]
```

## License

MIT
