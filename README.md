# Telemetry Backend API

A REST API for ingesting batched smartphone telemetry data and querying time-range summaries. The service is built with **Node.js, Express, PostgreSQL, and Prisma ORM**.

## Features

- Batch ingestion of 1–500 telemetry events per request
- Per-event validation with partial success
- Duplicate protection using `(device_id, timestamp)`
- Time-range summaries per device
- PostgreSQL persistence through Prisma

## Tech Stack

- Node.js (ES modules)
- Express 5
- PostgreSQL
- Prisma 7 with the PostgreSQL driver adapter

## Project Structure

```text
backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── db.js
│   ├── index.js
│   ├── validation.js
│   └── routes/
│       ├── ingest.js
│       └── summary.js
├── .env.example
├── package.json
└── README.md
```

## Prerequisites

- Node.js 18+ recommended
- A running PostgreSQL database
- npm

## Setup

1. Clone the repository and enter the backend directory:

   ```bash
   cd backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create an environment file:

   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your PostgreSQL connection string:

   ```env
   PORT=3000
   DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
   ```

5. Generate the Prisma client:

   ```bash
   npm run prisma:generate
   ```

6. Apply the database schema. For a fresh local development database, run:

   ```bash
   npm run prisma:migrate
   ```

   If the repository already contains the required migrations, use the appropriate Prisma migration deployment workflow for your environment.

## Run the API

### Development

```bash
npm run dev
```

### Standard start

```bash
npm start
```

The API listens on `http://localhost:3000` by default. If you change `PORT`, replace `3000` in the examples below.

## Health Check

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{"ok":true}
```

## API Endpoints

### 1. Ingest telemetry

`POST /api/v1/telemetry/ingest`

Request body:

- `device_id`: non-empty string
- `events`: non-empty array containing at most 500 events

Each event must include `timestamp`, `lat`, `lon`, `speed_kmph`, `accel_x`, `accel_y`, `accel_z`, `gyro_x`, `gyro_y`, and `gyro_z`.

Validation rules include:

- `timestamp` must be a positive integer and no more than 24 hours in the future
- `lat` must be between `-90` and `90`
- `lon` must be between `-180` and `180`
- `speed_kmph` must be between `0` and `300`
- Accelerometer and gyroscope values must be finite numbers

The request is rejected with HTTP 400 when request-level validation fails. Valid events are stored even if other events in the same batch are rejected.

### 2. Query telemetry summary

`GET /api/v1/telemetry/summary?device_id=DVC-1029&from=<epoch_ms>&to=<epoch_ms>`

Both `from` and `to` are inclusive epoch-millisecond bounds.

The response includes:

- Average speed in km/h
- Maximum acceleration magnitude across events, calculated as `sqrt(accel_x² + accel_y² + accel_z²)`
- Number of events in the requested window

If no events match, the endpoint returns HTTP 200 with `event_count: 0` and `null` aggregate values. Missing parameters, invalid epoch values, or `from > to` return HTTP 400.

## Sample cURL Requests

### Ingest a valid batch

```bash
curl -X POST http://localhost:3000/api/v1/telemetry/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "DVC-1029",
    "events": [
      {
        "timestamp": 1730894521123,
        "lat": 12.9716,
        "lon": 77.5946,
        "speed_kmph": 42.5,
        "accel_x": 0.12,
        "accel_y": -0.03,
        "accel_z": 9.81,
        "gyro_x": 0.002,
        "gyro_y": -0.001,
        "gyro_z": 0.0
      },
      {
        "timestamp": 1730894521173,
        "lat": 12.9716,
        "lon": 77.5947,
        "speed_kmph": 42.8,
        "accel_x": 0.14,
        "accel_y": -0.02,
        "accel_z": 9.80,
        "gyro_x": 0.001,
        "gyro_y": -0.001,
        "gyro_z": 0.0
      }
    ]
  }'
