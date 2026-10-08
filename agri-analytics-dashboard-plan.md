# Agriculture Production Analytics Dashboard — Plan

## Top-Level Overview

Build a multi-role web application for agriculture production analytics, delivered in two phases.

**Phase 1 (MVP)** — A fully functional analytics dashboard using realistic mock/seed data. No external API dependencies. Five role-specific dashboard views (Farmer, Agronomist, Supply Chain Manager, Market Analyst, Admin). Simple predefined alert thresholds. CSV export only. No AI/ML. Runs fully on localhost.

**Phase 2 (Enhancements)** — External API integrations (live weather, commodity prices), advanced alert configuration, PDF reporting, and other post-MVP additions.

The MVP architecture: a **Python + FastAPI** backend serving REST + WebSocket APIs, a **React + TypeScript + Vite** frontend with role-based views, and a **SQLite** database (zero-config, file-based) seeded with 30–90 days of realistic mock agricultural data. A lightweight in-process mock data simulator replaces external IoT/weather/market feeds for Phase 1.

---

## Stack (MVP)

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite |
| UI / Charting | TailwindCSS + Recharts |
| State Management | Zustand + TanStack Query v5 |
| Real-time Client | Native browser WebSocket |
| Backend | Python 3.11 + FastAPI |
| Real-time Server | FastAPI WebSocket endpoints |
| Database | SQLite (file-based, zero-config) |
| ORM / Migrations | SQLAlchemy + Alembic |
| Auth | JWT (python-jose) + RBAC |
| Password Hashing | passlib[bcrypt] |
| Seed / Simulator | Pure Python in-process scheduler (APScheduler) |
| Dev runner | uvicorn (backend) + vite dev server (frontend) |

> **No Docker required for Phase 1.** SQLite is file-based. Backend runs on `http://localhost:8000`, frontend on `http://localhost:5173`.

---

## Constraints & Non-Goals (Phase 1 MVP)

- **No external APIs** — all data is mock/seed data generated in-process
- **No AI/ML** — no crop prediction, disease detection, or price forecasting
- **No PDF export** — deferred to Phase 2
- **No configurable alert thresholds** — predefined defaults only (hardcoded)
- **No Docker** — runs directly on localhost with Python + Node
- **No mobile app** — responsive web only
- **No multi-tenancy billing** — not in scope

---

## Demo Users (Pre-Seeded)

| Email | Password | Role |
|---|---|---|
| farmer@demo.com | demo1234 | FARMER |
| agronomist@demo.com | demo1234 | AGRONOMIST |
| supply@demo.com | demo1234 | SUPPLY_CHAIN |
| market@demo.com | demo1234 | MARKET_ANALYST |
| admin@demo.com | demo1234 | ADMIN |

---

## Phase 1 MVP — Sub-Tasks

---

### Sub-Task 1 — Project Scaffolding

**Intent**
Create the directory structure, install all dependencies, and verify both the backend and frontend start cleanly on localhost.

**Expected Outcomes**
- `/backend` — FastAPI app boots on `http://localhost:8000`, `GET /health` returns `{"status":"ok"}`
- `/frontend` — Vite + React + TypeScript + TailwindCSS boots on `http://localhost:5173`
- `backend/requirements.txt` and `frontend/package.json` fully specify all dependencies
- `.env` files in place for both projects

**Todo List**
1. Create `/backend` directory with Python virtual environment
2. Create `backend/requirements.txt`:
   - fastapi, uvicorn[standard], sqlalchemy, alembic
   - python-jose[cryptography], passlib[bcrypt]
   - apscheduler, python-multipart, pydantic[email]
3. Create `backend/main.py` — FastAPI app entry point with CORS configured for `http://localhost:5173`
4. Add `GET /health` route returning `{"status": "ok"}`
5. Create `/frontend` with `npm create vite@latest frontend -- --template react-ts`
6. Install frontend deps: `tailwindcss`, `recharts`, `zustand`, `@tanstack/react-query`, `react-router-dom`, `axios`, `papaparse`, `lucide-react`
7. Configure TailwindCSS (`tailwind.config.js`, `postcss.config.js`, import in `index.css`)
8. Verify: `uvicorn main:app --reload` boots; `npm run dev` boots

**Status** — `[ ] pending`

---

### Sub-Task 2 — Database Schema & Seed Data

**Intent**
Define the full SQLAlchemy ORM schema, run Alembic migrations, and seed the database with 90 days of realistic mock agricultural data so every dashboard has rich content on first load.

