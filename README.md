# Asset Management API

Production-oriented REST API for authenticated users to manage assets (coupons/vouchers): create, claim, release, and audit with concurrency-safe claim/release semantics and full claim history.

## Stack

- NestJS 11, TypeORM 1.1, PostgreSQL 17 (>= 14, uses `gen_random_uuid`)
- TypeScript 6, Node.js 24 LTS
- JWT auth (HS256) + bcrypt password hashing, role-based access (member / admin)
- Zod env validation, helmet, global rate limiting, Terminus health checks
- Swagger OpenAPI documentation, Docker multi-stage builds

## Requirements

- Node.js >= 24 (LTS), PostgreSQL >= 14
- Create the databases (or set `DATABASE_NAME` in `.env`):

```sql
CREATE DATABASE asset_management;
CREATE DATABASE asset_management_test;
```

## Setup

```bash
npm install
cp .env.example .env   # then fill in credentials
```

## Migrations

```bash
npm run migration:run    # applies pending migrations to the DATABASE_NAME database
npm run migration:revert # reverts the last batch
```

The app never auto-syncs the schema (`synchronize: false`); the schema is applied via migrations.

## Run

```bash
npm run start:dev   # watch mode (http://localhost:4000)
npm run build       # compile
npm run start:prod  # run compiled dist
```

## Docker

A multi-stage `Dockerfile` and a `docker-compose.yml` are provided. Compose runs the app together with a PostgreSQL 17 container (DB data persisted in a named volume); the app's migrations run automatically on startup.

```bash
# one command: builds the image, starts Postgres + app
docker compose up -d --build

# verify
curl http://localhost:4000/api/v1/health

# stop
docker compose down
```

Or build and run the image manually. To run against the local database from `.env`, use Docker Desktop's host alias - inside a container `localhost` refers to the container itself, not your machine:

```bash
docker build -t asset-management .
docker run -p 4001:4000 --env-file .env -e DATABASE_HOST=host.docker.internal asset-management
```

> `DATABASE_PORT`/`DATABASE_PASSWORD` come from `.env`; map to a free host port (e.g. `4001`) if `4000` is already in use.

## Tests

```bash
npm run test        # unit tests (18)
npm run test:e2e    # e2e, incl. concurrency race tests (15), uses asset_management_test
npm run lint        # eslint + prettier
```

## API

All routes under `/api/v1`. Everything except `POST /auth/register`, `POST /auth/login`, and `GET /health` requires `Authorization: Bearer <token>`.

> **Swagger UI**: When running locally, interactive API documentation is available at `http://localhost:4000/docs`.

> **Roles**: Everyone registers as `member`. To become `admin` (for `POST/PATCH /assets`), call `PATCH /auth/role` with the shared `ROLE_CHANGE_SECRET` from `.env` - it returns a fresh token carrying the new role.

### Authentication

| Method | Path             | Auth   | Description                     |
| ------ | ---------------- | ------ | ------------------------------- |
| POST   | `/auth/register` | public | Create account, returns profile |
| POST   | `/auth/login`    | public | Returns `{ accessToken }`       |
| GET    | `/auth/me`       | JWT    | Current user profile            |
| PATCH  | `/auth/role`     | JWT    | Change own role via `ROLE_CHANGE_SECRET`, returns a fresh token |

### Assets

| Method | Path                  | Auth  | Description                                       |
| ------ | --------------------- | ----- | ------------------------------------------------- |
| GET    | `/assets/pool`        | JWT   | Pool summary (`total/available/claimed/expired`)   |
| GET    | `/assets`             | JWT   | List assets (filter by `status`, paginated)        |
| GET    | `/assets/:id`         | JWT   | Single asset detail                                |
| POST   | `/assets`             | admin | Bulk-create assets by code (`{ "codes": [] }`)     |
| PATCH  | `/assets/:id`         | admin | Update `expiresAt` (optimistic lock via `version`) |
| POST   | `/assets/:id/claim`   | JWT   | Claim a specific asset (409 if taken)              |
| POST   | `/assets/claim-any`   | JWT   | Claim any available asset                          |
| POST   | `/assets/:id/release` | JWT   | Release an asset claimed by you (403 otherwise)    |

### User History

| Method | Path          | Auth | Description                                        |
| ------ | ------------- | ---- | -------------------------------------------------- |
| GET    | `/me/history` | JWT  | Your claim/release history (joined user/asset data) |
| GET    | `/me/assets`  | JWT  | Assets you currently hold                           |

### Infrastructure

| Method | Path      | Auth   | Description              |
| ------ | --------- | ------ | ------------------------ |
| GET    | `/health` | public | DB liveness via Terminus |

## Concurrency Model

The system handles race conditions at the database level - no application-level locks, no Redis.

- **Claim a specific asset**: single atomic `UPDATE ... WHERE status = 'available' RETURNING` inside a transaction. Only one concurrent caller can transition the row; the rest see 0 affected rows and get `409 Conflict`.
- **Claim any available**: `SELECT ... FOR UPDATE SKIP LOCKED` picks a free row without blocking concurrent requests, then the same atomic update applies. Each concurrent call grabs a different row.
- **Release**: atomic `UPDATE ... WHERE status = 'claimed' AND claimed_by = $userId`. Only the claimant can release.
- **Admin update**: optimistic locking - `PATCH` requires the current `version`; a stale `version` yields `409`.
- **Unique `code`** on assets prevents duplicates (mapped to `409`).

Every claim/release is recorded in the `claims` ledger table for full audit history.

## Project Layout

```
src/
  common/       guards, exception filter, interceptors, DTOs, types
  config/       env validation (Zod)
  database/     DataSource + migrations
  modules/      auth, users, assets, claims, health
test/           e2e specs + shared test app helper
```
