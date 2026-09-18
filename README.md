# Calculator

Full-stack calculator: a React + TypeScript single-page app consuming a Go REST API.

The UI behaves like a handheld calculator — a screen and a keypad — but it performs no
arithmetic of its own: every operation is a request to the backend.

```
calculator-full-stack/
├── backend/            Go service (standard library only)
│   ├── cmd/server/         entry point: configuration and HTTP server
│   └── internal/
│       ├── calculator/     arithmetic domain, pure functions
│       └── httpapi/        routing, validation, error mapping
├── frontend/           React app (Vite + TypeScript)
│   └── src/
│       ├── api/            HTTP client
│       ├── lib/            input parsing
│       └── components/     UI
└── docker-compose.yml  runs both services together
```

## Requirements

| Tool   | Version used |
| ------ | ------------ |
| Go     | 1.27         |
| Node   | 24+          |
| Docker | 29+          |

Docker alone is enough to run the project. Go and Node are only needed for development.

## Run with Docker

```bash
docker compose up --build
```

- App: http://localhost:3000
- API: http://localhost:8080

nginx serves the compiled frontend and proxies `/api` to the backend container, so the
browser only ever talks to one origin.

Stop it with `docker compose down`.

## Run locally

Two processes. Backend first:

```bash
cd backend
go run ./cmd/server
```

Frontend, in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api` to `http://localhost:8080`,
so the setup matches the Docker one and no CORS configuration is needed.

> The local Go server and the backend container both bind port 8080. Run one or the other.

### Environment variables

| Service  | Variable         | Default                 | Purpose                        |
| -------- | ---------------- | ----------------------- | ------------------------------ |
| backend  | `PORT`           | `8080`                  | Listen port                    |
| backend  | `ALLOWED_ORIGIN` | `http://localhost:5173` | Origin allowed by CORS         |

The frontend needs no configuration: it always calls `/api` on its own origin.

## API

Base path `/api/v1`. Requests and responses are JSON.

### `POST /api/v1/calculate/{operation}`

`operation` is one of `add`, `subtract`, `multiply`, `divide`, `power`, `sqrt`,
`percentage`. The body carries the operands; `b` is omitted for the unary `sqrt`.

```bash
curl -X POST http://localhost:8080/api/v1/calculate/add \
  -H 'Content-Type: application/json' \
  -d '{"a": 7, "b": 5}'
```

```json
{ "operation": "add", "a": 7, "b": 5, "result": 12 }
```

```bash
curl -X POST http://localhost:8080/api/v1/calculate/sqrt \
  -H 'Content-Type: application/json' \
  -d '{"a": 81}'
```

```json
{ "operation": "sqrt", "a": 81, "b": 0, "result": 9 }
```

Every failure uses the same envelope, with a stable machine-readable `code`:

```bash
curl -X POST http://localhost:8080/api/v1/calculate/divide \
  -H 'Content-Type: application/json' \
  -d '{"a": 1, "b": 0}'
```

```json
{ "error": { "code": "division_by_zero", "message": "division by zero" } }
```

| Code                    | HTTP | When                                       |
| ----------------------- | ---- | ------------------------------------------ |
| `invalid_json`          | 400  | The body is not valid JSON                 |
| `missing_operand`       | 400  | A required operand is absent               |
| `unsupported_operation` | 404  | Unknown operation in the path              |
| `division_by_zero`      | 422  | The divisor is zero                        |
| `negative_root`         | 422  | Square root of a negative number           |
| `result_not_finite`     | 422  | The result overflows or is NaN             |
| `internal_error`        | 500  | Unexpected failure                         |

### `GET /health`

```json
{ "status": "ok" }
```

## Tests and coverage

Backend:

```bash
cd backend
go test ./... -race
go test ./... -coverprofile=coverage.out -covermode=atomic && go tool cover -func=coverage.out
```

Frontend:

```bash
cd frontend
npm test
npm run test:coverage
```

Coverage at the time of writing — 37 backend cases and 26 frontend cases:

| Backend package        | Statements |
| ---------------------- | ---------- |
| `internal/calculator`  | 100%       |
| `internal/httpapi`     | 94.6%      |
| `cmd/server`           | 0%         |
| **total**              | **82.8%**  |

| Frontend file                   | Statements | Branches |
| ------------------------------- | ---------- | -------- |
| `src/api/calculator.ts`         | 100%       | 100%     |
| `src/lib/validation.ts`         | 100%       | 100%     |
| `src/components/Calculator.tsx` | 79.9%      | 68.7%    |
| **total**                       | **81.8%**  | **71.4%**|

`cmd/server` is wiring only — reading environment variables and starting the server — and
is covered end to end by running the app rather than by unit tests. The uncovered branches
in `Calculator.tsx` are mostly individual keypad handlers that repeat an already tested
path.

## Design decisions

**The domain knows nothing about HTTP.** `internal/calculator` is pure arithmetic: no JSON,
no status codes, no request objects. `internal/httpapi` depends on it and never the other
way round. That is what makes the arithmetic testable without a server and reusable behind
a different transport.

**Standard library instead of a framework.** Go 1.22+ routes with method patterns
(`POST /api/v1/calculate/{operation}`), which covers everything this service needs. The
backend ships with zero third-party dependencies.

**One endpoint parameterised by the operation** rather than one endpoint per operation:
a single request and response contract, and validation in one place.

**Errors carry a stable code.** The UI branches on `division_by_zero`, never on the message
text, so wording can change without breaking clients.

**Operands are pointers in the request struct.** It is the only way to tell "field absent"
from "field sent as 0" — otherwise a missing operand silently becomes a valid zero.

**Non-finite results are rejected.** IEEE-754 does not fail on overflow, it returns ±Inf,
and 0/0 returns NaN. Neither is representable in JSON, so the domain turns them into an
error instead of emitting invalid output.

**Same origin in every environment.** Vite proxies `/api` in development and nginx does it
in Docker, so CORS never sits in the happy path. The CORS middleware remains for clients
calling the API directly.

**The frontend is split by responsibility**: `api/` for transport, `lib/` for parsing,
`components/` for the UI. Tests query by role and accessible name, never by CSS class, so
the interface was redesigned from a plain form into a keypad without touching a single
assertion about behaviour.

**Results are formatted for a fixed screen**: decimals are capped at eight places, operands
at twelve digits, and extreme magnitudes fall back to exponential notation. Without this,
`0.1 + 0.2` would read as `0.30000000000000004` and the layout would resize as digits were
typed.

**Docker uses two images.** The Go binary is static and ends up in a distroless image of
about 10 MB with no shell; the frontend is compiled and served by nginx, which also proxies
the API. The backend has no `healthcheck` precisely because distroless carries no shell or
curl to run one.

## Assumptions

- **Percentage** means "b percent of a": `200 % 15 = 30`, the behaviour of a handheld
  calculator rather than a modulo operation.
- **Square root** is unary and ignores a second operand if one is sent, instead of
  rejecting the request.
- **A result becomes the first operand** of the next operation, so operations can be
  chained: `7 + 5 =` then `x 2 =`.
- **Backspace does not edit a result.** It discards it, and with no operand being typed it
  steps back over the pending operation. Results are not something the user corrects digit
  by digit.
- **Arithmetic uses IEEE-754 doubles** (`float64` in Go, `number` in TypeScript). This is a
  calculator, not a financial system; money would need decimal arithmetic.