**Expected Outcomes**
- `agri.db` SQLite file created with all tables
- `python seed.py` populates: 3 farms, 12 fields, 24 crop records, 6 livestock groups, ~260k sensor readings rows (batched inserts), 90 days of market prices, 60 supply chain events, 5 demo users, 5 pre-seeded alerts
- All data is realistic and internally consistent

**Database Models**
- `User` — id, name, email, hashed_password, role, farm_id, is_active
- `Farm` — id, name, region, location_lat, location_lng
- `Field` — id, farm_id, name, area_hectares, crop_type, status
- `Crop` — id, field_id, crop_name, planting_date, harvest_date, expected_yield_kg, actual_yield_kg, growth_stage
- `Livestock` — id, farm_id, species, count, health_status, last_updated
- `SensorReading` — id, field_id, metric_type, value, recorded_at
- `WeatherSnapshot` — id, farm_id, temperature_c, humidity_pct, rainfall_mm, condition_label, recorded_at
- `MarketPrice` — id, commodity, region, price_per_unit, currency, recorded_at
- `Alert` — id, farm_id, field_id, alert_type, message, severity, triggered_at, resolved_at
- `SupplyChainEvent` — id, farm_id, event_type, commodity, quantity_kg, location, event_time

**Seed Data Spec**
- 3 farms: Northern Plains (farm_id=1), Coastal Delta (farm_id=2), Highland Valley (farm_id=3)
- 4 fields per farm, crops: wheat/maize/soybean/rice rotating across fields
- Sensor readings every 30 min for 90 days, 3 metrics per field (soil_moisture 15–80%, temperature 5–40°C, humidity 30–90%)
- Market prices daily 90 days, 4 commodities × 3 regions, realistic ranges (wheat $180–260/t, maize $150–220/t, soybean $380–480/t, rice $350–430/t), ±3% daily variation
- Growth stages enum: GERMINATION, VEGETATIVE, FLOWERING, MATURATION, HARVEST_READY
- Supply chain events: HARVESTED, TRANSPORTED, STORED, SOLD — full pipeline per commodity
- Alerts: LOW_SOIL_MOISTURE (< 20%), HIGH_TEMPERATURE (> 38°C), FROST_RISK (< 2°C), MARKET_PRICE_SPIKE (> 8% change)

**Todo List**
1. Create `backend/database.py` — SQLAlchemy engine (SQLite `agri.db`), SessionLocal, Base
2. Create `backend/models.py` — all 10 ORM models
3. Create `backend/alembic.ini` and `backend/alembic/` — run `alembic init`
4. Write initial Alembic migration (`alembic revision --autogenerate -m "initial"`)
5. Run `alembic upgrade head` to create tables
6. Write `backend/seed.py` — generates all mock data and inserts in batches
7. Verify seed: `python seed.py` completes without error, row counts match spec

**Status** — `[ ] pending`

---

### Sub-Task 3 — Authentication & RBAC

**Intent**
Implement JWT login, role-based dependency injection guards in FastAPI, and protected routes on the frontend so each user only accesses their permitted data.

**Expected Outcomes**
- `POST /auth/login` returns a JWT on valid credentials
- All protected endpoints require `Authorization: Bearer <token>`
- Five roles enforced: `FARMER`, `AGRONOMIST`, `SUPPLY_CHAIN`, `MARKET_ANALYST`, `ADMIN`
- Frontend login page stores token in localStorage, redirects to role dashboard
- Unauthenticated → `/login`; wrong role → `/unauthorized`

**Todo List**
1. Create `backend/auth.py` — JWT creation and verification using `python-jose`
2. Create `backend/deps.py` — `get_current_user` FastAPI dependency; `require_roles(*roles)` dependency factory
3. Create `backend/routers/auth.py` — `POST /auth/login` endpoint
4. Create frontend `src/store/authStore.ts` — Zustand store: `{ user, role, token, farmId, login(), logout() }`
5. Create frontend `src/api/axios.ts` — Axios instance with `Authorization` header interceptor
6. Build `src/pages/LoginPage.tsx` — email + password form; one-click demo login buttons per role
7. Create `src/components/ProtectedRoute.tsx` — redirects to `/login` if no token, `/unauthorized` if wrong role
8. Configure React Router routes with `<ProtectedRoute>` wrapping all dashboard pages

