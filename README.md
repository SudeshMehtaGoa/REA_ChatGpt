# Real Estate Assistant Chatbot

A full-stack conversational web app for real estate data collection and geospatial matching. Built with Next.js 15, TypeScript, and Tailwind CSS. Styled to match the ChatGPT UI.

---

## Features

### Owner Flow
- Lists a property for **sale** or **rent**
- Collects: address (Google Maps validated), asking price / monthly rent, build year, size (sqm), rooms, bathrooms, parking
- All numeric fields validated and stored as proper types (int / float)
- After saving, displays all listed properties and restarts the loop

### Customer Flow
- Searches for a property to **buy** or **rent**
- Collects: target location (Google Maps validated), max budget, min size (sqm), min rooms, search radius (1 / 2 / 5 km)
- Runs a **Haversine geospatial radius query** against all matching owner listings
- Returns matched properties with address, price, and room count
- After results, restarts the loop

### Address Validation
- Calls Google Maps Geocoding API via a backend proxy
- Extracts `formatted_address`, `lat`, `lng` — stores coordinates silently
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
| Data | `data.json` via Repository pattern (swap-ready for PostgreSQL / MongoDB) |
| Geospatial | Haversine formula (pure JS, no DB extension needed) |
| Address | Google Maps Geocoding API |
| IDs | `uuid` v4 |

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
│   ├── repository.ts                  # Decoupled data layer
│   └── haversine.ts                   # Distance formula
├── data.json                          # Live JSON data store
└── .env.local                         # API keys (gitignored)
```

---

## Data Schema

### Property (Owner)
```json
{
  "id": "uuid",
  "userType": "owner",
  "intent": "sell | rent",
  "address": "formatted string",
  "coordinates": { "lat": 47.37, "lng": 8.54 },
  "priceExpectation": 850000,
  "buildYear": 2010,
  "sizeSqm": 120,
  "rooms": 3,
  "baths": 2,
  "parking": 1,
  "createdAt": "ISO string"
}
```

### Preference (Customer)
```json
{
  "id": "uuid",
  "userType": "customer",
  "intent": "buy | rent",
  "targetLocation": "formatted string",
  "coordinates": { "lat": 47.37, "lng": 8.54 },
  "maxBudget": 900000,
  "minSizeSqm": 80,
  "minRooms": 2,
  "searchRadiusKm": 5,
  "createdAt": "ISO string"
}
```

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create environment file (optional)
# Add your Google Maps API key — mock fallback works without it
echo "GOOGLE_MAPS_API_KEY=your_key_here" > .env.local

# 3. Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_MAPS_API_KEY` | No | Google Maps Geocoding API key. If omitted, mock validation is used. |
