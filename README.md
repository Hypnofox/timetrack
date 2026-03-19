# Faddom Support Time Tracker

Internal time tracking tool for the Faddom 4-person B2B SaaS support team. Log and report on time spent across all work types — not just tickets.

## Features

- **Live Timer** — start/pause/resume with a drift-free wall-clock timer
- **Manual Entry** — log past time with date and duration in minutes
- **Entries View** — filterable table with CSV export
- **Report View** — stat cards + Chart.js visualizations (by category, team member, customer, weekly trend)
- **Admin role** — Egor sees all users' data; others see only their own
- **Dark theme** — IBM Plex Sans + IBM Plex Mono

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+

## Installation

Install dependencies for both the server and client:

```bash
# Server dependencies
cd server
npm install

# Client dependencies
cd ../client
npm install
```

## Running in Development

You need two terminal windows (or use a process manager like `concurrently`).

**Terminal 1 — Backend (Express + SQLite):**
```bash
cd server
npm run dev       # uses nodemon, auto-restarts on changes
```
Server runs at: `http://localhost:3001`

**Terminal 2 — Frontend (Vite dev server):**
```bash
cd client
npm run dev
```
Frontend runs at: `http://localhost:5173` and proxies `/api/*` to the backend.

## Running in Production

1. **Build the frontend:**
   ```bash
   cd client
   npm run build
   ```
   This creates `client/dist/`.

2. **Serve everything via Express:**
   ```bash
   cd server
   node index.js        # or: npm start
   ```
   The Express server serves the built frontend from `client/dist/` at `http://localhost:3001`.
   Set `PORT` environment variable to change the port:
   ```bash
   PORT=8080 node index.js
   ```

## SQLite Database

- **File location:** `server/data/timetracker.db`
- Created automatically on first run; the `server/data/` directory is created if it does not exist.
- Uses WAL mode for improved concurrent read performance.
- To reset all data, simply delete `server/data/timetracker.db` and restart the server.

## Project Structure

```
faddom-time-tracker/
├── client/                     # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── CategoryBadge.jsx
│   │   │   ├── Entries.jsx
│   │   │   ├── LogTime.jsx
│   │   │   ├── Report.jsx
│   │   │   ├── TabNav.jsx
│   │   │   └── UserSelector.jsx
│   │   ├── styles/
│   │   │   └── global.css
│   │   ├── api.js              # fetch wrappers for backend API
│   │   ├── App.jsx
│   │   ├── constants.js        # users, categories, color maps
│   │   ├── main.jsx
│   │   └── utils.js            # formatDuration, exportCSV, etc.
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Node.js + Express backend
│   ├── data/                   # SQLite DB lives here (auto-created)
│   │   └── timetracker.db
│   ├── db.js                   # SQLite setup and migrations
│   ├── routes.js               # API route handlers
│   ├── index.js                # Express entry point
│   └── package.json
│
└── README.md
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/entries` | List entries. Query: `user`, `month` (YYYY-MM), `category` |
| `POST` | `/api/entries` | Create entry. Body: `{ user, category, customer, notes, minutes, date }` |
| `DELETE` | `/api/entries/:id` | Delete entry. Query: `user` (owner or Egor only) |
| `GET` | `/api/report/summary` | Aggregated chart data. Query: `user`, `month` |
| `GET` | `/api/users` | List of valid users |
| `GET` | `/api/categories` | List of valid categories |

## Users & Roles

| User | Role |
|------|------|
| Egor | **Admin** — sees all users' data everywhere |
| Yonatan | Standard — sees own data only |
| Mariano | Standard — sees own data only |
| Ben | Standard — sees own data only |

## Work Categories

1. Intercom Ticket
2. Debug / Lab Repro
3. Customer Call / Demo
4. Internal Meeting
5. Documentation / KB
6. Email / Async Comms
7. Escalation to Dev