**Status** — `[ ] pending`

---

### Sub-Task 4 — Mock Data Simulator (Real-Time Feed)

**Intent**
Run an in-process APScheduler job inside FastAPI that continuously generates new sensor and market readings using a random walk algorithm, writes them to the DB, evaluates alert rules, and broadcasts to WebSocket clients — giving dashboards live-updating behaviour without any external dependencies.

**Expected Outcomes**
- Sensor readings generated every 10 seconds for all active fields
- Market prices updated every 5 minutes
- New data is written to SQLite and broadcast to all subscribed WebSocket clients
- Alert rules evaluated after each sensor tick

**Todo List**
1. Create `backend/simulator.py` — `MockSimulator` class with APScheduler
2. `sensor_tick()` method: for each active field, compute new value = `clamp(last + random.uniform(-step, step), min, max)` for each of 3 metrics; batch insert to `SensorReading`
3. `weather_tick()` method: per farm, generate new `WeatherSnapshot`
4. `market_tick()` method: per commodity+region, compute new price with ±1.5% step; insert `MarketPrice`
5. After each sensor write, call `AlertsService.evaluate(field_id, metric_type, value, farm_id)`
6. After each write, call `ws_manager.broadcast_to_farm(farm_id, event_payload)`
7. Start scheduler in FastAPI `lifespan` context manager
8. Create `backend/ws_manager.py` — `ConnectionManager` class: `connect(farm_id, ws)`, `disconnect(ws)`, `broadcast_to_farm(farm_id, data)`

**Status** — `[ ] pending`

---

### Sub-Task 5 — Backend REST API & WebSocket Endpoints

**Intent**
Expose all analytics data through typed FastAPI REST endpoints (for initial page loads and date-range queries) and WebSocket endpoints (for live updates), all role-scoped.

**Expected Outcomes**
- All REST endpoints return correct data, scoped to authenticated user's `farm_id`
- WebSocket endpoint `/ws/{farm_id}` registers and serves live events
- Date-range filtering (`?from_date=&to_date=`) works on all time-series endpoints
- `ADMIN` and `MARKET_ANALYST` bypass farm scoping

**REST Endpoints**
```
GET  /farms                          — list farms (scoped)
GET  /farms/{id}/fields              — fields for a farm
GET  /crops?field_id=                — crops for a field
GET  /crops/yield-summary?farm_id=   — yield summary
GET  /livestock?farm_id=             — livestock for a farm
GET  /sensors/readings?field_id=&metric_type=&from_date=&to_date=
GET  /weather/current?farm_id=       — latest weather snapshot
GET  /weather/history?farm_id=&from_date=&to_date=
GET  /market/prices?commodity=&region=&from_date=&to_date=
GET  /market/prices/latest           — latest price per commodity+region
GET  /supply-chain/events?farm_id=   — supply chain event log
GET  /supply-chain/summary?farm_id=  — KPI totals
GET  /alerts?farm_id=&status=        — open/resolved alerts
PATCH /alerts/{id}/resolve           — mark alert resolved
GET  /admin/users                    — all users (ADMIN only)
PATCH /admin/users/{id}              — update role / deactivate (ADMIN only)
GET  /admin/health                   — system health status
```

**WebSocket**
```
WS   /ws/{farm_id}                   — live feed for a farm room
     emits: sensor_update, weather_update, market_update, alert_new
```

**Todo List**
1. Create router files: `routers/farms.py`, `routers/crops.py`, `routers/livestock.py`, `routers/sensors.py`, `routers/weather.py`, `routers/market.py`, `routers/supply_chain.py`, `routers/alerts.py`, `routers/admin.py`
2. Create `routers/websocket.py` — `/ws/{farm_id}` endpoint using `ConnectionManager`
3. Create `backend/schemas.py` — Pydantic response models for all endpoints
4. Register all routers in `main.py`
5. Apply `require_roles()` dependency to each router appropriately

**Status** — `[ ] pending`

---

### Sub-Task 6 — Shared Frontend Shell & Navigation

**Intent**
Build the application shell (layout, sidebar, top bar, routing) that all five dashboard views live inside.

**Expected Outcomes**
- App shell with persistent sidebar (role-filtered nav links) and top bar (user name, role badge, logout)
- React Router SPA navigation — no full page reloads
- WebSocket connection opened once on login, persisted via Zustand
- `useSocket` hook subscribes to live events and merges them into TanStack Query cache

