# Bin Collection Reminder App

A Next.js application that sends automated WhatsApp reminders for bin collection schedules using GreenAPI. Features rotation scheduling, web interface, and MongoDB Atlas integration.

## Features

- 📱 WhatsApp notifications via GreenAPI
- 🔄 Automatic tenant rotation for notifications
- 📅 Smart schedule detection (odd/even weeks)
- 🎨 Modern web interface for management
- 📊 Notification logging and history

## Prerequisites

- Node.js 18+ and npm
- MongoDB Atlas account (free tier works)
- GreenAPI account with instance ID and token

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Copy `.env.example` to `.env.local` and fill in your values:
   ```bash
   cp .env.example .env.local
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **First-time setup:**
   - Open http://localhost:3000
   - Go to Tenants page → Add Tenant (use your WhatsApp group chat ID, format: `123456789@g.us`)
   - Go to Schedule page → Configure collection day, times, and rotation → Save

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GREEN_API_URL` | GreenAPI base URL (e.g. `https://your-instance.api.greenapi.com`) |
| `GREEN_API_ID` | GreenAPI instance ID |
| `GREEN_API_TOKEN` | GreenAPI API token |
| `GREEN_API_GROUP_CHAT_ID` | WhatsApp group chat ID (format: `123456789@g.us`) |
| `MONGODB_URI` | MongoDB connection string |
| `CRON_SECRET` | Secret for external cron auth (use a secure random string) |
| `ADMIN_PASSWORD` | Password for tenant/schedule admin pages |
| `ENABLE_SCHEDULER` | Set to `true` to use in-process scheduler, or use external cron |

## Cron Jobs (Required)

The app needs **two external cron jobs** (e.g. [cron-job.org](https://cron-job.org)):

| Job | URL | Schedule (cron) |
|-----|-----|-----------------|
| Put Bins Out | `https://your-app-url/api/cron?secret=YOUR_CRON_SECRET&type=put-out` | `0 17 * * 1` (Monday 5 PM) |
| Bring Bins In | `https://your-app-url/api/cron?secret=YOUR_CRON_SECRET&type=bring-in` | `0 17 * * 2` (Tuesday 5 PM) |

> **Note:** Scheduler is disabled by default. Use external cron as the primary mechanism. Never share your `CRON_SECRET` publicly.

## Schedule Pattern

- **Collection Day:** Tuesday (every week)
- **Odd weeks:** Paper/Card + Glass/Cans/Plastics
- **Even weeks:** General Waste only

Notifications are sent on Monday evening (put-out) and Tuesday evening (bring-in).

## Deployment (Hostinger)

1. **Build:** `npm run build`
2. **Deploy:** Hostinger hPanel → Websites → Node.js Apps → Import Git or upload files
3. **Configure:** Set all environment variables in Hostinger dashboard (not in `.env.local`)
4. **Cron:** Add the two cron jobs above pointing to your deployed URL
5. **Start command:** `npm start`

**Hostinger tips:**
- Application root must point to the directory containing `server.js`
- If you see ENOENT for `server.js`, check the Node.js app root path in hPanel
- Add MongoDB Atlas IP whitelist for Hostinger server IPs

## API Endpoints

- `GET /api/tenants` - Get all tenants
- `POST /api/tenants` - Create tenant
- `PUT /api/tenants/[id]` - Update tenant
- `DELETE /api/tenants/[id]` - Delete tenant
- `GET /api/schedule` - Get schedule
- `POST /api/schedule` - Update schedule
- `GET /api/notifications` - Notification history
- `GET /api/cron?secret=...&type=put-out|bring-in` - External cron endpoint

## License

MIT
