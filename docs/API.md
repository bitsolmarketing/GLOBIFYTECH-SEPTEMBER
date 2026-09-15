# Globify Tech — API

Two entry points share the same service layer:

1. **Server Actions** (`src/server/actions/*`) — used by the web app. Input validated with Zod, authorized with `requirePermission`, audited.
2. **REST API** (`/api/v1/*`) — used by mobile apps and integrations. Same services, JSON envelopes, bearer tokens.

## Envelope

```json
{ "data": { }, "meta": { "nextCursor": "…" } }
{ "error": { "code": "FORBIDDEN", "message": "You do not have permission to publish courses." } }
```

Error codes: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION`, `RATE_LIMITED`, `CONFLICT`, `INTERNAL`.

## Authentication

- Web: session cookie (Auth.js).
- Mobile: `POST /api/v1/auth/token` with email + password returns a session JWT; send as `Authorization: Bearer <token>`. Refresh via `POST /api/v1/auth/refresh`. Tokens are invalidated by bumping `sessionVersion` (sign-out everywhere).

## Pagination

Cursor-based: `?cursor=<id>&limit=20`. Responses include `meta.nextCursor`.

## Resources (v1)

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/api/v1/me` | authenticated | profile, roles, permissions |
| GET | `/api/v1/courses` | public | published only; filters `category, level, mode, q` |
| GET | `/api/v1/courses/:slug` | public | full curriculum outline, preview lessons |
| GET | `/api/v1/student/dashboard` | `student.self` | cockpit payload |
| GET | `/api/v1/student/courses` | `student.self` | enrollments with progress |
| GET | `/api/v1/student/courses/:id/lessons/:lessonId` | enrolled | lesson content + signed video URL |
| POST | `/api/v1/student/lessons/:lessonId/progress` | enrolled | `{ positionSeconds, completed }` |
| POST | `/api/v1/student/quizzes/:quizId/attempts` | enrolled | start attempt |
| PUT | `/api/v1/student/quiz-attempts/:id` | owner | submit answers |
| POST | `/api/v1/student/assignments/:id/submissions` | enrolled | create submission |
| GET | `/api/v1/student/certificates` | owner | |
| GET | `/api/v1/student/notifications` | owner | |
| POST | `/api/v1/ai/tutor` | enrolled | streaming chat, context = lesson |
| GET | `/api/v1/instructor/batches` | `batches.read` (own) | |
| POST | `/api/v1/instructor/attendance` | `attendance.mark` (own batch) | bulk mark |
| GET | `/api/v1/instructor/submissions` | `submissions.read` (own) | |
| POST | `/api/v1/instructor/submissions/:id/grade` | `submissions.grade` | rubric scores |
| POST | `/api/v1/leads` | public (rate-limited) | website lead capture |
| POST | `/api/v1/applications` | authenticated | submit application |
| GET | `/api/v1/verify/:code` | public | certificate verification |
| POST | `/api/v1/uploads/presign` | authenticated | returns presigned PUT URL |
| GET | `/api/v1/search?q=` | authenticated | scoped global search |
| GET | `/api/health` | public | liveness |

## Webhooks (inbound)

| Path | Provider | Verification |
|---|---|---|
| `/api/webhooks/stripe` | Stripe | signature header |
| `/api/webhooks/paypal` | PayPal | transmission signature |
| `/api/webhooks/jazzcash` | JazzCash | secure hash |
| `/api/webhooks/easypaisa` | Easypaisa | hash |
| `/api/webhooks/whatsapp` | Meta Cloud API | `X-Hub-Signature-256` + verify token |
| `/api/webhooks/zoom` | Zoom | secret token |

All webhooks are idempotent via `WebhookEvent(provider, providerEventId)`.

## Versioning

Breaking changes create `/api/v2`. `v1` is supported for 12 months after `v2` ships.