**Sidebar Navigation by Role**
- Farmer: Overview, Fields & Crops, Alerts
- Agronomist: Soil Analysis, Crop Analytics, Livestock
- Supply Chain: Harvest Forecast, Inventory, Event Log
- Market Analyst: Price Overview, Price History, Regional Prices
- Admin: Users, System Health

**Todo List**
1. Create `src/components/AppShell.tsx` — sidebar + main content layout
2. Create `src/components/Sidebar.tsx` — role-filtered nav using `authStore`
3. Create `src/components/TopBar.tsx` — farm name, user name, role badge, logout
4. Create `src/hooks/useSocket.ts` — opens `ws://localhost:8000/ws/{farmId}`, reconnects on close, exposes `onMessage(type, handler)` helper
5. Store socket in Zustand `socketStore`; all components subscribe without prop-drilling
6. Create `src/pages/UnauthorizedPage.tsx` and `src/pages/NotFoundPage.tsx`
7. Configure all routes in `src/App.tsx`

**Status** — `[ ] pending`

---

### Sub-Task 7 — Farmer Dashboard

**Intent**
Build the Farmer's real-time view: field conditions, crop stages, weather snapshot, and active alerts — all scoped to the farmer's farm.

**Key Components**
- `FieldOverviewCard` — field name, crop type, area, status chip
- `SensorGaugeWidget` — Recharts `RadialBarChart` for soil moisture + temperature with color zones
- `CropStatusCard` — crop name, growth stage progress bar, harvest date countdown
- `WeatherSnapshotWidget` — temp, humidity, rainfall condition icon
- `ActiveAlertsPanel` — severity-badged alert list with "Mark Resolved" button; updates live via WebSocket

**Todo List**
1. Create `src/pages/farmer/FarmerDashboard.tsx` — grid layout
2. Build all 5 key components listed above
3. Fetch initial data with TanStack Query (farms, fields, crops, weather, alerts)
4. Wire `SensorGaugeWidget` to `sensor_update` WebSocket events
5. Wire `ActiveAlertsPanel` to `alert_new` WebSocket events
6. Soil moisture color zones: < 20% red, 20–60% green, > 60% amber
7. Temperature color zones: < 5°C blue, 5–35°C green, > 35°C red

**Status** — `[ ] pending`

---

### Sub-Task 8 — Agronomist Dashboard

**Intent**
Build the Agronomist's analytical view: soil health trends, yield comparisons, livestock status, and field health summary across all farms.

**Key Components**
- `SoilMetricsTrendChart` — Recharts `LineChart`, multi-line per field, metric selector
- `CropYieldComparisonChart` — Recharts `BarChart`, expected vs actual yield per field
- `LivestockSummaryTable` — species, farm, count, health status badge
- `FieldHealthSummaryTable` — click-to-drill-down to field detail page

**Todo List**
1. Create `src/pages/agronomist/AgronomistDashboard.tsx` — filter bar (date range, farm, crop type)
2. Build all 4 key components
3. Date range picker → TanStack Query key changes → refetch with `?from_date=&to_date=`
4. Default range: last 30 days
5. Field drill-down: `/agronomist/field/:fieldId` — full sensor history for one field

**Status** — `[ ] pending`

---

### Sub-Task 9 — Supply Chain Dashboard

**Intent**
Build the Supply Chain Manager's view: harvest forecast pipeline, inventory level chart, event log, and monthly KPI cards. CSV export on tabular data.

**Key Components**
- `SupplySummaryCards` — 4 KPI cards: harvested, in-transit, in-storage, sold (kg this month)
- `HarvestForecastTable` — upcoming harvests, sortable, with CSV export
- `InventoryLevelChart` — Recharts `AreaChart` stacked by commodity
- `SupplyChainEventLog` — filterable, paginated, with event-type color badges and CSV export

**Todo List**
1. Create `src/pages/supply/SupplyChainDashboard.tsx`
2. Build all 4 key components
3. CSV export using `papaparse.unparse()` + Blob URL download
4. Event type badge colors: HARVESTED=green, TRANSPORTED=blue, STORED=amber, SOLD=purple

**Status** — `[ ] pending`

---

### Sub-Task 10 — Market Analyst Dashboard

**Intent**
Build the Market Analyst's view: live commodity price ticker, historical price charts, regional comparison table, and price change summary cards — all from simulated data.