```

Example response:

```json
{
  "device_id": "DVC-1029",
  "accepted": 2,
  "rejected": [],
  "duplicates": 0
}
```

### Query the summary

```bash
curl "http://localhost:3000/api/v1/telemetry/summary?device_id=DVC-1029&from=1730894520000&to=1730894580000"
```

Example response:

```json
{
  "device_id": "DVC-1029",
  "from": 1730894520000,
  "to": 1730894580000,
  "avg_speed_kmph": 42.65,
  "max_accel_magnitude": 9.81,
  "event_count": 2
}
```

## Postman Usage

Create two requests in a Postman collection:

1. **Ingest telemetry**
   - Method: `POST`
   - URL: `http://localhost:3000/api/v1/telemetry/ingest`
   - Header: `Content-Type: application/json`
   - Body: `raw` → `JSON`
   - Paste the ingest JSON shown above.

2. **Get summary**
   - Method: `GET`
   - URL: `http://localhost:3000/api/v1/telemetry/summary`
   - Query parameters:
     - `device_id`: `DVC-1029`
     - `from`: `1730894520000`
     - `to`: `1730894580000`

## Design Notes

### Schema and indexes

Telemetry records are stored in the `telemetry_events` PostgreSQL table. The schema contains an auto-incrementing `id`, `device_id`, event `timestamp`, GPS coordinates, speed, accelerometer values, gyroscope values, and a server-side `created_at` timestamp.

A unique composite constraint on `(device_id, timestamp)` prevents the same device from storing two events with the same event timestamp. A composite index on `(device_id, timestamp)` supports the primary query pattern: retrieving events for one device within an inclusive time range.

### Duplicate detection and concurrency

Duplicates within one request are detected using an in-memory timestamp set for the submitted device. Duplicates already stored in PostgreSQL are handled with Prisma `createMany({ skipDuplicates: true })`. The database-level unique constraint is the final protection against duplicate rows when concurrent requests for the same device arrive, because the database—not application memory—enforces uniqueness.

### Production improvement

For production, I would separate ingestion from summary computation using a durable streaming or queueing layer, add authentication and rate limiting, and introduce observability with structured logs, metrics, and tracing. I would also consider time-based partitioning or a time-series database as event volume grows.

## Notes

- Authentication and authorization are not included, as they were not required for the assignment.
- The coding implementation uses PostgreSQL; the larger-scale system-design choice can be evaluated independently.

### Duplicate ingestion handling

Telemetry events are uniquely identified by the combination of `device_id` and `timestamp`.

Duplicate handling works at two levels:

1. **Within the same batch:** Before insertion, the API keeps a `Set` of timestamps already seen for the current `device_id`. If the same timestamp appears more than once in the request, subsequent occurrences are marked as duplicates and their original array indexes are returned.
2. **Across requests:** The database enforces a composite unique constraint on `(device_id, timestamp)`. If a device retries the same event or batch, the event is not inserted a second time.
3. **Concurrent requests:** The database unique constraint is the final source of truth. If two requests attempt to insert the same event concurrently, one insert succeeds and the other is classified as a duplicate after Prisma returns a unique-constraint error (`P2002`).

Duplicate events are reported separately from validation errors. For example:

```json
{
  "device_id": "DVC-1029",
  "accepted": 1,
  "duplicates": {
    "count": 1,
    "indexes": [1]
  },
  "rejected": 0,
  "errors": []
}
```

In this example, the event at index `1` was already present or was repeated within the submitted batch, so it was not stored again.

## Run with Docker

Docker is the easiest way to run the API with PostgreSQL without installing PostgreSQL locally.

### Prerequisites

- Docker Desktop installed and running

### Start the API and database

From the `backend` directory:

```bash
docker compose up --build
```

The API will be available at:

```text
http://localhost:3000
```

The Compose setup automatically:

- Starts PostgreSQL in a persistent Docker volume
- Waits for PostgreSQL to become healthy
- Builds the Node.js API image
- Generates Prisma Client
- Applies committed Prisma migrations
- Starts the API

### Stop the services

```bash
docker compose down
```

To stop the services and remove the database volume:

```bash
docker compose down -v
```

### Test the API

```bash
curl http://localhost:3000/api/v1/telemetry/summary?device_id=DVC-1029
```
