# Real Estate Assistant Chatbot

A full-stack conversational web app for real estate data collection and geospatial matching. Built with Next.js 15, TypeScript, Tailwind CSS, and **PostgreSQL via Prisma ORM**. Styled to match the ChatGPT UI.

---

## Features

### Owner Flow
- Lists a property for **sale** or **rent**
- Collects: address (Google Maps validated), asking price / monthly rent, build year, size (sqm), rooms, bathrooms, parking
- All numeric fields validated and stored as proper types (`Float`, `Int`)
- After saving, displays all listed properties and restarts the loop

### Customer Flow
- Searches for a property to **buy** or **rent**
- Collects: target location (Google Maps validated), max budget, min size (sqm), min rooms, search radius (1 / 2 / 5 km)
- Runs a **Haversine geospatial radius query** against all matching owner listings
- Returns matched properties with address, price, and room count
- After results, restarts the loop

### Address Validation
- Calls Google Maps Geocoding API via a backend proxy
- Extracts `formatted_address`, `lat`, `lng` — stored as separate columns
- **Mock fallback**: if `GOOGLE_MAPS_API_KEY` is missing, accepts any non-empty string and generates deterministic mock coordinates — prototype works without an API key

### UX
- ChatGPT-style dark UI: scrolling message window, sticky input bar, quick-reply chips
- Inline bold markdown rendering (`**text**`)
- Input validation with inline retry — never advances on bad data
- Continuous loop — no page refresh needed between sessions

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15 App Router, React, Tailwind CSS |
| Backend | Next.js API Routes (Node.js) |
| Database | **PostgreSQL** (hosted on Supabase) |
| ORM | **Prisma v7** with `@prisma/adapter-pg` |
| Geospatial | Haversine formula (JS — upgradeable to PostGIS) |
| Address | Google Maps Geocoding API |

---

## Project Structure

```
real-estate-chatbot/
├── app/
│   ├── page.tsx                       # Chat UI + state machine
│   ├── layout.tsx                     # Root layout
│   └── api/
│       ├── validate-address/route.ts  # Google Maps proxy + mock fallback
│       ├── save-property/route.ts     # Save owner listing
│       ├── save-preference/route.ts   # Save customer + run matching
│       └── properties/route.ts        # GET all properties
├── lib/
│   ├── prisma.ts                      # Prisma singleton client
│   ├── repository.ts                  # Decoupled data layer (swap DB here)
│   ├── haversine.ts                   # Geospatial distance formula
│   └── generated/prisma/             # Auto-generated Prisma client (gitignored)
├── prisma/
│   └── schema.prisma                  # DB schema — Property + Preference models
├── prisma.config.ts                   # Prisma v7 config (datasource URL)
└── .env.local                         # Secrets — never committed
```

---

## Database Schema

### Property
| Column | Type | Description |
|---|---|---|
| id | String (UUID) | Primary key |
| intent | String | `"sell"` or `"rent"` |
| address | String | Google-formatted address |
| lat / lng | Float | Coordinates |
| priceExpectation | Float | Asking price or monthly rent |
| buildYear | Int | e.g. 2010 |
| sizeSqm | Float | Size in square metres |
| rooms | Int | Number of rooms |
| baths | Int | Number of bathrooms |
| parking | Int | Parking spaces |
| createdAt | DateTime | Auto-set |

### Preference
| Column | Type | Description |
|---|---|---|
| id | String (UUID) | Primary key |
| intent | String | `"buy"` or `"rent"` |
| targetLocation | String | Google-formatted location |
| lat / lng | Float | Coordinates |
| maxBudget | Float | Max price or monthly rent |
| minSizeSqm | Float | Minimum size in sqm |
| minRooms | Int | Minimum rooms |
| searchRadiusKm | Int | 1, 2, or 5 |
| createdAt | DateTime | Auto-set |

---

## Setup

### 1. Install dependencies
```bash
npm install
# This also runs `prisma generate` automatically via postinstall
```

### 2. Create a Supabase project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Go to **Settings → Database → Connection string → URI**
3. Copy the connection string (use port **6543** — Transaction mode for serverless)

### 3. Configure environment
Create `.env.local` in the project root:
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true&connection_limit=1"
GOOGLE_MAPS_API_KEY=your_key_here   # optional
```

### 4. Push schema to database
```bash
npm run db:push
# Creates the Property and Preference tables in your Supabase DB
```

### 5. Run dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Useful Commands

| Command | What it does |
|---|---|
| `npm run db:push` | Push schema changes to DB (no migration files) |
| `npm run db:migrate` | Create a named migration file + apply |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | **Yes** | PostgreSQL connection string (Supabase recommended) |
| `GOOGLE_MAPS_API_KEY` | No | Maps Geocoding API key — mock fallback used if empty |