**Key Components**
- `CommodityPriceTickerBar` — scrolling strip, updates live on `market_update` WebSocket event
- `PriceHistoryChart` — Recharts `LineChart`, commodity selector, 7D/30D/90D tabs
- `RegionalPriceComparisonTable` — commodity × region heat-map (low=green, high=red)
- `PriceChangeSummaryCards` — current price, 1D/7D/30D % change per commodity

**Todo List**
1. Create `src/pages/market/MarketDashboard.tsx`
2. Build all 4 key components
3. Wire `CommodityPriceTickerBar` to `market_update` WebSocket event
4. Price arrow indicator: ↑ green / ↓ red

**Status** — `[ ] pending`

---

### Sub-Task 11 — Alerts Engine (Predefined Thresholds)

**Intent**
Implement a simple Python service with 4 hardcoded alert rules. Evaluates every sensor write; creates `Alert` records with deduplication; broadcasts `alert_new` WebSocket events.

**Predefined Rules (hardcoded constants)**
| Alert Type | Condition | Severity |
|---|---|---|
| LOW_SOIL_MOISTURE | soil_moisture < 20 | WARNING |
| HIGH_TEMPERATURE | temperature > 38 | WARNING |
| FROST_RISK | temperature < 2 | CRITICAL |
| MARKET_PRICE_SPIKE | price change > +8% in one tick | INFO |

**Todo List**
1. Create `backend/alerts_engine.py` — `AlertsEngine` class with `evaluate(field_id, metric_type, value, farm_id, db)` method
2. Hardcode `ALERT_RULES` as a list of dicts (type, metric, threshold, comparator, severity)
3. For each matching rule: query for existing open alert of same type+field; if none, create `Alert` record
4. Call `ws_manager.broadcast_to_farm(farm_id, {"type": "alert_new", "data": alert_dict})`
5. `MARKET_PRICE_SPIKE`: evaluated in `simulator.py` market tick, comparing new price to previous price
6. Deduplication: `SELECT ... WHERE field_id=:fid AND alert_type=:t AND resolved_at IS NULL`

**Status** — `[ ] pending`

---

### Sub-Task 12 — Admin Dashboard

**Intent**
Build the Admin panel: user management (role change, deactivate/reactivate) and system health (DB status, simulator status, record counts).

**Key Components**
- `UserManagementTable` — name, email, role dropdown, active toggle
- `SystemHealthPanel` — DB ping, simulator running, last sensor write, record counts per table

**Todo List**
1. Create `src/pages/admin/AdminDashboard.tsx` — tab nav: Users | System Health
2. Build `UserManagementTable` and `SystemHealthPanel`
3. `GET /admin/health` returns: `{ db: "ok"|"error", simulator_running: bool, last_sensor_write_at: str, record_counts: {...} }`
4. Add `is_active` field to `User` model; inactive users rejected at login with 401
5. Guard all `/admin/*` routes with `require_roles("ADMIN")` dependency

**Status** — `[ ] pending`

---

## Phase 2 — Future Enhancements (Deferred)

| Enhancement | Description |
|---|---|
| Live weather API | Replace mock weather with OpenWeatherMap |
| Live commodity price API | Real market data feed |
| Real IoT / MQTT sensor ingestion | Replace simulator |
| Redis / message broker | Scale ingestion pipeline |
| Configurable alert thresholds | Per-field user-defined rules |
| PDF report generation | Role-scoped seasonal reports |
| PostgreSQL + TimescaleDB | Scale beyond SQLite |
| Mobile PWA | Field-accessible responsive app |

---

## Key Design Decisions

1. **SQLite for Phase 1** — zero-config, file-based, no server process needed. FastAPI + SQLAlchemy work identically with PostgreSQL — migration is a one-line `DATABASE_URL` change in Phase 2.
2. **APScheduler in-process** — runs inside the FastAPI process; no Redis, Celery, or separate worker needed for Phase 1.
3. **Native WebSocket** — FastAPI has first-class WebSocket support; no Socket.io dependency needed.
4. **Recharts over ApexCharts** — pure React component library, no wrapper layer, better TypeScript types.
5. **Predefined alert rules as constants** — four rules hardcoded in `ALERT_RULES` list; easy to make data-driven in Phase 2 without structural changes.
6. **Role-scoped data at the dependency layer** — `get_current_user` injects `farm_id` and `role` into every route; queries apply `WHERE farm_id = :farm_id` automatically. `ADMIN` and `MARKET_ANALYST` bypass this.
